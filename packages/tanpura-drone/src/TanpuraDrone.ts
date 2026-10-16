import { TANPURA_SAMPLE_URL } from './tanpuraSample';
import {
  DEFAULT_TANPURA_STRING_BEHAVIORS, DEFAULT_TANPURA_TUNING_BEHAVIOR,
  getTanpuraFilterFrequencyFromTuning, getTanpuraFilterQFromTuning,
  getTanpuraPlaybackRateForTuning, getTanpuraStringSemitoneOffset,
  getTanpuraTremoloDepthFromTuning, getTanpuraTremoloFrequencyFromTuning,
} from './tuningBehavior';

// Match Singing Trainer's six-string mix and staggered attacks.
const START_OFFSETS = [0, 0.28, 0.58, 0.46, 0.8, 0.12] as const;
const PLAYBACK_RANGE = { baseMidi: 48, minRate: 0.125, maxRate: 8 };
type SampleLoader = (context: AudioContext) => Promise<AudioBuffer>;

async function loadSample(context: AudioContext): Promise<AudioBuffer> {
  const response = await fetch(TANPURA_SAMPLE_URL);
  if (!response.ok) throw new Error('The tanpura drone could not load. Please try again.');
  return context.decodeAudioData(await response.arrayBuffer());
}

/** Tanpura playback in a caller-owned, user-unlocked Web Audio context. */
export class TanpuraDrone {
  private buffer: AudioBuffer | null = null;
  private loading: Promise<void> | null = null;
  private disposed = false;
  private voices: AudioBufferSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private tremolo: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private midi: number | null = null;

  constructor(private context: AudioContext, private output: AudioNode, private loader: SampleLoader = loadSample) {}

  /** Loading never starts playback; concurrent unlocks share one decoded sample. */
  prepare(): Promise<void> {
    if (this.disposed || this.buffer) return Promise.resolve();
    if (!this.loading) {
      this.loading = this.loader(this.context).then(buffer => {
        if (!this.disposed) this.buffer = buffer;
      }).finally(() => { this.loading = null; });
    }
    return this.loading;
  }

  private own<T extends AudioNode>(node: T): T { this.nodes.push(node); return node; }

  set(midi: number | null, volume: number): void {
    if (this.disposed) return;
    if (midi === null || !Number.isFinite(midi) || !Number.isFinite(volume) || volume <= 0) { this.stop(); return; }
    if (!this.buffer) throw new Error('Load the tanpura drone before starting playback.');
    const now = this.context.currentTime, tuning = DEFAULT_TANPURA_TUNING_BEHAVIOR;
    const level = Math.min(1, volume) * 0.4;
    if (!this.gain) {
      this.gain = this.own(this.context.createGain());
      this.gain.gain.setValueAtTime(0, now);
      this.gain.connect(this.output);

      const modulation = this.own(this.context.createGain());
      const depth = getTanpuraTremoloDepthFromTuning(tuning);
      modulation.gain.value = 1 - depth / 2;
      modulation.connect(this.gain);
      this.tremolo = this.own(this.context.createOscillator());
      this.tremolo.frequency.value = getTanpuraTremoloFrequencyFromTuning(tuning);
      const modulationDepth = this.own(this.context.createGain());
      modulationDepth.gain.value = depth / 2;
      this.tremolo.connect(modulationDepth); modulationDepth.connect(modulation.gain);
      this.tremolo.start(now);

      // Two low-pass stages provide the same 24 dB/octave rolloff.
      const filters = [0, 1].map(() => {
        const filter = this.own(this.context.createBiquadFilter());
        filter.type = 'lowpass';
        filter.frequency.value = getTanpuraFilterFrequencyFromTuning(tuning);
        filter.Q.value = getTanpuraFilterQFromTuning(tuning);
        return filter;
      });
      filters[0].connect(filters[1]); filters[1].connect(modulation);
      this.voices = DEFAULT_TANPURA_STRING_BEHAVIORS.map((string, index) => {
        const voice = this.own(this.context.createBufferSource());
        voice.buffer = this.buffer; voice.loop = true;
        const gain = this.own(this.context.createGain());
        gain.gain.value = string.enabled ? 0.22 * 10 ** (string.gainDb / 20) : 0;
        voice.connect(gain); gain.connect(filters[0]);
        return voice;
      });
      this.retune(midi);
      this.voices.forEach((voice, index) => voice.start(now + START_OFFSETS[index]));
    } else if (midi !== this.midi) this.retune(midi);
    this.midi = midi;
    this.gain.gain.setTargetAtTime(level, now, 0.04);
  }

  private retune(midi: number) {
    const tuning = DEFAULT_TANPURA_TUNING_BEHAVIOR, now = this.context.currentTime;
    this.voices.forEach((voice, index) => {
      const string = DEFAULT_TANPURA_STRING_BEHAVIORS[index];
      const rate = getTanpuraPlaybackRateForTuning(midi + getTanpuraStringSemitoneOffset(string.noteIndex), {
        ...tuning,
        fineTuneCents: tuning.fineTuneCents + string.fineTuneCents + string.ultraFineTuneCents / 100,
        variance: (tuning.variance + string.variance) / 2,
      }, now * 0.18 + index * 0.11, PLAYBACK_RANGE);
      voice.playbackRate.setValueAtTime(rate, now);
    });
  }

  stop(): void {
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already stopped. */ } }
    try { this.tremolo?.stop(); } catch { /* Already stopped. */ }
    for (const node of this.nodes) node.disconnect();
    this.voices = []; this.nodes = []; this.gain = null; this.tremolo = null; this.midi = null;
  }

  dispose(): void { this.stop(); this.disposed = true; this.buffer = null; }
}
