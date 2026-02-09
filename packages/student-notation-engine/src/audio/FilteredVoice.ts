/**
 * Filtered Voice
 *
 * A custom Tone.js synth voice with:
 * - Multi-mode filter (HP/BP/LP with blend)
 * - Preset gain control
 * - tremoloGain in signal path (modulated externally by shared LFOs)
 *
 * Performance optimizations:
 * - [PERF:SHARED-LFO] Vibrato/tremolo LFOs are shared per color in synthEngine,
 *   not created per voice. Saves ~42 native Web Audio nodes per voice.
 * - [PERF:LAZY-FILTER] Filter wet chain is disconnected when filter is disabled,
 *   orphaning filter nodes from the audio graph.
 * - [PERF:NATIVE-NODES] Filters use native BiquadFilterNode (1 node each) instead of
 *   Tone.Filter (11 nodes each). Blend uses native GainNode (4 total) instead of
 *   3 × Tone.CrossFade (8 nodes each). Saves ~50 native nodes per voice.
 * - [PERF:DOUBLE-PATH-FIX] Oscillator → envelope default path from Tone.Synth is
 *   disconnected; signal flows exclusively through the custom chain.
 *
 * Framework-agnostic - no DOM dependencies.
 */
import * as Tone from 'tone';

export interface FilteredVoiceOptions extends Tone.SynthOptions {
  filter?: FilterParams;
  vibrato?: VibratoParams;
  tremelo?: TremoloParams;  // Note: 'tremelo' spelling for consistency with existing code
  gain?: number;
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

/**
 * Signal chain:
 *   oscillator → presetGain → _dryGain ─────────────────────→ tremoloGain → envelope → output
 *                            → _hpFilter → _hpGain ──────────→ tremoloGain
 *                            → _hpFilter → _bpFilter → _bpGain → tremoloGain
 *                            → _lpFilter → _lpGain ──────────→ tremoloGain
 *
 * When filter is disabled, _dryGain=1 and filter entrance is disconnected.
 * When filter is enabled, _dryGain=0 and blend gains control HP/BP/LP mix.
 *
 * External modulation targets (connected by synthEngine shared LFOs):
 *   - oscillator.detune  ← shared vibrato LFO (cents-based, frequency-proportional)
 *   - tremoloGain.gain   ← shared tremolo LFO (amplitude modulation)
 */
export class FilteredVoice extends Tone.Synth {
  // Core signal path (Tone.js wrappers — needed for shared LFO connection API)
  presetGain!: Tone.Gain;
  tremoloGain!: Tone.Gain;

  // [PERF:NATIVE-NODES] Native filter nodes (1 node each vs 11 for Tone.Filter)
  private _hpFilter!: BiquadFilterNode;
  private _bpFilter!: BiquadFilterNode;  // LP filter for HP→LP bandpass combo
  private _lpFilter!: BiquadFilterNode;

  // [PERF:NATIVE-NODES] Native blend/dry gains (4 nodes vs 24 for 3 × Tone.CrossFade)
  private _dryGain!: GainNode;
  private _hpGain!: GainNode;
  private _bpGain!: GainNode;
  private _lpGain!: GainNode;

  // [PERF:LAZY-FILTER] Track whether the filter wet chain is connected to the audio graph
  private _filterChainConnected = false;

  constructor(options: FilteredVoiceOptions) {
    super(options);

    // [PERF:DOUBLE-PATH-FIX] Tone.Synth wires oscillator → envelope → output.
    // We route through our own chain, so disconnect the default path.
    this.oscillator.disconnect(this.envelope);

    const ctx = this.context.rawContext as AudioContext;

    // --- Core signal path ---
    this.presetGain = new Tone.Gain(options.gain || 1.0);
    this.tremoloGain = new Tone.Gain(1);

    // --- Native filter nodes ---
    this._hpFilter = ctx.createBiquadFilter();
    this._hpFilter.type = 'highpass';
    this._bpFilter = ctx.createBiquadFilter();
    this._bpFilter.type = 'lowpass';
    this._lpFilter = ctx.createBiquadFilter();
    this._lpFilter.type = 'lowpass';

    // --- Native blend/dry gains (dry=1 = filter off, filter gains start at 0) ---
    this._dryGain = ctx.createGain();
    this._dryGain.gain.value = 1;
    this._hpGain = ctx.createGain();
    this._hpGain.gain.value = 0;
    this._bpGain = ctx.createGain();
    this._bpGain.gain.value = 0;
    this._lpGain = ctx.createGain();
    this._lpGain.gain.value = 0;

    // === Audio Routing ===

    // 1. Oscillator → Preset Gain
    this.oscillator.connect(this.presetGain);

    // 2. Dry path (always connected): presetGain → _dryGain → tremoloGain
    this.presetGain.output.connect(this._dryGain);
    this._dryGain.connect(this.tremoloGain.input);

    // 3. Filter internal wiring (always interconnected; entrance is toggled)
    //    HP path: _hpFilter → _hpGain → tremoloGain
    this._hpFilter.connect(this._hpGain);
    this._hpGain.connect(this.tremoloGain.input);
    //    BP path: _hpFilter → _bpFilter → _bpGain → tremoloGain
    this._hpFilter.connect(this._bpFilter);
    this._bpFilter.connect(this._bpGain);
    this._bpGain.connect(this.tremoloGain.input);
    //    LP path: _lpFilter → _lpGain → tremoloGain
    this._lpFilter.connect(this._lpGain);
    this._lpGain.connect(this.tremoloGain.input);

    // 4. [PERF:LAZY-FILTER] Conditionally connect filter entrance
    if (options.filter?.enabled) {
      this._connectFilterWetChain();
    }

    // 5. Output: tremoloGain → envelope (envelope → output is from Synth base class)
    this.tremoloGain.connect(this.envelope);

    // 6. Apply initial filter settings
    if (options.filter) {
      this._setFilter(options.filter);
    }

    // [PERF:SHARED-LFO] Vibrato and tremolo are handled by shared per-color LFOs
    // in synthEngine.ts, not per-voice. _setVibrato/_setTremolo are kept as no-ops
    // for backwards compatibility with callers that haven't been updated yet.
  }

  _setPresetGain(value: number): void {
    if (this.presetGain) {
      this.presetGain.gain.value = value;
    }
  }

  // [PERF:SHARED-LFO] No-op — vibrato is now handled by shared per-color LFOs.
  _setVibrato(_params: VibratoParams, _time = Tone.now()): void {
    // No-op: vibrato modulation is applied externally via shared LFO → oscillator.detune
  }

  // [PERF:SHARED-LFO] No-op — tremolo is now handled by shared per-color LFOs.
  _setTremolo(_params: TremoloParams, _time = Tone.now()): void {
    // No-op: tremolo modulation is applied externally via shared LFO → tremoloGain.gain
  }

  /**
   * Reset tremoloGain to pass-through (gain=1.0).
   * Called by synthEngine when shared tremolo LFO is disconnected.
   */
  _resetTremoloGain(time = Tone.now()): void {
    if (this.tremoloGain) {
      this.tremoloGain.gain.cancelScheduledValues(time);
      this.tremoloGain.gain.value = 1.0;
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

  // [PERF:LAZY-FILTER] Connect filter entrance from presetGain.
  // Internal filter wiring stays permanently connected; only the entrance
  // (presetGain → filters) is toggled, which orphans/re-adopts the subgraph.
  private _connectFilterWetChain(): void {
    if (this._filterChainConnected) return;
    this.presetGain.output.connect(this._hpFilter);
    this.presetGain.output.connect(this._lpFilter);
    this._filterChainConnected = true;
    voiceLogger?.debug('FilteredVoice', 'Filter wet chain connected', null, 'audio');
  }

  // [PERF:LAZY-FILTER] Disconnect filter entrance. The orphaned filter nodes
  // and downstream blend gains have no input and won't be processed.
  private _disconnectFilterWetChain(): void {
    if (!this._filterChainConnected) return;
    this.presetGain.output.disconnect(this._hpFilter);
    this.presetGain.output.disconnect(this._lpFilter);
    this._filterChainConnected = false;
    voiceLogger?.debug('FilteredVoice', 'Filter wet chain disconnected', null, 'audio');
  }
}
