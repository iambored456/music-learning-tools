import * as Tone from 'tone';
import { getLocalDrumSampleById } from '@mlt/audio-samples/local-samples';
import {
  TANPURA_SAMPLE_URL, getTanpuraFilterFrequencyFromTuning, getTanpuraFilterQFromTuning,
  getTanpuraTremoloDepthFromTuning, getTanpuraTremoloFrequencyFromTuning,
  getTanpuraPlaybackRateForTuning, getTanpuraStringSemitoneOffset,
  type DroneEngine,
} from '@mlt/tanpura-drone';
import { appState } from '../stores/appState.svelte.js';
import { getAudioMasterOutput, type AudioMasterChannel } from './audioMixer.js';

/** Isolated audition nodes: stopping a preview never stops an exercise or drone. */
export class AudioPreview {
  private nodes: Array<{ dispose(): unknown }> = [];
  private sustainedSynths: Tone.Synth[] = [];
  private sustainedPlayers: Tone.Player[] = [];
  private releaseDelayMs = 0;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelled = false;

  private own<T extends { dispose(): unknown }>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  private createSynth(
    channel: 'synth' | 'droneSynth',
    drone: boolean,
    sustained = false,
  ): Tone.Synth {
    return this.own(new Tone.Synth({
      oscillator: { type: drone ? 'sawtooth' : 'triangle' },
      envelope: drone
        ? {
            attack: sustained ? 0.02 : 0.3,
            decay: 0.1,
            sustain: 0.8,
            release: sustained ? 0.04 : 0.5,
          }
        : {
            attack: sustained ? 0.02 : 0.01,
            decay: 0.05,
            sustain: 0.75,
            release: sustained ? 0.04 : 0.03,
          },
      volume: drone ? appState.state.drone.volume + 20 * Math.log10(0.5) : -15,
    }).connect(getAudioMasterOutput(channel)));
  }

  /** Starts a triangle pitch that lasts until this preview is disposed. */
  async startSustainedTriangle(midi: number): Promise<void> {
    await Tone.start();
    if (this.cancelled) return;
    const synth = this.createSynth('synth', false, true);
    this.sustainedSynths.push(synth);
    this.releaseDelayMs = Math.max(this.releaseDelayMs, 60);
    synth.triggerAttack(440 * 2 ** ((midi - 69) / 12));
  }

  /** Starts the selected kind of drone and keeps it isolated from the latched drone control. */
  async startSustainedDrone(engine: DroneEngine, midi: number): Promise<void> {
    await Tone.start();
    if (this.cancelled) return;
    if (engine === 'synth') {
      const synth = this.createSynth('droneSynth', true, true);
      this.sustainedSynths.push(synth);
      this.releaseDelayMs = Math.max(this.releaseDelayMs, 60);
      const fineTune = appState.state.drone.tuning.fineTuneCents;
      synth.triggerAttack(440 * 2 ** ((midi - 69) / 12 + fineTune / 1200));
      return;
    }
    await this.playTanpura(midi, getAudioMasterOutput('tanpura'), true);
  }

  /** Starts after a user gesture and returns the preview duration in milliseconds. */
  async play(channel: AudioMasterChannel, midi: number): Promise<number> {
    await Tone.start();
    if (this.cancelled) return 0;
    const output = getAudioMasterOutput(channel);
    if (channel === 'synth' || channel === 'droneSynth') {
      const drone = channel === 'droneSynth';
      const synth = this.createSynth(channel, drone);
      const fineTune = drone ? appState.state.drone.tuning.fineTuneCents : 0;
      synth.triggerAttackRelease(440 * 2 ** ((midi - 69) / 12 + fineTune / 1200), 2, Tone.now());
      return drone ? 2700 : 2300;
    }
    if (channel === 'tanpura') return this.playTanpura(midi, output);

    const regularId = channel === 'bassDrum'
      ? 'roland-tr-33-roland-tr-33-kick' : 'linn-lm-1-linndrum-linndrum-congah';
    const volume = channel === 'bassDrum' ? -10 : 20 * Math.log10(0.72);
    const regular = this.own(new Tone.Player({ volume }).connect(output));
    const accent = channel === 'countIn' ? this.own(new Tone.Player({ volume }).connect(output)) : null;
    await Promise.all([
      regular.load(getLocalDrumSampleById(regularId)!.url),
      accent?.load(getLocalDrumSampleById('linn-lm-1-linndrum-linndrum-congahh')!.url),
    ]);
    if (this.cancelled) return 0;
    const now = Tone.now();
    if (accent) {
      // Audition the same four sounds as the solfege count-in, at 80 BPM.
      for (let beat = 0; beat < 4; beat++) (beat === 3 ? accent : regular).start(now + beat * 0.75);
      return 3300;
    }
    regular.start(now);
    return 1500;
  }

  private async playTanpura(midi: number, output: Tone.Gain, sustained = false): Promise<number> {
    const { tuning, strings, volume } = appState.state.drone;
    // Match the drone's six-string mix, filtering, modulation and base gain.
    const gain = this.own(new Tone.Gain(Tone.dbToGain(Math.min(volume + 9, 0))).connect(output));
    const tremolo = this.own(new Tone.Tremolo({
      frequency: getTanpuraTremoloFrequencyFromTuning(tuning),
      depth: getTanpuraTremoloDepthFromTuning(tuning), spread: 80,
    }).connect(gain).start());
    const filter = this.own(new Tone.Filter({
      type: 'lowpass', frequency: getTanpuraFilterFrequencyFromTuning(tuning),
      Q: getTanpuraFilterQFromTuning(tuning), rolloff: -24,
    }).connect(tremolo));
    const voices = strings.map((string, index) => {
      const voiceGain = this.own(new Tone.Gain(string.enabled ? 0.22 * Tone.dbToGain(string.gainDb) : 0).connect(filter));
      const player = this.own(new Tone.Player({ loop: true, fadeIn: 0.08, fadeOut: 0.16 }).connect(voiceGain));
      player.playbackRate = getTanpuraPlaybackRateForTuning(midi + getTanpuraStringSemitoneOffset(string.noteIndex), {
        ...tuning,
        fineTuneCents: tuning.fineTuneCents + string.fineTuneCents + string.ultraFineTuneCents / 100,
        variance: Math.max(0, Math.min(100, (tuning.variance + string.variance) / 2)),
      }, Tone.now() * 0.18 + index * 0.11);
      return player;
    });
    await Promise.all(voices.map(player => player.load(TANPURA_SAMPLE_URL)));
    if (this.cancelled) return 0;
    const now = Tone.now();
    const offsets = [0, 0.28, 0.58, 0.46, 0.8, 0.12];
    voices.forEach((player, index) => {
      if (!strings[index]?.enabled) return;
      player.start(now + (offsets[index] ?? index * 0.12));
      if (sustained) this.sustainedPlayers.push(player);
    });
    if (sustained) this.releaseDelayMs = Math.max(this.releaseDelayMs, 180);
    return 5000;
  }

  private disposeNodes(): void {
    if (this.releaseTimer !== null) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    this.sustainedSynths = [];
    this.sustainedPlayers = [];
    this.releaseDelayMs = 0;
    for (const node of this.nodes.reverse()) node.dispose();
    this.nodes = [];
  }

  /** Stop a held audition with a short envelope fade, then dispose its private nodes. */
  release(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    for (const synth of this.sustainedSynths) synth.triggerRelease();
    for (const player of this.sustainedPlayers) player.stop();
    if (this.releaseDelayMs <= 0) {
      this.disposeNodes();
      return;
    }
    this.releaseTimer = setTimeout(() => this.disposeNodes(), this.releaseDelayMs);
  }

  dispose(): void {
    this.cancelled = true;
    this.disposeNodes();
  }
}
