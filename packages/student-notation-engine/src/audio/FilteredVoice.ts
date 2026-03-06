/**
 * Filtered Voice — Native Web Audio Implementation
 *
 * Extends Tone.Monophonic directly (skipping Tone.Synth) to eliminate
 * 12 unnecessary nodes from the Tone.js OmniOscillator and AmplitudeEnvelope
 * abstraction layers. Result: 13 native nodes per voice instead of 25.
 *
 * Performance optimizations:
 * - [PERF:NATIVE-OSC] Native OscillatorNode + PeriodicWave replaces OmniOscillator
 *   stack (saves 11 nodes: 4 wasted Signals, 3 pass-throughs, 2 freq Signals,
 *   1 fade GainNode, 1 detune Signal pair).
 * - [PERF:NATIVE-ADSR] Native GainNode with AudioParam automation replaces
 *   AmplitudeEnvelope (saves 2 Signal nodes).
 * - [PERF:SHARED-LFO] Vibrato/tremolo LFOs are shared per color in synthEngine,
 *   not created per voice.
 * - [PERF:LAZY-FILTER] Filter wet chain is disconnected when filter is disabled,
 *   orphaning filter nodes from the audio graph.
 * - [PERF:NATIVE-NODES] Filters use native BiquadFilterNode + GainNode blending.
 *
 * Node inventory (13 total):
 *   #1  OscillatorNode     - Sound source (fire-and-forget per note)
 *   #2  GainNode           - Detune bus (persistent vibrato LFO target)
 *   #3  GainNode           - ADSR envelope gate (native automation)
 *   #4  GainNode           - Instrument._volume (from Monophonic base)
 *   #5  GainNode           - Preset gain (timbre volume)
 *   #6  GainNode           - Tremolo target
 *   #7  GainNode           - Dry/bypass
 *   #8  BiquadFilterNode   - Highpass
 *   #9  GainNode           - HP blend weight
 *   #10 BiquadFilterNode   - Bandpass LP stage
 *   #11 GainNode           - BP blend weight
 *   #12 BiquadFilterNode   - Lowpass
 *   #13 GainNode           - LP blend weight
 *
 * Signal chain:
 *   oscillator → _presetGain → _dryGain ─────────────────────→ _tremoloGain → _envelopeGain → output
 *                             → _hpFilter → _hpGain ──────────→ _tremoloGain
 *                             → _hpFilter → _bpFilter → _bpGain → _tremoloGain
 *                             → _lpFilter → _lpGain ──────────→ _tremoloGain
 *
 * External modulation targets (connected by synthEngine shared LFOs):
 *   - detuneInput (GainNode)      ← shared vibrato LFO
 *   - tremoloInput (AudioParam)   ← shared tremolo LFO
 *
 * Framework-agnostic - no DOM dependencies.
 */
import * as Tone from 'tone';
// Monophonic is not in Tone.js public API — import the concrete ESM file that
// Tone.PolySynth also resolves against so its runtime `instanceof Monophonic`
// check recognizes FilteredVoice instances.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore internal Tone.js import
import { Monophonic } from 'tone/build/esm/instrument/Monophonic.js';

export interface FilteredVoiceOptions {
  oscillator?: { type?: string; partials?: number[] };
  envelope?: { attack?: number; decay?: number; sustain?: number; release?: number };
  filter?: FilterParams;
  vibrato?: VibratoParams;
  tremelo?: TremoloParams;  // Note: 'tremelo' spelling for consistency with existing code
  gain?: number;
  context?: any;
  onsilence?: (voice: any) => void;
  volume?: number;
  [key: string]: any;
}

export interface FilterParams {
  enabled: boolean;
  cutoff: number;      // MIDI note number offset
  resonance: number;   // 0-100
  blend: number;       // 0-2: 0=HP, 1=BP, 2=LP
}

export interface VibratoParams {
  speed: number;  // 0-100
  span: number;   // 0-100
}

export interface TremoloParams {
  speed: number;  // 0-100
  span: number;   // 0-100
}

/**
 * Optional logger interface for debug output.
 * If not provided, logging is silently skipped.
 */
export interface VoiceLogger {
  debug(category: string, message: string, data?: unknown, context?: string): void;
}

// Module-level logger that can be set
let voiceLogger: VoiceLogger | null = null;

/**
 * Set the logger for FilteredVoice instances.
 * Call this once during initialization if you want debug logging.
 */
export function setVoiceLogger(logger: VoiceLogger | null): void {
  voiceLogger = logger;
}

// PolySynth requires `voice instanceof Monophonic` and a static getDefaults()
const MonophonicBase = Monophonic as any;

export class FilteredVoice extends MonophonicBase {
  static getDefaults() {
    return Object.assign(MonophonicBase.getDefaults(), {
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
      oscillator: { type: 'custom', partials: [1] },
      filter: undefined,
      gain: 1,
    });
  }

  // Suppress Tone.js Monophonic.triggerAttack/triggerRelease console logging
  protected log(): void { /* noop */ }

  // --- Native oscillator (fire-and-forget per note) ---
  private _oscillator: OscillatorNode | null = null;
  private _periodicWave!: PeriodicWave;
  private _currentPartials!: number[];

  // --- ADSR state ---
  private _adsrParams!: { attack: number; decay: number; sustain: number; release: number };
  private _attackStartTime = -1;
  private _releaseStartTime = -1;
  private _lastVelocity = 1;

  // --- Native audio nodes (persistent across notes) ---
  private _detuneBus!: GainNode;       // #2: vibrato LFO target
  private _envelopeGain!: GainNode;    // #3: ADSR gate
  // #4: Instrument._volume (created by base class)
  private _presetGain!: GainNode;      // #5: timbre volume
  private _tremoloGain!: GainNode;     // #6: tremolo target

  // --- Filter nodes ---
  private _hpFilter!: BiquadFilterNode;
  private _bpFilter!: BiquadFilterNode;  // LP filter for HP→LP bandpass combo
  private _lpFilter!: BiquadFilterNode;
  private _dryGain!: GainNode;
  private _hpGain!: GainNode;
  private _bpGain!: GainNode;
  private _lpGain!: GainNode;

  // [PERF:LAZY-FILTER] Track whether the filter wet chain is connected
  private _filterChainConnected = false;

  // --- Public LFO connection targets ---
  detuneInput!: GainNode;          // vibrato LFO connects here
  tremoloInput!: AudioParam;       // tremolo LFO connects here

  // Frequency proxy — satisfies Monophonic.setNote() with 0 native nodes
  frequency: any;

  constructor(options: FilteredVoiceOptions) {
    super(options);

    const ctx = this.context.rawContext as AudioContext;
    const self = this;

    // --- Cache ADSR params ---
    this._adsrParams = {
      attack: options.envelope?.attack ?? 0.005,
      decay: options.envelope?.decay ?? 0.1,
      sustain: options.envelope?.sustain ?? 0.3,
      release: options.envelope?.release ?? 1,
    };

    // --- Create PeriodicWave from partials ---
    this._currentPartials = options.oscillator?.partials ?? [1];
    this._periodicWave = this._createPeriodicWave(ctx, this._currentPartials);

    // --- Frequency proxy (0 native nodes) ---
    // Monophonic.setNote() calls this.frequency.setValueAtTime() or .exponentialRampTo().
    // We cache the value and forward to the native oscillator when it exists.
    this.frequency = {
      value: 440,
      setValueAtTime(freq: any, time: number) {
        const hz = self.toFrequency(freq); // FrequencyClass/note name → Hz
        self.frequency.value = hz;
        if (self._oscillator) {
          self._oscillator.frequency.setValueAtTime(hz, time);
        }
      },
      exponentialRampTo(freq: any, rampTime: number, startTime: number) {
        const hz = self.toFrequency(freq); // FrequencyClass/note name → Hz
        self.frequency.value = hz;
        if (self._oscillator) {
          self._oscillator.frequency.exponentialRampToValueAtTime(hz, startTime + rampTime);
        }
      },
    };

    // === Native Nodes ===

    // #2: Detune bus — persistent vibrato LFO target
    this._detuneBus = ctx.createGain();
    this._detuneBus.gain.value = 1;

    // #3: ADSR envelope gate
    this._envelopeGain = ctx.createGain();
    this._envelopeGain.gain.value = 0;

    // #5: Preset gain (timbre volume)
    this._presetGain = ctx.createGain();
    this._presetGain.gain.value = options.gain ?? 1.0;

    // #6: Tremolo target
    this._tremoloGain = ctx.createGain();
    this._tremoloGain.gain.value = 1;

    // --- Filter nodes (#7-#13) ---
    this._hpFilter = ctx.createBiquadFilter();
    this._hpFilter.type = 'highpass';
    this._bpFilter = ctx.createBiquadFilter();
    this._bpFilter.type = 'lowpass';
    this._lpFilter = ctx.createBiquadFilter();
    this._lpFilter.type = 'lowpass';

    this._dryGain = ctx.createGain();
    this._dryGain.gain.value = 1;
    this._hpGain = ctx.createGain();
    this._hpGain.gain.value = 0;
    this._bpGain = ctx.createGain();
    this._bpGain.gain.value = 0;
    this._lpGain = ctx.createGain();
    this._lpGain.gain.value = 0;

    // === Audio Routing ===

    // Dry path: _presetGain → _dryGain → _tremoloGain
    this._presetGain.connect(this._dryGain);
    this._dryGain.connect(this._tremoloGain);

    // Filter internal wiring (always connected; entrance toggled by lazy-filter)
    this._hpFilter.connect(this._hpGain);
    this._hpGain.connect(this._tremoloGain);
    this._hpFilter.connect(this._bpFilter);
    this._bpFilter.connect(this._bpGain);
    this._bpGain.connect(this._tremoloGain);
    this._lpFilter.connect(this._lpGain);
    this._lpGain.connect(this._tremoloGain);

    // Output chain: _tremoloGain → _envelopeGain → Instrument._volume
    this._tremoloGain.connect(this._envelopeGain);

    // Connect to Instrument's output (Volume.input is Tone.Gain, Tone.Gain._gainNode is native)
    const instrumentVolume = (this as any)._volume;
    const volumeNativeGain = instrumentVolume.input._gainNode as GainNode;
    this._envelopeGain.connect(volumeNativeGain);

    // [PERF:LAZY-FILTER] Conditionally connect filter entrance
    if (options.filter?.enabled) {
      this._connectFilterWetChain();
    }

    // Apply initial filter settings
    if (options.filter) {
      this._setFilter(options.filter);
    }

    // Expose LFO connection targets
    this.detuneInput = this._detuneBus;
    this.tremoloInput = this._tremoloGain.gain;
  }

  // --- PeriodicWave creation ---

  private _createPeriodicWave(ctx: AudioContext, partials: number[]): PeriodicWave {
    const real = new Float32Array(partials.length + 1); // all zeros (cosine = 0 at phase 0)
    const imag = new Float32Array(partials.length + 1);
    for (let i = 0; i < partials.length; i++) {
      imag[i + 1] = partials[i]; // sine components
    }
    return ctx.createPeriodicWave(real, imag);
  }

  private _updatePeriodicWave(partials: number[]): void {
    this._currentPartials = partials;
    const ctx = this.context.rawContext as AudioContext;
    this._periodicWave = this._createPeriodicWave(ctx, partials);
    if (this._oscillator) {
      this._oscillator.setPeriodicWave(this._periodicWave);
    }
  }

  // --- Monophonic required methods ---

  /**
   * Start the attack portion of the envelope.
   * Called by Monophonic.triggerAttack() BEFORE setNote().
   */
  _triggerEnvelopeAttack(time: number, velocity: number): void {
    const ctx = this.context.rawContext as AudioContext;

    // Clean up previous oscillator (voice may be recycled by PolySynth)
    if (this._oscillator) {
      try {
        this._oscillator.onended = null;
        this._oscillator.stop(time);
        this._oscillator.disconnect();
      } catch {
        // Oscillator may already be stopped
      }
      this._oscillator = null;
    }

    // Create new OscillatorNode with cached PeriodicWave
    this._oscillator = ctx.createOscillator();
    this._oscillator.setPeriodicWave(this._periodicWave);

    // Set frequency to cached value (setNote() will override at the same time)
    this._oscillator.frequency.setValueAtTime(this.frequency.value, time);

    // Wire: oscillator → _presetGain
    this._oscillator.connect(this._presetGain);

    // Re-link detune bus to new oscillator's detune param
    try { this._detuneBus.disconnect(); } catch { /* not yet connected */ }
    this._detuneBus.connect(this._oscillator.detune);

    // Start oscillator
    this._oscillator.start(time);

    // Track timing for getLevelAtTime()
    this._attackStartTime = time;
    this._releaseStartTime = -1;
    this._lastVelocity = velocity;

    // Schedule ADSR attack + decay on _envelopeGain.gain
    const { attack, decay, sustain } = this._adsrParams;
    const gainParam = this._envelopeGain.gain;

    gainParam.cancelScheduledValues(time);
    gainParam.setValueAtTime(0, time);

    // Attack: linear ramp to peak (velocity)
    gainParam.linearRampToValueAtTime(velocity, time + attack);

    // Decay: exponential ramp to sustain level (value must be > 0)
    const sustainLevel = Math.max(sustain * velocity, 0.0001);
    if (decay > 0) {
      gainParam.exponentialRampToValueAtTime(sustainLevel, time + attack + decay);
    } else {
      gainParam.setValueAtTime(sustainLevel, time + attack);
    }

    // Zero-sustain: stop oscillator after attack+decay
    if (sustain === 0) {
      const stopTime = time + attack + decay + 0.01;
      this._oscillator.stop(stopTime);
      this._oscillator.onended = () => {
        this._attackStartTime = -1;
        this.onsilence(this);
      };
    }
  }

  /**
   * Start the release portion of the envelope.
   * Called by Monophonic.triggerRelease().
   */
  _triggerEnvelopeRelease(time: number): void {
    if (!this._oscillator) return;

    const { release } = this._adsrParams;
    const gainParam = this._envelopeGain.gain;

    this._releaseStartTime = time;

    // Freeze current gain value and cancel future automation
    gainParam.cancelAndHoldAtTime(time);

    // Release: linear ramp to 0 (avoids exponential never-reaches-zero issue)
    gainParam.linearRampToValueAtTime(0, time + release);

    // Stop oscillator shortly after release completes
    try {
      this._oscillator.stop(time + release + 0.02);
    } catch {
      // Already scheduled to stop (zero-sustain case)
    }

    // When oscillator stops, tell PolySynth this voice is available
    this._oscillator.onended = () => {
      this._attackStartTime = -1;
      this.onsilence(this);
    };
  }

  /**
   * Approximate envelope level at the given time.
   * Used by Monophonic for portamento decisions (> 0.05 means "voice is active").
   */
  getLevelAtTime(time: number): number {
    time = this.toSeconds(time);
    if (this._attackStartTime < 0) return 0;

    const { attack, decay, sustain, release } = this._adsrParams;
    const velocity = this._lastVelocity;

    // Release phase
    if (this._releaseStartTime >= 0) {
      const releaseElapsed = time - this._releaseStartTime;
      if (releaseElapsed >= release) return 0;
      if (releaseElapsed >= 0) {
        const sustainLevel = sustain * velocity;
        return sustainLevel * (1 - releaseElapsed / release);
      }
    }

    // Attack/decay/sustain phases
    const elapsed = time - this._attackStartTime;
    if (elapsed < 0) return 0;
    if (elapsed < attack) {
      return (elapsed / attack) * velocity;
    }
    if (elapsed < attack + decay) {
      const decayProgress = (elapsed - attack) / decay;
      return velocity - (velocity - sustain * velocity) * decayProgress;
    }
    return sustain * velocity;
  }

  // --- Option handling for PolySynth.set() ---

  set(options: Record<string, any>): this {
    if (options.oscillator?.partials) {
      this._updatePeriodicWave(options.oscillator.partials);
    }
    if (options.envelope) {
      Object.assign(this._adsrParams, options.envelope);
    }
    if (options.gain !== undefined) {
      this._setPresetGain(options.gain);
    }
    if (options.filter) {
      this._setFilter(options.filter);
    }
    return this;
  }

  // --- Public methods (same interface as previous FilteredVoice) ---

  _setPresetGain(value: number): void {
    if (this._presetGain) {
      this._presetGain.gain.value = value;
    }
  }

  // [PERF:SHARED-LFO] No-op — vibrato handled by shared per-color LFOs.
  _setVibrato(_params: VibratoParams, _time = Tone.now()): void {
    // No-op: vibrato modulation applied externally via shared LFO → detuneInput
  }

  // [PERF:SHARED-LFO] No-op — tremolo handled by shared per-color LFOs.
  _setTremolo(_params: TremoloParams, _time = Tone.now()): void {
    // No-op: tremolo modulation applied externally via shared LFO → tremoloInput
  }

  /**
   * Reset tremoloGain to pass-through (gain=1.0).
   * Called by synthEngine when shared tremolo LFO is disconnected.
   */
  _resetTremoloGain(time = Tone.now()): void {
    if (this._tremoloGain) {
      this._tremoloGain.gain.cancelScheduledValues(time);
      this._tremoloGain.gain.value = 1.0;
    }
  }

  _setFilter(params: FilterParams): void {
    // [PERF:LAZY-FILTER] Connect/disconnect filter wet chain based on enabled state
    if (params.enabled && !this._filterChainConnected) {
      this._connectFilterWetChain();
    } else if (!params.enabled && this._filterChainConnected) {
      this._disconnectFilterWetChain();
    }

    // Dry/wet toggle: dry=1 when filter off, dry=0 when filter on
    this._dryGain.gain.value = params.enabled ? 0 : 1;

    // Only update filter parameters when enabled
    if (params.enabled) {
      const freq = Tone.Midi(params.cutoff + 35).toFrequency();
      const q = (params.resonance / 100) * 12 + 0.1;

      // Set native filter parameters directly
      this._hpFilter.frequency.value = freq;
      this._hpFilter.Q.value = q;
      this._bpFilter.frequency.value = freq;
      this._bpFilter.Q.value = q;
      this._lpFilter.frequency.value = freq;
      this._lpFilter.Q.value = q;

      // Linear blend: 0=HP, 1=BP, 2=LP
      const blend = params.blend;
      if (blend <= 1.0) {
        this._hpGain.gain.value = 1 - blend;
        this._bpGain.gain.value = blend;
        this._lpGain.gain.value = 0;
      } else {
        this._hpGain.gain.value = 0;
        this._bpGain.gain.value = 2 - blend;
        this._lpGain.gain.value = blend - 1;
      }
    }
  }

  // [PERF:LAZY-FILTER] Connect filter entrance from _presetGain.
  private _connectFilterWetChain(): void {
    if (this._filterChainConnected) return;
    this._presetGain.connect(this._hpFilter);
    this._presetGain.connect(this._lpFilter);
    this._filterChainConnected = true;
    voiceLogger?.debug('FilteredVoice', 'Filter wet chain connected', null, 'audio');
  }

  // [PERF:LAZY-FILTER] Disconnect filter entrance.
  private _disconnectFilterWetChain(): void {
    if (!this._filterChainConnected) return;
    this._presetGain.disconnect(this._hpFilter);
    this._presetGain.disconnect(this._lpFilter);
    this._filterChainConnected = false;
    voiceLogger?.debug('FilteredVoice', 'Filter wet chain disconnected', null, 'audio');
  }

  /**
   * Clean up all native nodes.
   */
  dispose(): this {
    if (this._oscillator) {
      try {
        this._oscillator.onended = null;
        this._oscillator.stop();
        this._oscillator.disconnect();
      } catch { /* already stopped */ }
      this._oscillator = null;
    }

    try { this._detuneBus.disconnect(); } catch { /* ok */ }
    try { this._envelopeGain.disconnect(); } catch { /* ok */ }
    try { this._presetGain.disconnect(); } catch { /* ok */ }
    try { this._tremoloGain.disconnect(); } catch { /* ok */ }
    try { this._dryGain.disconnect(); } catch { /* ok */ }
    try { this._hpFilter.disconnect(); } catch { /* ok */ }
    try { this._hpGain.disconnect(); } catch { /* ok */ }
    try { this._bpFilter.disconnect(); } catch { /* ok */ }
    try { this._bpGain.disconnect(); } catch { /* ok */ }
    try { this._lpFilter.disconnect(); } catch { /* ok */ }
    try { this._lpGain.disconnect(); } catch { /* ok */ }

    super.dispose();
    return this;
  }
}
