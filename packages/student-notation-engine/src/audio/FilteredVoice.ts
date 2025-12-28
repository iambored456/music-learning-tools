/**
 * Filtered Voice
 *
 * A custom Tone.js synth voice with:
 * - Multi-mode filter (HP/BP/LP with crossfade blend)
 * - Vibrato (frequency modulation via LFO)
 * - Tremolo (amplitude modulation via LFO)
 * - Preset gain control
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
 */
export class FilteredVoice extends Tone.Synth {
  // Audio effect nodes
  presetGain!: Tone.Gain;
  vibratoLFO!: Tone.LFO;
  vibratoDepth!: Tone.Scale;
  vibratoGain!: Tone.Gain;
  tremoloLFO!: Tone.LFO;
  tremoloDepth!: Tone.Scale;
  tremoloGain!: Tone.Gain;

  // Filter nodes
  hpFilter!: Tone.Filter;
  lpFilterForBP!: Tone.Filter;
  lpFilterSolo!: Tone.Filter;

  // Output nodes
  hpOutput!: Tone.Gain;
  bpOutput!: Tone.Gain;
  lpOutput!: Tone.Gain;

  // Crossfade nodes
  hp_bp_fade!: Tone.CrossFade;
  main_fade!: Tone.CrossFade;
  wetDryFade!: Tone.CrossFade;

  constructor(options: FilteredVoiceOptions) {
    super(options);

    // --- Create all necessary audio nodes ---
    this.presetGain = new Tone.Gain(options.gain || 1.0);

    // --- Vibrato LFO and frequency modulation ---
    this.vibratoLFO = new Tone.LFO(0, 0);
    this.vibratoDepth = new Tone.Scale(-1, 1);
    this.vibratoGain = new Tone.Gain(0);

    // Connect vibrato chain: LFO -> Scale -> Gain -> Oscillator frequency
    this.vibratoLFO.connect(this.vibratoDepth);
    this.vibratoDepth.connect(this.vibratoGain);
    this.vibratoGain.connect(this.oscillator.frequency);

    // --- Tremolo LFO and amplitude modulation ---
    this.tremoloLFO = new Tone.LFO(0, 0);
    this.tremoloDepth = new Tone.Scale(0, 1);
    this.tremoloGain = new Tone.Gain(1);

    // Connect tremolo chain: LFO -> Scale -> Gain
    this.tremoloLFO.connect(this.tremoloDepth);
    this.tremoloDepth.connect(this.tremoloGain.gain);

    // Filters for the three distinct paths
    this.hpFilter = new Tone.Filter({ type: 'highpass' });
    this.lpFilterForBP = new Tone.Filter({ type: 'lowpass' });
    this.lpFilterSolo = new Tone.Filter({ type: 'lowpass' });

    // Gain nodes to tap the audio from different points in the chain
    this.hpOutput = new Tone.Gain();
    this.bpOutput = new Tone.Gain();
    this.lpOutput = new Tone.Gain();

    // Cross-faders to blend between the three outputs
    this.hp_bp_fade = new Tone.CrossFade(0);
    this.main_fade = new Tone.CrossFade(0);

    // Wet/Dry control for filter bypass
    this.wetDryFade = new Tone.CrossFade(0);

    // --- Audio Routing ---
    // 1. Oscillator -> Preset Gain Node
    this.oscillator.connect(this.presetGain);

    // 2. Preset Gain -> Dry Path & Wet Path (start)
    this.presetGain.connect(this.wetDryFade.a); // Dry Path

    // 3. Setup Wet Path (now fed from presetGain)
    // A) High-Pass path
    this.presetGain.connect(this.hpFilter);
    this.hpFilter.connect(this.hpOutput);

    // B) Band-Pass path (HPF -> LPF in series)
    this.hpFilter.connect(this.lpFilterForBP);
    this.lpFilterForBP.connect(this.bpOutput);

    // C) Low-Pass path (a separate, parallel LPF)
    this.presetGain.connect(this.lpFilterSolo);
    this.lpFilterSolo.connect(this.lpOutput);

    // 4. Route the three paths into the blender
    this.hpOutput.connect(this.hp_bp_fade.a);
    this.bpOutput.connect(this.hp_bp_fade.b);
    this.lpOutput.connect(this.main_fade.b);
    this.hp_bp_fade.connect(this.main_fade.a);

    // 5. Connect the blended (wet) signal to the wet/dry fader
    this.main_fade.connect(this.wetDryFade.b);

    // 6. Apply tremolo gain to the signal before the envelope
    this.wetDryFade.connect(this.tremoloGain);

    // 7. Final output goes to the main amplitude envelope
    this.tremoloGain.connect(this.envelope);

    if (options.filter) {
      this._setFilter(options.filter);
    }

    if (options.vibrato) {
      this._setVibrato(options.vibrato);
    } else {
      this._setVibrato({ speed: 0, span: 0 });
    }

    if (options.tremelo) {
      this._setTremolo(options.tremelo);
    } else {
      this._setTremolo({ speed: 0, span: 0 });
    }
  }

  _setPresetGain(value: number): void {
    if (this.presetGain) {
      this.presetGain.gain.value = value;
    }
  }

  _setVibrato(params: VibratoParams, time = Tone.now()): void {
    if (!this.vibratoLFO || !this.vibratoGain) return;

    // Convert 0-100% speed to 0-16 Hz (linear mapping)
    const speedHz = (params.speed / 100) * 16;
    const rawContextState = ((Tone.getContext() as any)?.rawContext?.state ?? Tone.context.state) as string;
    const isAudioRunning = rawContextState === 'running';

    // If speed is 0 or span is 0, disable vibrato completely
    if (params.speed === 0 || params.span === 0) {
      if (isAudioRunning && this.vibratoLFO.state === 'started') {
        this.vibratoLFO.stop(time);
      }
      this.vibratoLFO.frequency.value = 0;
      this.vibratoGain.gain.value = 0;
      return;
    }

    // Start LFO if it was stopped
    if (isAudioRunning && this.vibratoLFO.state !== 'started') {
      this.vibratoLFO.start(time);
    }

    this.vibratoLFO.frequency.value = speedHz;

    // Convert 0-100% span to proper Hz deviation
    // 100% span = ±50 cents maximum deviation
    const maxCents = 50;
    const centsAmplitude = (params.span / 100) * maxCents;

    // Convert cents to Hz deviation for frequency modulation
    const centRatio = centsAmplitude / 1200;
    const hzDeviationFactor = Math.pow(2, centRatio) - 1;

    // For vibrato, we need a reasonable Hz range. Using 440Hz as reference
    const referenceFreq = 440;
    const hzDeviation = referenceFreq * hzDeviationFactor;

    this.vibratoGain.gain.value = hzDeviation;
    voiceLogger?.debug('FilteredVoice', 'Vibrato gain set', { hzDeviation, centsAmplitude }, 'audio');
  }

  _setTremolo(params: TremoloParams, time = Tone.now()): void {
    if (!this.tremoloLFO || !this.tremoloGain) return;

    // Convert 0-100% speed to 0-16 Hz (linear mapping)
    const speedHz = (params.speed / 100) * 16;
    const rawContextState = ((Tone.getContext() as any)?.rawContext?.state ?? Tone.context.state) as string;
    const isAudioRunning = rawContextState === 'running';

    // If speed is 0 or span is 0, disable tremolo completely
    if (params.speed === 0 || params.span === 0) {
      if (isAudioRunning && this.tremoloLFO.state === 'started') {
        this.tremoloLFO.stop(time);
      }
      this.tremoloLFO.frequency.value = 0;
      this.tremoloGain.gain.cancelScheduledValues(time);
      this.tremoloGain.gain.value = 1.0;
      return;
    }

    // Start LFO if it was stopped
    if (isAudioRunning && this.tremoloLFO.state !== 'started') {
      this.tremoloLFO.start(time);
    }

    this.tremoloLFO.frequency.value = speedHz;

    // Convert 0-100% span to amplitude modulation depth
    const spanAmount = params.span / 100;

    // Set tremolo depth scale to modulate from (1 - span) to 1.0
    const minGain = Math.max(0, 1 - spanAmount);
    const maxGain = 1.0;

    this.tremoloDepth.min = minGain;
    this.tremoloDepth.max = maxGain;
  }

  _setFilter(params: FilterParams): void {
    this.wetDryFade.fade.value = params.enabled ? 1 : 0;

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
