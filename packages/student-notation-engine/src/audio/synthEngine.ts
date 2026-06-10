/**
 * Synth Engine
 *
 * Framework-agnostic polyphonic synthesizer manager using Tone.js.
 * This is the engine package version with no DOM or window dependencies.
 *
 * Key design decisions:
 * - All dependencies are injected via config
 * - No window globals
 * - No store subscriptions (caller handles events)
 * - Optional effects manager and harmonic filter
 */

import * as Tone from 'tone';
import { FilteredVoice } from './FilteredVoice.js';
import { GainManager, getPerVoiceBaselineGain } from './GainManager.js';
import { ClippingMonitor } from './ClippingMonitor.js';
import type {
  SynthEngineInstance,
  SynthEngineConfig,
  InternalTimbreState,
  SynthLogger
} from './types.js';

const HARD_STOP_FADE_SECONDS = 0.03;
const MODULATION_RAMP_SECONDS = 0.035;
const TREMOLO_GAIN_DELTA_SCALE = 0.5;

/**
 * Create a new synth engine instance
 */
export function createSynthEngine(config: SynthEngineConfig): SynthEngineInstance {
  const {
    timbres,
    masterVolume = 0,
    effectsManager,
    harmonicFilter,
    logger,
    audioInit,
    getDrumVolume,
    getPreviewColor
  } = config;

  // Internal state
  const synths: Record<string, Tone.PolySynth> = {};
  const effectsTracked: Record<string, WeakSet<object>> = {};
  let masterGain: Tone.Gain | null = null;
  let volumeControl: Tone.Volume | null = null;
  let compressor: Tone.Compressor | null = null;
  let limiter: Tone.Limiter | null = null;
  let clippingMeter: Tone.Meter | null = null;
  let waveformAnalyzers: Record<string, Tone.Analyser> = {};
  let gainManager: GainManager | null = null;
  let clippingMonitor: ClippingMonitor | null = null;
  let outputHardMuted = false;
  let outputMuteTimerId: ReturnType<typeof setTimeout> | null = null;

  // Copy of timbres for internal mutation
  const internalTimbres: Record<string, InternalTimbreState> = { ...timbres };

  // Audio diagnostics (gated behind window.__audioDiag)
  let diagIntervalId: ReturnType<typeof setInterval> | null = null;
  const isDiag = (): boolean => typeof window !== 'undefined' && (window as any).__audioDiag === true;

  // [PERF:SHARED-LFO] Shared per-color LFOs for vibrato and tremolo.
  // One LFO per color modulates ALL voices of that color, saving ~40 native nodes per voice.
  // Vibrato: LFO → voice.detuneInput (GainNode → oscillator.detune, cents-based)
  // Tremolo: LFO → voice.tremoloInput (AudioParam on tremolo GainNode)
  const sharedVibratoLFOs: Record<string, Tone.LFO | null> = {};
  const sharedTremoloLFOs: Record<string, Tone.LFO | null> = {};

  // Voice count supplier — reads true count from Tone.js PolySynth instances
  function getTotalActiveVoices(): number {
    let total = 0;
    for (const c in synths) {
      total += (synths[c] as any)?.activeVoices ?? 0;
    }
    return total;
  }

  function cancelPendingOutputMute(): void {
    if (outputMuteTimerId === null) {
      return;
    }
    clearTimeout(outputMuteTimerId);
    outputMuteTimerId = null;
  }

  function ensureOutputAudible(): void {
    if (!outputHardMuted && volumeControl?.mute !== true) {
      return;
    }

    cancelPendingOutputMute();

    if (volumeControl) {
      volumeControl.mute = false;
    }
    if (masterGain) {
      const now = Tone.now();
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(getPerVoiceBaselineGain(), now);
    }
    gainManager?.start();
    outputHardMuted = false;
  }

  // [PERF:SHARED-LFO] Get all voices from a PolySynth (active + pool)
  function getAllVoicesFromSynth(synth: any): any[] {
    const voices: any[] = [];
    const seen = new Set();

    const activeVoices: any[] | undefined = synth?._activeVoices;
    if (activeVoices) {
      activeVoices.forEach((entry: any) => {
        const voice = entry?.voice ?? entry;
        if (voice && !seen.has(voice)) {
          seen.add(voice);
          voices.push(voice);
        }
      });
    }

    const poolVoices: any[] | undefined = synth?._voices;
    if (poolVoices) {
      poolVoices.forEach((voice: any) => {
        if (voice && !seen.has(voice)) {
          seen.add(voice);
          voices.push(voice);
        }
      });
    }

    return voices;
  }

  // [PERF:SHARED-LFO] Update or create/destroy shared vibrato LFO for a color.
  // Vibrato modulates oscillator.detune in cents — frequency-proportional, more musically
  // correct than the old per-voice Hz-based approach.
  function updateSharedVibrato(color: string, params: { speed: number; span: number }): void {
    const isActive = params.speed > 0 && params.span > 0;

    if (isActive) {
      const freqHz = (params.speed / 100) * 16;       // 0-100% → 0-16 Hz
      const depthCents = (params.span / 100) * 50;     // 0-100% → 0-50 cents

      if (!sharedVibratoLFOs[color]) {
        const lfo = new Tone.LFO({ frequency: freqHz, min: -depthCents, max: depthCents, type: 'sine' });
        lfo.start();
        sharedVibratoLFOs[color] = lfo;

        // Connect to all existing voices of this color (idempotent in Web Audio)
        const synth = synths[color];
        if (synth) {
          getAllVoicesFromSynth(synth).forEach(voice => {
            try { lfo.connect(voice.detuneInput); } catch { /* voice may be disposed */ }
          });
        }
        log.debug('SynthEngine', `[PERF:SHARED-LFO] Created shared vibrato LFO for ${color}`, { freqHz, depthCents }, 'audio');
      } else {
        // Update existing LFO parameters
        const lfo = sharedVibratoLFOs[color]!;
        lfo.frequency.rampTo(freqHz, MODULATION_RAMP_SECONDS);
        lfo.min = -depthCents;
        lfo.max = depthCents;
      }
    } else {
      // Disable: dispose shared vibrato LFO
      if (sharedVibratoLFOs[color]) {
        sharedVibratoLFOs[color]!.stop();
        sharedVibratoLFOs[color]!.dispose();
        sharedVibratoLFOs[color] = null;
        log.debug('SynthEngine', `[PERF:SHARED-LFO] Disposed shared vibrato LFO for ${color}`, null, 'audio');
      }
    }
  }

  function getTremoloGainDelta(span: number): number {
    const normalizedSpan = Math.min(1, Math.max(0, span / 100));
    return normalizedSpan * TREMOLO_GAIN_DELTA_SCALE;
  }

  // [PERF:SHARED-LFO] Update or create/destroy shared tremolo LFO for a color.
  // The LFO is centered on 0 and added to tremoloGain.gain (intrinsic=1),
  // so tremolo oscillates around normal level instead of only reducing gain.
  function updateSharedTremolo(color: string, params: { speed: number; span: number }): void {
    const isActive = params.speed > 0 && params.span > 0;

    if (isActive) {
      const freqHz = (params.speed / 100) * 16;       // 0-100% → 0-16 Hz
      const gainDelta = getTremoloGainDelta(params.span); // 0-100% -> +/-0.5 gain

      if (!sharedTremoloLFOs[color]) {
        const lfo = new Tone.LFO({ frequency: freqHz, min: -gainDelta, max: gainDelta, type: 'sine' });
        lfo.start();
        sharedTremoloLFOs[color] = lfo;

        // Connect to all existing voices of this color
        const synth = synths[color];
        if (synth) {
          getAllVoicesFromSynth(synth).forEach(voice => {
            try { lfo.connect(voice.tremoloInput); } catch { /* voice may be disposed */ }
          });
        }
        log.debug('SynthEngine', `[PERF:SHARED-LFO] Created shared tremolo LFO for ${color}`, { freqHz, gainDelta }, 'audio');
      } else {
        // Update existing LFO parameters
        const lfo = sharedTremoloLFOs[color]!;
        lfo.frequency.rampTo(freqHz, MODULATION_RAMP_SECONDS);
        lfo.min = -gainDelta;
        lfo.max = gainDelta;
      }
    } else {
      // Disable: dispose shared tremolo LFO, reset voice gains to pass-through
      if (sharedTremoloLFOs[color]) {
        sharedTremoloLFOs[color]!.stop();
        sharedTremoloLFOs[color]!.dispose();
        sharedTremoloLFOs[color] = null;

        // Reset tremoloGain on all voices to 1.0 (pass-through)
        const synth = synths[color];
        if (synth) {
          getAllVoicesFromSynth(synth).forEach(voice => {
            try { voice._resetTremoloGain?.(); } catch { /* voice may be disposed */ }
          });
        }
        log.debug('SynthEngine', `[PERF:SHARED-LFO] Disposed shared tremolo LFO for ${color}`, null, 'audio');
      }
    }
  }

  // [PERF:SHARED-LFO] Connect shared LFOs to a newly created voice
  function connectSharedLFOsToVoice(voice: any, color: string): void {
    try {
      const vibratoLFO = sharedVibratoLFOs[color];
      if (vibratoLFO) {
        vibratoLFO.connect(voice.detuneInput);
      }

      const tremoloLFO = sharedTremoloLFOs[color];
      if (tremoloLFO) {
        tremoloLFO.connect(voice.tremoloInput);
      }
    } catch (e) {
      log.warn('SynthEngine', `[PERF:SHARED-LFO] Failed to connect shared LFOs to voice for ${color}`, e, 'audio');
    }
  }

  // Logger helper
  const log: SynthLogger = logger ?? {
    debug: () => {},
    info: () => {},
    warn: () => {}
  };

  /**
   * Get coefficients for a color, using harmonic filter if provided
   */
  function getCoefficients(color: string): Float32Array {
    if (harmonicFilter) {
      return harmonicFilter.getFilteredCoefficients(color);
    }
    // Fallback to raw coefficients from timbre
    const timbre = internalTimbres[color];
    if (timbre?.coeffs) {
      return timbre.coeffs;
    }
    // Default to sine wave
    return new Float32Array([0, 1]);
  }

  /**
   * Normalize coefficients if total amplitude exceeds 1.0
   */
  function normalizeCoefficients(coeffs: Float32Array): number[] {
    const totalAmplitude = coeffs.reduce((sum, coeff) => sum + Math.abs(coeff), 0);
    if (totalAmplitude > 1.0) {
      return Array.from(coeffs).map(coeff => coeff / totalAmplitude);
    }
    return Array.from(coeffs);
  }

  const instance: SynthEngineInstance = {
    init() {
      // Stop any existing monitors
      this.stopBackgroundMonitors();

      // === Build Master Audio Chain ===
      // Signal flow: synths → masterGain → volumeControl → compressor → limiter → destination

      // 1. Master gain node (polyphony-aware scaling with smoothing)
      masterGain = new Tone.Gain(getPerVoiceBaselineGain());
      gainManager = new GainManager(masterGain, {}, getTotalActiveVoices);
      gainManager.start();

      // 2. User volume control (independent of automatic gain scaling)
      volumeControl = new Tone.Volume(masterVolume);
      volumeControl.mute = false;
      outputHardMuted = false;

      // 3. Bus compressor (gentle glue, transparent action)
      compressor = new Tone.Compressor({
        threshold: -12,
        ratio: 3,
        attack: 0.01,
        release: 0.1,
        knee: 6
      });

      // 4. True-peak limiter (safety net, should rarely engage)
      limiter = new Tone.Limiter(-3.0);

      // 5. Clipping detection meter
      clippingMeter = new Tone.Meter();

      // Connect chain: masterGain → volumeControl → compressor → limiter → destination → meter
      masterGain.connect(volumeControl);
      volumeControl.connect(compressor);
      compressor.connect(limiter);
      limiter.toDestination();
      limiter.connect(clippingMeter);

      // Start monitoring for clipping
      if (clippingMeter) {
        clippingMonitor = new ClippingMonitor(clippingMeter, {
          onWarning: (levelDb) => {
            log.warn('SynthEngine', 'Limiter input approaching clipping threshold', { level: levelDb }, 'audio');
          }
        });
        clippingMonitor.start();
      }

      // Create synths for each timbre
      for (const color in internalTimbres) {
        const timbre = internalTimbres[color];
        if (!timbre) continue;

        // Initialize defaults if not present
        if (!timbre.vibrato) {
          timbre.vibrato = { speed: 0, span: 0 };
        }
        if (!timbre.tremelo) {
          timbre.tremelo = { speed: 0, span: 0 };
        }

        const filteredCoeffs = getCoefficients(color);
        const normalizedCoeffs = normalizeCoefficients(filteredCoeffs);
        const presetGain = timbre.gain || 1.0;

        const synth = new Tone.PolySynth(FilteredVoice as any, {
          oscillator: { type: 'custom', partials: normalizedCoeffs },
          envelope: timbre.adsr,
          filter: timbre.filter,
          vibrato: timbre.vibrato,
          tremelo: timbre.tremelo,
          gain: presetGain
        } as any).connect(masterGain) as any;

        synth.maxPolyphony = Infinity;

        // Suppress Tone.js PolySynth debug logging (triggerAttack/triggerRelease)
        synth.debug = false;

        // Apply synth-level effects if effects manager is available
        if (effectsManager && masterGain) {
          effectsManager.applySynthEffects(synth, color, masterGain);
        }

        // Hook into voice creation to apply vibrato/tremolo to new voices
        effectsTracked[color] = new WeakSet();
        const originalTriggerAttack = synth.triggerAttack.bind(synth);
        synth.triggerAttack = function(...args: any[]) {
          const result = originalTriggerAttack(...args);

          // Apply current settings to newly created voices
          // Use Tone.Draw.schedule to sync with the audio timeline
          // Schedule slightly after the attack time to ensure voice exists
          const triggerTime = args[1] ?? Tone.now();
          const effectApplicationTime = triggerTime + 0.005; // 5ms after attack in audio time
          const tracked = effectsTracked[color];

          Tone.Draw.schedule(() => {
            // Tone.js v15: _activeVoices is Array<{midi, voice, released}>, use .length not .size
            const activeVoices: any[] | undefined = this._activeVoices;

            // [PERF:SHARED-LFO] Connect shared LFOs and apply effects to newly created voices.
            // Vibrato/tremolo are handled by shared per-color LFOs (not per-voice).
            // effectsManager.applyEffectsToVoice still runs for other effects (delay, etc.).
            const applyToNewVoice = (voice: any) => {
              if (!voice || tracked.has(voice)) return;
              connectSharedLFOsToVoice(voice, color);
              if (effectsManager) {
                effectsManager.applyEffectsToVoice(voice, color);
              }
              tracked.add(voice);
            };

            if (activeVoices && activeVoices.length > 0) {
              activeVoices.forEach((entry: any) => applyToNewVoice(entry?.voice ?? entry));
            } else if (this._voices && Array.isArray(this._voices)) {
              this._voices.forEach((voice: any) => applyToNewVoice(voice));
            }
          }, effectApplicationTime);

          return result;
        };

        // Store current settings on synth for future reference
        synth._currentVibrato = timbre.vibrato;
        synth._currentTremolo = timbre.tremelo;
        synth._currentFilter = timbre.filter;

        synths[color] = synth;

        // [PERF:SHARED-LFO] Initialize shared vibrato/tremolo LFOs with current settings
        updateSharedVibrato(color, timbre.vibrato!);
        updateSharedTremolo(color, timbre.tremelo!);

        log.debug('SynthEngine', `Created filtered synth for color: ${color}`, null, 'audio');
      }

      // AudioContext state change listener (always active — fires on crash)
      try {
        const rawCtx = (Tone.context as any).rawContext as AudioContext | undefined;
        rawCtx?.addEventListener?.('statechange', () => {
          console.warn('[AudioDiag] AudioContext state →', rawCtx.state);
        });
      } catch { /* ignore if rawContext unavailable */ }

      // Periodic audio health monitor (gated behind window.__audioDiag)
      if (diagIntervalId) { clearInterval(diagIntervalId); diagIntervalId = null; }
      diagIntervalId = setInterval(() => {
        if (!isDiag()) return;
        let actualTotal = 0;
        const perColor: string[] = [];
        for (const c in synths) {
          const sz = (synths[c] as any)?.activeVoices ?? 0;
          actualTotal += sz;
          perColor.push(`${c.slice(1, 4)}:${sz}`);
        }
        const gmCount = gainManager?.getActiveVoiceCount() ?? -1;
        const gainVal = masterGain?.gain.value?.toFixed(4) ?? '?';
        const ctxState = Tone.context?.state ?? '?';
        let meterDb = '?';
        try {
          const lvl = clippingMeter?.getValue();
          const v = Array.isArray(lvl) ? lvl[0] : lvl;
          if (v !== undefined) meterDb = (v as number).toFixed(1);
        } catch { /* meter may be disposed */ }
        const drift = gmCount - actualTotal;
        console.log(
          `[AudioDiag] HEALTH | voices: GM=${gmCount} actual=${actualTotal} (${perColor.join(' ')})` +
          ` | gain: ${gainVal} | ctx: ${ctxState} | meter: ${meterDb}dB` +
          (Math.abs(drift) > 5 ? ` | ⚠ DRIFT=${drift}` : '')
        );
      }, 2000);

      log.info('SynthEngine', 'Initialized with multi-timbral support', null, 'audio');
    },

    updateSynthForColor(color: string) {
      const timbre = internalTimbres[color];
      const synth = synths[color];
      if (!synth || !timbre) return;

      // Initialize vibrato if it doesn't exist
      if (!timbre.vibrato) {
        timbre.vibrato = { speed: 0, span: 0 };
      }

      // Initialize tremolo if it doesn't exist
      if (!timbre.tremelo) {
        timbre.tremelo = { speed: 0, span: 0 };
      }

      log.debug('SynthEngine', `Updating timbre for color ${color}`, null, 'audio');

      const filteredCoeffs = getCoefficients(color);
      const normalizedCoeffs = normalizeCoefficients(filteredCoeffs);

      synth.set({
        oscillator: { partials: normalizedCoeffs },
        envelope: timbre.adsr
      });

      // Re-apply synth-level effects when timbre changes
      if (effectsManager && masterGain) {
        effectsManager.applySynthEffects(synth, color, masterGain);
      }

      // [PERF:SHARED-LFO] Update shared vibrato/tremolo LFOs for this color.
      // This replaces per-voice _setVibrato/_setTremolo calls — one LFO modulates all voices.
      updateSharedVibrato(color, timbre.vibrato!);
      updateSharedTremolo(color, timbre.tremelo!);

      // Update filter and preset gain on existing voices (still per-voice)
      const allVoices = getAllVoicesFromSynth(synth);
      allVoices.forEach((voice: any) => {
        if (voice?._setFilter) {
          voice._setFilter(timbre.filter);
        }
        if (voice?._setPresetGain) {
          const presetGain = timbre.gain || 1.0;
          voice._setPresetGain(presetGain);
        }
      });
    },

    updateModulationForColor(color: string) {
      const timbre = internalTimbres[color];
      const synth = synths[color];
      if (!synth || !timbre) return;

      if (!timbre.vibrato) {
        timbre.vibrato = { speed: 0, span: 0 };
      }
      if (!timbre.tremelo) {
        timbre.tremelo = { speed: 0, span: 0 };
      }

      updateSharedVibrato(color, timbre.vibrato);
      updateSharedTremolo(color, timbre.tremelo);
    },

    setBpm(tempo: number) {
      try {
        if (Tone?.Transport?.bpm) {
          Tone.Transport.bpm.value = tempo;
          log.debug('SynthEngine', `Tone.Transport BPM updated to ${tempo}`, null, 'audio');
        }
      } catch (error) {
        log.warn('SynthEngine', 'Unable to update BPM on Tone.Transport', { tempo, error }, 'audio');
      }
    },

    setVolume(dB: number) {
      if (volumeControl) {
        volumeControl.volume.value = dB;
      }
    },

    async playNote(pitch: string | number, duration: number | string, time = Tone.now(), color?: string) {
      // Use provided audio init or default to Tone.start()
      const init = audioInit || (() => Tone.start());
      await init();

      const resolvedColor = color ?? getPreviewColor?.() ?? null;
      if (!resolvedColor) {
        log.warn('SynthEngine', 'playNote skipped: no preview color resolved', null, 'audio');
        return;
      }

      const synth = synths[resolvedColor];
      if (synth) {
        ensureOutputAudible();
        synth.triggerAttackRelease(pitch, duration, time);
      } else {
        log.warn('SynthEngine', `playNote skipped: no synth found for color ${resolvedColor}`, null, 'audio');
      }
    },

    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(pitch: string | number, color: string, time = Tone.now(), isDrum = false) {
      const synth = synths[color];
      if (!synth) return;
      ensureOutputAudible();

      if (isDiag()) {
        const gm = gainManager?.getActiveVoiceCount() ?? -1;
        const actual = getTotalActiveVoices();
        console.log(`[AudioDiag] ATTACK | color=${color} pitch=${pitch} | GM=${gm} actual=${actual} | ctx=${Tone.context?.state}`);
      }

      if (isDrum && getDrumVolume) {
        // Apply drum volume by temporarily adjusting synth volume
        const drumVolume = getDrumVolume();
        const originalVolume = synth.volume.value;
        const drumVolumeDB = originalVolume + 20 * Math.log10(drumVolume);
        synth.volume.value = drumVolumeDB;

        synth.triggerAttack(pitch, time);

        // Reset volume 100ms after the drum hit using audio-synchronized scheduling
        // Tone.Draw.schedule syncs with the audio context for precise timing
        Tone.Draw.schedule(() => {
          if (synth?.volume) {
            synth.volume.value = originalVolume;
          }
        }, time + 0.1);
      } else {
        synth.triggerAttack(pitch, time);
      }
    },

    /**
     * Trigger note attack for interactive (user-initiated) events.
     * Adds a small scheduling offset (20ms) to help the audio thread process
     * the event without pops or clicks.
     *
     * Use this for mouse clicks, keyboard presses, or other immediate UI triggers.
     */
    triggerAttackInteractive(pitch: string | number, color: string) {
      // Resume context if suspended (e.g., after audio overload)
      if (Tone.context.state !== 'running') {
        void Tone.context.resume();
      }
      // Small offset helps avoid performance-related audio pops
      // 20ms is imperceptible but gives the audio thread breathing room
      instance.triggerAttack(pitch, color, Tone.now() + 0.02);
    },

    quickReleasePitches(pitches: Array<string | number>, color: string) {
      const synth = synths[color];
      if (!synth || !pitches || pitches.length === 0) return;

      let originalRelease: number | undefined;
      try {
        const currentConfig = typeof synth.get === 'function' ? synth.get() : null;
        // Tone.js Time can be string or number - we only need number here
        const release = currentConfig?.envelope?.release;
        originalRelease = typeof release === 'number' ? release : undefined;

        // Use a tiny but non-zero release to avoid audible clicks
        synth.set({ envelope: { release: 0.01 } });

        pitches.forEach(pitch => {
          synth.triggerRelease(pitch, Tone.now());
        });
      } catch (err) {
        log.warn('SynthEngine', 'quickReleasePitches failed', { err, color, pitches }, 'audio');
      } finally {
        if (originalRelease !== undefined) {
          try {
            synth.set({ envelope: { release: originalRelease } });
          } catch {
            // Ignore restore errors
          }
        }
      }
    },

    triggerRelease(pitch: string | number, color: string, time = Tone.now()) {
      const synth = synths[color];
      if (!synth) return;

      synth.triggerRelease(pitch, time);

      if (isDiag()) {
        const gm = gainManager?.getActiveVoiceCount() ?? -1;
        const actual = getTotalActiveVoices();
        const drift = gm - actual;
        console.log(`[AudioDiag] RELEASE | color=${color} pitch=${pitch} | GM=${gm} actual=${actual}` +
          (Math.abs(drift) > 5 ? ` | ⚠ DRIFT=${drift}` : ''));
      }
    },

    releaseAll() {
      for (const color in synths) {
        synths[color]?.releaseAll();
      }
      gainManager?.resetActiveVoiceCount();
    },

    flushPlaybackTails(colors?: string[]) {
      effectsManager?.flushPlaybackTails?.(colors);
    },

    hardStopAllSound() {
      this.releaseAll();
      effectsManager?.flushPlaybackTails?.();

      cancelPendingOutputMute();
      outputHardMuted = true;
      gainManager?.stop();

      if (masterGain) {
        const now = Tone.now();
        const currentGain = Math.max(masterGain.gain.value ?? getPerVoiceBaselineGain(), 0);
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(currentGain, now);
        masterGain.gain.linearRampToValueAtTime(0, now + HARD_STOP_FADE_SECONDS);
      }

      if (volumeControl) {
        outputMuteTimerId = setTimeout(() => {
          outputMuteTimerId = null;
          if (outputHardMuted && volumeControl) {
            volumeControl.mute = true;
          }
        }, (HARD_STOP_FADE_SECONDS * 1000) + 10);
      }
    },

    // === Waveform Visualization ===

    createWaveformAnalyzer(color: string): Tone.Analyser | null {
      const synth = synths[color];
      if (!synth) {
        log.warn('SynthEngine', `No synth found for color: ${color}`, null, 'audio');
        return null;
      }

      if (!waveformAnalyzers[color]) {
        waveformAnalyzers[color] = new Tone.Analyser('waveform', 1024);
        synth.connect(waveformAnalyzers[color]);
        log.debug('SynthEngine', `Created waveform analyzer for color: ${color}`, null, 'waveform');
      }

      return waveformAnalyzers[color];
    },

    getWaveformAnalyzer(color: string): Tone.Analyser | null {
      return waveformAnalyzers[color] || null;
    },

    getAllWaveformAnalyzers(): Map<string, Tone.Analyser> {
      const activeAnalyzers = new Map<string, Tone.Analyser>();
      for (const color in waveformAnalyzers) {
        if (waveformAnalyzers[color]) {
          activeAnalyzers.set(color, waveformAnalyzers[color]);
        }
      }
      return activeAnalyzers;
    },

    removeWaveformAnalyzer(color: string) {
      if (waveformAnalyzers[color]) {
        waveformAnalyzers[color].dispose();
        delete waveformAnalyzers[color];
        log.debug('SynthEngine', `Removed waveform analyzer for color: ${color}`, null, 'waveform');
      }
    },

    disposeAllWaveformAnalyzers() {
      for (const color in waveformAnalyzers) {
        if (waveformAnalyzers[color]) {
          waveformAnalyzers[color].dispose();
        }
      }
      waveformAnalyzers = {};
      log.debug('SynthEngine', 'Disposed all waveform analyzers', null, 'waveform');
    },

    // === Node Access ===

    getSynth(color: string): unknown | null {
      return synths[color] || null;
    },

    getAllSynths(): Record<string, unknown> {
      return { ...synths };
    },

    getMainVolumeNode(): Tone.Volume | null {
      return volumeControl || null;
    },

    getMasterGainNode(): Tone.Gain | null {
      return masterGain || null;
    },

    // === Cleanup ===

    stopBackgroundMonitors() {
      cancelPendingOutputMute();
      clippingMonitor?.stop();
      gainManager?.stop();
      if (diagIntervalId) { clearInterval(diagIntervalId); diagIntervalId = null; }
    },

    dispose() {
      this.stopBackgroundMonitors();
      this.disposeAllWaveformAnalyzers();

      // [PERF:SHARED-LFO] Dispose shared LFOs before synths (LFOs reference voice nodes)
      for (const color in sharedVibratoLFOs) {
        sharedVibratoLFOs[color]?.dispose();
        sharedVibratoLFOs[color] = null;
      }
      for (const color in sharedTremoloLFOs) {
        sharedTremoloLFOs[color]?.dispose();
        sharedTremoloLFOs[color] = null;
      }

      // Dispose synths
      for (const color in synths) {
        synths[color]?.dispose();
      }

      // Dispose audio chain
      masterGain?.dispose();
      volumeControl?.dispose();
      compressor?.dispose();
      limiter?.dispose();
      clippingMeter?.dispose();
      outputHardMuted = false;

      log.debug('SynthEngine', 'Disposed SynthEngine', null, 'audio');
    }
  };

  return instance;
}
