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
    getDrumVolume
  } = config;

  // Internal state
  const synths: Record<string, Tone.PolySynth> = {};
  let masterGain: Tone.Gain | null = null;
  let volumeControl: Tone.Volume | null = null;
  let compressor: Tone.Compressor | null = null;
  let limiter: Tone.Limiter | null = null;
  let clippingMeter: Tone.Meter | null = null;
  let waveformAnalyzers: Record<string, Tone.Analyser> = {};
  let gainManager: GainManager | null = null;
  let clippingMonitor: ClippingMonitor | null = null;

  // Copy of timbres for internal mutation
  const internalTimbres: Record<string, InternalTimbreState> = { ...timbres };

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
      gainManager = new GainManager(masterGain);
      gainManager.start();

      // 2. User volume control (independent of automatic gain scaling)
      volumeControl = new Tone.Volume(masterVolume);

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

        const synth = new Tone.PolySynth({
          voice: FilteredVoice,
          options: {
            oscillator: { type: 'custom', partials: normalizedCoeffs },
            envelope: timbre.adsr,
            filter: timbre.filter,
            vibrato: timbre.vibrato,
            tremelo: timbre.tremelo,
            gain: presetGain
          } as any
        }).connect(masterGain) as any;

        // Apply synth-level effects if effects manager is available
        if (effectsManager && masterGain) {
          effectsManager.applySynthEffects(synth, color, masterGain);
        }

        // Hook into voice creation to apply vibrato/tremolo to new voices
        const originalTriggerAttack = synth.triggerAttack.bind(synth);
        synth.triggerAttack = function(...args: any[]) {
          const result = originalTriggerAttack(...args);

          // Apply current settings to newly created voices
          // Use Tone.Draw.schedule to sync with the audio timeline
          // Schedule slightly after the attack time to ensure voice exists
          const triggerTime = args[1] ?? Tone.now();
          const effectApplicationTime = triggerTime + 0.005; // 5ms after attack in audio time

          Tone.Draw.schedule(() => {
            const activeVoices = this._activeVoices;

            if (effectsManager) {
              if (activeVoices && activeVoices.size > 0) {
                activeVoices.forEach((voice: any) => {
                  if (!voice.effectsApplied) {
                    effectsManager.applyEffectsToVoice(voice, color);
                    voice.effectsApplied = true;
                  }
                });
              } else if (this._voices && Array.isArray(this._voices)) {
                this._voices.forEach((voice: any) => {
                  if (voice && !voice.effectsApplied) {
                    effectsManager.applyEffectsToVoice(voice, color);
                    voice.effectsApplied = true;
                  }
                });
              }
            } else {
              // Fallback to legacy approach
              if (activeVoices && activeVoices.size > 0) {
                activeVoices.forEach((voice: any) => {
                  if (voice._setVibrato && voice.vibratoApplied !== true) {
                    voice._setVibrato(this._currentVibrato);
                    voice.vibratoApplied = true;
                  }
                  if (voice._setTremolo && voice.tremoloApplied !== true) {
                    voice._setTremolo(this._currentTremolo);
                    voice.tremoloApplied = true;
                  }
                });
              } else if (this._voices && Array.isArray(this._voices)) {
                this._voices.forEach((voice: any) => {
                  if (voice?._setVibrato && voice.vibratoApplied !== true) {
                    voice._setVibrato(this._currentVibrato);
                    voice.vibratoApplied = true;
                  }
                  if (voice?._setTremolo && voice.tremoloApplied !== true) {
                    voice._setTremolo(this._currentTremolo);
                    voice.tremoloApplied = true;
                  }
                });
              }
            }
          }, effectApplicationTime);

          return result;
        };

        // Store current settings on synth for future reference
        synth._currentVibrato = timbre.vibrato;
        synth._currentTremolo = timbre.tremelo;
        synth._currentFilter = timbre.filter;

        synths[color] = synth;
        log.debug('SynthEngine', `Created filtered synth for color: ${color}`, null, 'audio');
      }

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

      // Update stored settings on synth for future voices
      // @ts-expect-error - Custom runtime properties added to synth
      synth._currentVibrato = timbre.vibrato;
      // @ts-expect-error - Custom runtime properties added to synth
      synth._currentTremolo = timbre.tremelo;
      // @ts-expect-error - Custom runtime properties added to synth
      synth._currentFilter = timbre.filter;

      // Try setting parameters on existing voices
      // @ts-expect-error - Accessing private Tone.js property
      const activeVoices = synth._activeVoices;

      if (activeVoices && activeVoices.size > 0) {
        activeVoices.forEach((voice: any) => {
          if (voice._setFilter) {
            voice._setFilter(timbre.filter);
          }
          if (voice._setVibrato) {
            voice._setVibrato(timbre.vibrato);
            voice.vibratoApplied = true;
          }
          if (voice._setTremolo) {
            voice._setTremolo(timbre.tremelo);
            voice.tremoloApplied = true;
          }
          if (voice._setPresetGain) {
            const presetGain = timbre.gain || 1.0;
            voice._setPresetGain(presetGain);
          }
        });
        // @ts-expect-error - Accessing private Tone.js property
      } else if (synth._voices && Array.isArray(synth._voices)) {
        // @ts-expect-error - Accessing private Tone.js property
        synth._voices.forEach((voice: any) => {
          if (voice?._setVibrato) {
            voice._setVibrato(timbre.vibrato);
            voice.vibratoApplied = true;
          }
          if (voice?._setTremolo) {
            voice._setTremolo(timbre.tremelo);
            voice.tremoloApplied = true;
          }
          if (voice?._setFilter) {
            voice._setFilter(timbre.filter);
          }
          if (voice?._setPresetGain) {
            const presetGain = timbre.gain || 1.0;
            voice._setPresetGain(presetGain);
          }
        });
      }
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

    async playNote(pitch: string | number, duration: number | string, time = Tone.now()) {
      // Use provided audio init or default to Tone.start()
      const init = audioInit || (() => Tone.start());
      await init();

      // Get the first available synth
      const colors = Object.keys(synths);
      if (colors.length === 0) return;

      const [firstColor] = colors;
      if (!firstColor) return;
      const synth = synths[firstColor];
      if (synth) {
        synth.triggerAttackRelease(pitch, duration, time);
      }
    },

    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(pitch: string | number, color: string, time = Tone.now(), isDrum = false) {
      const synth = synths[color];
      if (!synth) return;

      // Increment active voice count
      gainManager?.noteOn(1);

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

        // Clamp active voice count to current synth voices after quick release
        const currentVoices = (synth as any)._activeVoices?.size ?? (synth as any)._voices?.length ?? gainManager?.getActiveVoiceCount() ?? 0;
        gainManager?.clampActiveVoiceCountToAtMost(currentVoices);
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

      // Decrement active voice count
      gainManager?.noteOff(1);

      // Clamp to actual synth voices to avoid drift
      const currentVoices = (synth as any)._activeVoices?.size ?? (synth as any)._voices?.length ?? gainManager?.getActiveVoiceCount() ?? 0;
      gainManager?.clampActiveVoiceCountToAtMost(currentVoices);
    },

    releaseAll() {
      for (const color in synths) {
        synths[color]?.releaseAll();
      }
      gainManager?.resetActiveVoiceCount();
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
      clippingMonitor?.stop();
      gainManager?.stop();
    },

    dispose() {
      this.stopBackgroundMonitors();
      this.disposeAllWaveformAnalyzers();

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

      log.debug('SynthEngine', 'Disposed SynthEngine', null, 'audio');
    }
  };

  return instance;
}
