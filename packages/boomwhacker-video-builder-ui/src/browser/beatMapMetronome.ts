export interface MetronomeBeat {
  timeSec: number;
  accent: boolean;
}

interface MetronomePlaybackOptions {
  audioBuffer: AudioBuffer | null;
  beats: MetronomeBeat[];
  startTimeSec: number;
  endTimeSec: number;
  audioVolume: number;
  clickVolume: number;
}

const LOOKAHEAD_SEC = 0.15;
const START_DELAY_SEC = 0.03;
const SCHEDULER_INTERVAL_MS = 25;

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const Constructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  return Constructor ? new Constructor() : null;
}

function clampVolume(volume: number): number {
  return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;
}

/** The source audio and beat clicks share an AudioContext and a start anchor. */
export class BeatMapMetronome {
  private context: AudioContext | null = null;
  private audioGain: GainNode | null = null;
  private clickGain: GainNode | null = null;
  private clickBuffer: AudioBuffer | null = null;
  private accentBuffer: AudioBuffer | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private options: MetronomePlaybackOptions | null = null;
  private contextStartSec = 0;
  private nextBeatIndex = 0;
  private generation = 0;

  constructor(private readonly contextFactory = createAudioContext) {}

  get isPlaying(): boolean { return this.options !== null; }

  getCurrentTime(): number {
    if (!this.context || !this.options) return 0;
    return Math.min(this.options.endTimeSec, this.options.startTimeSec
      + Math.max(0, this.context.currentTime - this.contextStartSec));
  }

  setAudioVolume(volume: number): void {
    if (this.audioGain) this.audioGain.gain.value = clampVolume(volume);
  }

  setClickVolume(volume: number): void {
    if (this.clickGain) this.clickGain.gain.value = clampVolume(volume);
  }

  async start(options: MetronomePlaybackOptions): Promise<void> {
    this.stop();
    const generation = this.generation;
    this.context ??= this.contextFactory();
    const context = this.context;
    if (!context) throw new Error('Web Audio is unavailable for the beat-map metronome.');
    if (context.state === 'suspended') await context.resume();
    if (generation !== this.generation) return;
    if (context.state !== 'running') throw new Error('Could not start the beat-map metronome audio context.');

    this.audioGain ??= context.createGain();
    this.clickGain ??= context.createGain();
    this.audioGain.disconnect();
    this.clickGain.disconnect();
    this.audioGain.connect(context.destination);
    this.clickGain.connect(context.destination);
    this.setAudioVolume(options.audioVolume);
    this.setClickVolume(options.clickVolume);
    this.clickBuffer ??= this.createClickBuffer(1100);
    this.accentBuffer ??= this.createClickBuffer(1600);
    this.options = options;
    this.contextStartSec = context.currentTime + START_DELAY_SEC;
    this.nextBeatIndex = options.beats.findIndex(beat => beat.timeSec >= options.startTimeSec - 1e-6);
    if (this.nextBeatIndex < 0) this.nextBeatIndex = options.beats.length;

    const offset = Math.max(0, options.startTimeSec);
    if (options.audioBuffer && offset < options.audioBuffer.duration) {
      const source = this.createSource(options.audioBuffer, this.audioGain);
      source.start(this.contextStartSec + Math.max(0, -options.startTimeSec), offset);
    }
    this.scheduleClicks();
    this.interval = setInterval(() => this.scheduleClicks(), SCHEDULER_INTERVAL_MS);
  }

  stop(): void {
    this.generation++;
    this.options = null;
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
    for (const source of this.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* A source may already have ended. */ }
      source.disconnect();
    }
    this.sources.clear();
  }

  dispose(): void {
    this.stop();
    this.audioGain?.disconnect();
    this.clickGain?.disconnect();
    void this.context?.close();
    this.context = null;
    this.audioGain = null;
    this.clickGain = null;
    this.clickBuffer = null;
    this.accentBuffer = null;
  }

  private createClickBuffer(frequency: number): AudioBuffer {
    const context = this.context!;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.035), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++) {
      const time = index / context.sampleRate;
      data[index] = 0.7 * Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time / 0.006);
    }
    return buffer;
  }

  private createSource(buffer: AudioBuffer, gain: GainNode): AudioBufferSourceNode {
    const source = this.context!.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    return source;
  }

  private scheduleClicks(): void {
    const context = this.context;
    const options = this.options;
    if (!context || !options || !this.clickGain) return;
    const now = context.currentTime;
    while (this.nextBeatIndex < options.beats.length) {
      const beat = options.beats[this.nextBeatIndex];
      const when = this.contextStartSec + beat.timeSec - options.startTimeSec;
      if (when > now + LOOKAHEAD_SEC) break;
      this.nextBeatIndex++;
      if (when < now - 0.02 || beat.timeSec >= options.endTimeSec) continue;
      const source = this.createSource((beat.accent ? this.accentBuffer : this.clickBuffer)!, this.clickGain);
      source.start(Math.max(now, when));
    }
  }
}
