import * as Tone from 'tone';
import logger from '@utils/logger.ts';

export interface FilteredVoiceOptions extends Tone.SynthOptions {
  filter?: any;
  vibrato?: { speed: number; span: number };
  tremelo?: { speed: number; span: number };
  gain?: number;
}

// A custom synth voice with a more sophisticated series/parallel filter blend
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
    this.presetGain = new Tone.Gain(options.gain || 1.0); // Gain node for preset volume compensation

    // --- Vibrato LFO and frequency modulation ---
    this.vibratoLFO = new Tone.LFO(0, 0); // Start with 0 rate and 0 depth
    this.vibratoDepth = new Tone.Scale(-1, 1); // Map LFO (-1 to +1) to -1 to +1 for bidirectional vibrato
    this.vibratoGain = new Tone.Gain(0); // Control vibrato intensity

    // Connect vibrato chain: LFO -> Scale -> Gain -> Oscillator frequency
    this.vibratoLFO.connect(this.vibratoDepth);
    this.vibratoDepth.connect(this.vibratoGain);
    this.vibratoGain.connect(this.oscillator.frequency);

    // --- Tremolo LFO and amplitude modulation ---
    this.tremoloLFO = new Tone.LFO(0, 0); // Start with 0 rate and 0 depth
    this.tremoloDepth = new Tone.Scale(0, 1); // Map LFO (-1 to +1) to (0 to 1) for amplitude modulation
    this.tremoloGain = new Tone.Gain(1); // Will be modulated by tremolo LFO

    // Connect tremolo chain: LFO -> Scale -> Gain
    this.tremoloLFO.connect(this.tremoloDepth);
    this.tremoloDepth.connect(this.tremoloGain.gain);

    // Don't start the LFOs automatically - they will be started only when effects are enabled
    // This saves CPU resources when effects are not in use

    // Filters for the three distinct paths
    this.hpFilter = new Tone.Filter({ type: 'highpass' });
    this.lpFilterForBP = new Tone.Filter({ type: 'lowpass' }); // This LPF is part of the bandpass chain
    this.lpFilterSolo = new Tone.Filter({ type: 'lowpass' }); // This LPF is for the pure lowpass sound

    // Gain nodes to tap the audio from different points in the chain
    this.hpOutput = new Tone.Gain();
    this.bpOutput = new Tone.Gain();
    this.lpOutput = new Tone.Gain();

    // Cross-faders to blend between the three outputs
    this.hp_bp_fade = new Tone.CrossFade(0);
    this.main_fade = new Tone.CrossFade(0);

    // Wet/Dry control for filter bypass
    this.wetDryFade = new Tone.CrossFade(0);

    // --- UPDATED Audio Routing ---
    // 1. Oscillator -> Preset Gain Node
    this.oscillator.connect(this.presetGain);

    // 2. Preset Gain -> Dry Path & Wet Path (start)
    this.presetGain.connect(this.wetDryFade.a); // Dry Path

    // 3. Setup Wet Path (now fed from presetGain)
    // A) High-Pass path
    this.presetGain.connect(this.hpFilter);
    this.hpFilter.connect(this.hpOutput); // Tap the pure HP signal here

    // B) Band-Pass path (HPF -> LPF in series)
    this.hpFilter.connect(this.lpFilterForBP);
    this.lpFilterForBP.connect(this.bpOutput); // Tap the BP signal here

    // C) Low-Pass path (a separate, parallel LPF)
    this.presetGain.connect(this.lpFilterSolo);
    this.lpFilterSolo.connect(this.lpOutput); // Tap the pure LP signal here

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
      // Initialize with default vibrato if not provided (disabled)
      this._setVibrato({ speed: 0, span: 0 });
    }

    if (options.tremelo) { // Note: using 'tremelo' spelling for consistency
      this._setTremolo(options.tremelo);
    } else {
      // Initialize with default tremolo if not provided (disabled)
      this._setTremolo({ speed: 0, span: 0 });
    }
  }

  _setPresetGain(value: number) {
    if (this.presetGain) {
      this.presetGain.gain.value = value;
    }
  }

  _setVibrato(params: { speed: number; span: number }, time = Tone.now()) {
    if (this.vibratoLFO && this.vibratoGain) {
      // Convert 0-100% speed to 0-16 Hz (linear mapping)
      const speedHz = (params.speed / 100) * 16;
      const rawContextState = ((Tone.getContext() as any)?.rawContext?.state ?? Tone.context.state) as string;
      const isAudioRunning = rawContextState === 'running';

      // If speed is 0 or span is 0, disable vibrato completely
      if (params.speed === 0 || params.span === 0) {
        // Avoid calling start/stop while the AudioContext is suspended (pre-user gesture).
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
      // 100% span = A,Añ50 cents maximum deviation
      const maxCents = 50; // Maximum A,Añ50 cents for 100% span
      const centsAmplitude = (params.span / 100) * maxCents;

      // Convert cents to Hz deviation for frequency modulation
      // For a note at frequency f, n cents deviation = f * (2^(n/1200) - 1)
      // Since we don't know the exact frequency, we'll use a scaling factor
      // 1 cent A›ƒ?øE+ 0.0578% frequency change, so 50 cents A›ƒ?øE+ 2.89%
      // For a 440Hz note: 50 cents A›ƒ?øE+ 12.7 Hz deviation
      // We'll use a ratio-based approach: cents/1200 gives us the semitone fraction
      const centRatio = centsAmplitude / 1200; // Convert cents to semitone fraction
      const hzDeviationFactor = Math.pow(2, centRatio) - 1; // Frequency multiplier for the cents

      // For vibrato, we need a reasonable Hz range. Using 440Hz as reference:
      const referenceFreq = 440; // A4 as reference
      const hzDeviation = referenceFreq * hzDeviationFactor;

      this.vibratoGain.gain.value = hzDeviation;
      logger.debug('SynthEngine', 'Audio vibrato gain set', { hzDeviation, centsAmplitude }, 'audio');

    }
  }

  _setTremolo(params: { speed: number; span: number }, time = Tone.now()) {
    if (this.tremoloLFO && this.tremoloGain) {
      // Convert 0-100% speed to 0-16 Hz (linear mapping)
      const speedHz = (params.speed / 100) * 16;
      const rawContextState = ((Tone.getContext() as any)?.rawContext?.state ?? Tone.context.state) as string;
      const isAudioRunning = rawContextState === 'running';

      // If speed is 0 or span is 0, disable tremolo completely
      if (params.speed === 0 || params.span === 0) {
        // Avoid calling start/stop while the AudioContext is suspended (pre-user gesture).
        if (isAudioRunning && this.tremoloLFO.state === 'started') {
          this.tremoloLFO.stop(time);
        }
        this.tremoloLFO.frequency.value = 0;
        // Reset gain to 1.0 (no attenuation)
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
      // 100% span means oscillating between 0% and 100% of original amplitude
      // 50% span means oscillating between 25% and 100% of original amplitude
      const spanAmount = params.span / 100; // 0 to 1

      // Set tremolo depth scale to modulate from (1 - span/2) to 1.0
      // This means the amplitude oscillates symmetrically around a center point
      const minGain = Math.max(0, 1 - spanAmount); // Never go below 0
      const maxGain = 1.0;

      // Configure the Scale node to map LFO output (-1 to +1) to (minGain to maxGain)
      this.tremoloDepth.min = minGain;
      this.tremoloDepth.max = maxGain;
    }
  }

  _setFilter(params: any) {
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
      this.main_fade.fade.value = 0; // Select the HP/BP fader
      this.hp_bp_fade.fade.value = blend;
    }
    // Blend from BP (1) -> LP (2)
    else {
      this.main_fade.fade.value = blend - 1.0;
      this.hp_bp_fade.fade.value = 1.0; // Keep the input to the main fader as pure BP
    }
  }
}
