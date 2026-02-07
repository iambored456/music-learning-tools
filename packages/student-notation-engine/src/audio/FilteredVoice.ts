/**
 * Filtered Voice
 *
 * A custom Tone.js synth voice with:
 * - Multi-mode filter (HP/BP/LP with crossfade blend)
 * - Preset gain control
 * - tremoloGain in signal path (modulated externally by shared LFOs)
 *
 * Performance optimizations:
 * - [PERF:SHARED-LFO] Vibrato/tremolo LFOs are shared per color in synthEngine,
 *   not created per voice. Saves ~42 native Web Audio nodes per voice.
 * - [PERF:LAZY-FILTER] Filter wet chain is disconnected when filter is disabled,
 *   orphaning ~22 native nodes from the audio graph.
 * - [PERF:OPP-D] Redundant pass-through gain taps removed; filters connect
 *   directly to crossfade inputs. Saves 3 native nodes per voice.
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
 * A custom synth voice with a sophisticated series/parallel filter blend.
 *
 * Signal chain:
 *   oscillator → presetGain → wetDryFade(dry=a, wet=b) → tremoloGain → envelope
 *                            ↘ [filter chain] → wetDryFade.b (when filter enabled)
 *
 * External modulation targets (connected by synthEngine shared LFOs):
 *   - oscillator.detune  ← shared vibrato LFO (cents-based, frequency-proportional)
 *   - tremoloGain.gain   ← shared tremolo LFO (amplitude modulation)
 */
export class FilteredVoice extends Tone.Synth {
  // Core signal path nodes
  presetGain!: Tone.Gain;
  tremoloGain!: Tone.Gain;

  // Filter nodes
  hpFilter!: Tone.Filter;
  lpFilterForBP!: Tone.Filter;
  lpFilterSolo!: Tone.Filter;

  // Crossfade nodes
  hp_bp_fade!: Tone.CrossFade;
  main_fade!: Tone.CrossFade;
  wetDryFade!: Tone.CrossFade;

  // [PERF:LAZY-FILTER] Track whether the filter wet chain is connected to the audio graph
  private _filterChainConnected = false;

  constructor(options: FilteredVoiceOptions) {
    super(options);

    // --- Core signal path nodes ---
    this.presetGain = new Tone.Gain(options.gain || 1.0);
    this.tremoloGain = new Tone.Gain(1);

    // --- Filter nodes (always created, conditionally connected) ---
    this.hpFilter = new Tone.Filter({ type: 'highpass' });
    this.lpFilterForBP = new Tone.Filter({ type: 'lowpass' });
    this.lpFilterSolo = new Tone.Filter({ type: 'lowpass' });

    // --- Crossfade nodes ---
    this.hp_bp_fade = new Tone.CrossFade(0);
    this.main_fade = new Tone.CrossFade(0);
    this.wetDryFade = new Tone.CrossFade(0);

    // === Audio Routing ===

    // 1. Oscillator → Preset Gain
    this.oscillator.connect(this.presetGain);

    // 2. Dry path: Preset Gain → wetDryFade input A (always connected)
    this.presetGain.connect(this.wetDryFade.a);

    // 3. Internal filter chain wiring (always interconnected, but only
    //    connected to the main graph when filter is enabled)
    // [PERF:OPP-D] Filters connect directly to crossfade inputs — no tap gains
    // A) High-Pass path
    this.hpFilter.connect(this.hp_bp_fade.a);
    // B) Band-Pass path (HPF → LPF in series)
    this.hpFilter.connect(this.lpFilterForBP);
    this.lpFilterForBP.connect(this.hp_bp_fade.b);
    // C) Low-Pass path
    this.lpFilterSolo.connect(this.main_fade.b);
    // D) Blend outputs
    this.hp_bp_fade.connect(this.main_fade.a);

    // 4. [PERF:LAZY-FILTER] Conditionally connect wet chain entrance/exit
    const filterEnabled = options.filter?.enabled ?? false;
    if (filterEnabled) {
      this._connectFilterWetChain();
    }

    // 5. Output path: wetDryFade → tremoloGain → envelope
    this.wetDryFade.connect(this.tremoloGain);
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
  // Kept for backwards compatibility with callers in synthEngine.ts and effectsManager.
  _setVibrato(_params: VibratoParams, _time = Tone.now()): void {
    // No-op: vibrato modulation is applied externally via shared LFO → oscillator.detune
  }

  // [PERF:SHARED-LFO] No-op — tremolo is now handled by shared per-color LFOs.
  // Kept for backwards compatibility with callers in synthEngine.ts and effectsManager.
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
    // [PERF:LAZY-FILTER] Connect/disconnect the filter wet chain based on enabled state
    if (params.enabled && !this._filterChainConnected) {
      this._connectFilterWetChain();
    } else if (!params.enabled && this._filterChainConnected) {
      this._disconnectFilterWetChain();
    }

    this.wetDryFade.fade.value = params.enabled ? 1 : 0;

    // Only update filter parameters when enabled (avoids unnecessary computation)
    if (params.enabled) {
      const freq = Tone.Midi(params.cutoff + 35).toFrequency();
      const q = (params.resonance / 100) * 12 + 0.1;

      // Set parameters on all three filters
      this.hpFilter.set({ frequency: freq, Q: q });
      this.lpFilterForBP.set({ frequency: freq, Q: q });
      this.lpFilterSolo.set({ frequency: freq, Q: q });

      const blend = params.blend;

      // Blend from HP (0) -> BP (1)
      if (blend <= 1.0) {
        this.main_fade.fade.value = 0;
        this.hp_bp_fade.fade.value = blend;
      }
      // Blend from BP (1) -> LP (2)
      else {
        this.main_fade.fade.value = blend - 1.0;
        this.hp_bp_fade.fade.value = 1.0;
      }
    }
  }

  // [PERF:LAZY-FILTER] Connect the filter wet chain entrance/exit to the audio graph.
  // The internal filter wiring (hpFilter↔hp_bp_fade, etc.) stays permanently connected.
  // Only the "entrance" (presetGain → filters) and "exit" (main_fade → wetDryFade.b)
  // are toggled, which orphans/re-adopts the entire subgraph.
  private _connectFilterWetChain(): void {
    if (this._filterChainConnected) return;
    this.presetGain.connect(this.hpFilter);
    this.presetGain.connect(this.lpFilterSolo);
    this.main_fade.connect(this.wetDryFade.b);
    this._filterChainConnected = true;
    voiceLogger?.debug('FilteredVoice', 'Filter wet chain connected', null, 'audio');
  }

  // [PERF:LAZY-FILTER] Disconnect the filter wet chain. The 8 orphaned nodes
  // (3 filters + 2 crossfades + internal wiring) won't be processed by the
  // audio thread since they have no path to the AudioContext destination.
  private _disconnectFilterWetChain(): void {
    if (!this._filterChainConnected) return;
    this.presetGain.disconnect(this.hpFilter);
    this.presetGain.disconnect(this.lpFilterSolo);
    this.main_fade.disconnect(this.wetDryFade.b);
    this._filterChainConnected = false;
    voiceLogger?.debug('FilteredVoice', 'Filter wet chain disconnected', null, 'audio');
  }
}
