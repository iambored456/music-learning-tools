import * as Tone from 'tone';
import { getLocalDrumSampleById } from '../../audio-samples/dist/localDrumSamples.js';

import { BLOCK_MICROBEAT_CAPACITIES, MAIN_PLAYBACK_SYNTH_PROFILE } from './constants.js';
import type { BoomwhackerSketchpadModel } from './model.js';
import type { NoteData, PlaybackTick } from './types.js';

const COUNT_IN_REGULAR_SAMPLE_IDS = [
  'linn-lm-1-linndrum-linndrum-congah',
  'linn-lm-1-linndrum-linndrum-conga',
  'alesis-hr16a-alesis-hr16a-18',
  'kr-33-kr-33-cow',
] as const;

const COUNT_IN_ACCENT_SAMPLE_IDS = [
  'linn-lm-1-linndrum-linndrum-congahh',
  'linn-lm-1-linndrum-linndrum-congah',
  'kr-33-kr-33-cow',
  'alesis-hr16a-alesis-hr16a-18',
] as const;

const MACROBEAT_METRONOME_SAMPLE_IDS = [
  'linn-lm-1-linndrum-linndrum-cowb',
  'kr-33-kr-33-cow',
  'linn-lm-1-linndrum-linndrum-congahh',
] as const;

const SUPPLEMENTAL_NOTE_SAMPLE_IDS = [
  'roland-tr-909-roland-tr-909-handclp2',
  'roland-tr-909-roland-tr-909-st3t0s3',
  'kpr-series-kprlotom',
  'roland-tr-909-roland-tr-909-hhcd4',
  'generic-percussion-tamb-1',
] as const;

function firstAvailableDrumSampleUrl(sampleIds: readonly string[]): string | null {
  return sampleIds.map((sampleId) => getLocalDrumSampleById(sampleId)?.url ?? null).find(Boolean) ?? null;
}

const COUNT_IN_SAMPLE_URL = firstAvailableDrumSampleUrl(COUNT_IN_REGULAR_SAMPLE_IDS);
const COUNT_IN_ACCENT_SAMPLE_URL = firstAvailableDrumSampleUrl(COUNT_IN_ACCENT_SAMPLE_IDS) ?? COUNT_IN_SAMPLE_URL;
const MACROBEAT_METRONOME_SAMPLE_URL =
  firstAvailableDrumSampleUrl(MACROBEAT_METRONOME_SAMPLE_IDS) ?? COUNT_IN_ACCENT_SAMPLE_URL ?? COUNT_IN_SAMPLE_URL;
const DEFAULT_METRONOME_VOLUME = 0.72;

export type AudioCallbacks = {
  onPlaybackTick?: (tick: PlaybackTick) => void;
  onPlaybackStop?: () => void;
  onPlaybackComplete?: () => void;
};

export class BoomwhackerSketchpadAudioEngine {
  private initialized = false;

  private readonly scheduledEventIds: number[] = [];

  private mainSynth: Tone.PolySynth | null = null;

  private masterVolumeNode: Tone.Volume | null = null;

  private metronomeVolumeNode: Tone.Volume | null = null;

  private metronomePlayers: Tone.Players | null = null;

  private supplementalNotePlayers: Tone.Players | null = null;

  private droneVolumeNode: Tone.Volume | null = null;

  private momentaryDroneVolumeNode: Tone.Volume | null = null;

  private droneOsc: Tone.Oscillator | null = null;

  private momentaryDroneOsc: Tone.Oscillator | null = null;

  private callbacks: AudioCallbacks;

  private currentPlaybackMicrobeatGlobal = -1;

  private totalMicrobeatsInScoreForPlayback = 0;

  private metronomeVolumeLevel = DEFAULT_METRONOME_VOLUME;

  constructor(private readonly model: BoomwhackerSketchpadModel, callbacks: AudioCallbacks = {}) {
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: AudioCallbacks): void {
    this.callbacks = callbacks;
  }

  async start(): Promise<boolean> {
    await Tone.start();
    return this.initialize();
  }

  async initialize(): Promise<boolean> {
    if (this.initialized && this.isReady()) {
      return true;
    }

    if (!Tone.context || Tone.context.state !== 'running') {
      return false;
    }

    try {
      const state = this.model.getState();

      this.masterVolumeNode = new Tone.Volume(Tone.gainToDb(state.mainVolume)).toDestination();
      this.mainSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: MAIN_PLAYBACK_SYNTH_PROFILE.oscillatorType },
        envelope: MAIN_PLAYBACK_SYNTH_PROFILE.envelope,
      }).connect(this.masterVolumeNode);
      this.mainSynth.maxPolyphony = 12;

      this.metronomeVolumeNode = new Tone.Volume(Tone.gainToDb(this.metronomeVolumeLevel)).connect(this.masterVolumeNode);

      if (COUNT_IN_SAMPLE_URL || COUNT_IN_ACCENT_SAMPLE_URL || MACROBEAT_METRONOME_SAMPLE_URL) {
        try {
          const cueUrl = (COUNT_IN_SAMPLE_URL ?? COUNT_IN_ACCENT_SAMPLE_URL ?? MACROBEAT_METRONOME_SAMPLE_URL)!;
          const cueAccentUrl = COUNT_IN_ACCENT_SAMPLE_URL ?? cueUrl;
          const macrobeatUrl = MACROBEAT_METRONOME_SAMPLE_URL ?? cueAccentUrl ?? cueUrl;
          const playerUrls: Record<string, string> = {
            cue: cueUrl,
            cueAccent: cueAccentUrl,
            macrobeat: macrobeatUrl,
          };

          this.metronomePlayers = new Tone.Players(playerUrls).connect(this.metronomeVolumeNode);
          await this.metronomePlayers.loaded;
          this.metronomePlayers.player('cue')!.playbackRate = 1;
          this.metronomePlayers.player('cueAccent')!.playbackRate =
            COUNT_IN_ACCENT_SAMPLE_URL === COUNT_IN_SAMPLE_URL ? 1.18 : 1;
          this.metronomePlayers.player('macrobeat')!.playbackRate = 1;
        } catch {
          this.metronomePlayers?.dispose();
          this.metronomePlayers = null;
        }
      }

      const supplementalNotePlayerUrls = Object.fromEntries(
        SUPPLEMENTAL_NOTE_SAMPLE_IDS.flatMap((sampleId) => {
          const sampleUrl = getLocalDrumSampleById(sampleId)?.url;
          return sampleUrl ? [[sampleId, sampleUrl]] : [];
        }),
      );

      if (Object.keys(supplementalNotePlayerUrls).length > 0) {
        try {
          this.supplementalNotePlayers = new Tone.Players(supplementalNotePlayerUrls).connect(this.masterVolumeNode);
          await this.supplementalNotePlayers.loaded;
        } catch {
          this.supplementalNotePlayers?.dispose();
          this.supplementalNotePlayers = null;
        }
      }

      this.droneVolumeNode = new Tone.Volume(Tone.gainToDb(state.droneVolume)).connect(this.masterVolumeNode);
      this.momentaryDroneVolumeNode = new Tone.Volume(Tone.gainToDb(state.droneVolume)).connect(this.masterVolumeNode);

      Tone.Transport.loop = false;
      Tone.Transport.bpm.value = state.microbeatTempo / 2;

      this.initialized = true;

      this.setMainVoiceType(state.mainPlaybackVoice);
      this.setDroneVoiceType(state.droneVoice);
      this.updateRootNoteFrequency();

      if (state.droneIsOn) {
        this.toggleMainDrone(true);
      }

      return true;
    } catch {
      this.initialized = false;
      return false;
    }
  }

  dispose(): void {
    this.stopTransport();

    this.stopAndDisposeDroneOsc();
    this.stopAndDisposeMomentaryDroneOsc();

    this.mainSynth?.dispose();
    this.masterVolumeNode?.dispose();
    this.metronomeVolumeNode?.dispose();
    this.metronomePlayers?.dispose();
    this.supplementalNotePlayers?.dispose();
    this.droneVolumeNode?.dispose();
    this.momentaryDroneVolumeNode?.dispose();

    this.mainSynth = null;
    this.masterVolumeNode = null;
    this.metronomeVolumeNode = null;
    this.metronomePlayers = null;
    this.supplementalNotePlayers = null;
    this.droneVolumeNode = null;
    this.momentaryDroneVolumeNode = null;

    this.initialized = false;
  }

  isReady(): boolean {
    return this.initialized && Boolean(Tone.context) && Tone.context.state === 'running';
  }

  isPlaying(): boolean {
    return this.isReady() && Tone.Transport.state === 'started';
  }

  getCurrentPlaybackMicrobeatGlobal(): number {
    return this.currentPlaybackMicrobeatGlobal;
  }

  getTotalMicrobeatsForPlayback(): number {
    return this.totalMicrobeatsInScoreForPlayback;
  }

  setMainVoiceType(type: OscillatorType): void {
    if (!this.isReady() || !this.mainSynth) return;
    this.mainSynth.set({ oscillator: { type } });
  }

  setDroneVoiceType(type: OscillatorType): void {
    if (!this.isReady()) return;

    if (this.droneOsc) {
      this.droneOsc.type = type;
    }

    if (this.momentaryDroneOsc) {
      this.momentaryDroneOsc.type = type;
    }
  }

  setMainVolume(level0to1: number): void {
    if (!this.isReady() || !this.masterVolumeNode) return;
    this.masterVolumeNode.volume.linearRampToValueAtTime(Tone.gainToDb(level0to1), Tone.now() + 0.02);
  }

  setMetronomeVolume(level0to1: number): void {
    const clamped = Math.max(0, Math.min(1, level0to1));
    this.metronomeVolumeLevel = clamped;

    if (!this.metronomeVolumeNode) return;
    this.metronomeVolumeNode.volume.linearRampToValueAtTime(Tone.gainToDb(clamped), Tone.now() + 0.02);
  }

  setDroneVolume(level0to1: number): void {
    if (!this.isReady()) return;

    const dbValue = Tone.gainToDb(level0to1);
    this.droneVolumeNode?.volume.linearRampToValueAtTime(dbValue, Tone.now() + 0.02);
    this.momentaryDroneVolumeNode?.volume.linearRampToValueAtTime(dbValue, Tone.now() + 0.02);
  }

  setTempo(microbeatTempo: number): void {
    if (!this.isReady()) return;
    Tone.Transport.bpm.value = microbeatTempo / 2;
  }

  updateRootNoteFrequency(): void {
    if (!this.isReady()) return;

    const rootNote = this.model.getFullRootNote();

    try {
      const frequency = Tone.Frequency(rootNote).toFrequency();
      if (this.droneOsc) {
        this.droneOsc.frequency.rampTo(frequency, 0.05);
      }

      if (this.momentaryDroneOsc) {
        this.momentaryDroneOsc.frequency.rampTo(frequency, 0.05);
      }
    } catch {
      // Ignore invalid pitch parse errors.
    }
  }

  toggleMainDrone(isOn: boolean): void {
    if (!this.isReady()) return;

    if (isOn) {
      const state = this.model.getState();
      const osc = this.ensureDroneOscillator(state.droneVoice);
      if (osc.state !== 'started') {
        osc.start(Tone.now());
      }
      return;
    }

    this.stopAndDisposeDroneOsc();
  }

  triggerMomentaryDrone(start: boolean): void {
    if (!this.isReady()) return;

    const state = this.model.getState();

    if (start) {
      const osc = this.ensureMomentaryDroneOscillator(state.droneVoice);
      if (osc.state !== 'started') {
        osc.start(Tone.now());
      }
      return;
    }

    this.stopAndDisposeMomentaryDroneOsc();
  }

  playNoteNow(pitchString: string, duration: Tone.Unit.Time = '8n'): void {
    if (!this.isReady() || !this.mainSynth) return;

    try {
      this.mainSynth.set({ oscillator: { type: this.model.getMainPlaybackVoice() } });
      this.mainSynth.triggerAttackRelease(pitchString, duration, Tone.now());
    } catch {
      // Ignore invalid note playback requests.
    }
  }

  playCountInCueNow(accented = false): boolean {
    if (!this.isReady() || !this.metronomePlayers?.loaded) return false;

    try {
      this.metronomePlayers.player(accented ? 'cueAccent' : 'cue')?.start(Tone.now());
      return true;
    } catch {
      return false;
    }
  }

  playMacrobeatCueNow(): boolean {
    if (!this.isReady() || !this.metronomePlayers?.loaded) return false;

    try {
      this.metronomePlayers.player('macrobeat')?.start(Tone.now());
      return true;
    } catch {
      return false;
    }
  }

  playSampleNow(sampleId: string): boolean {
    if (!this.isReady() || !this.supplementalNotePlayers?.loaded) return false;

    try {
      this.supplementalNotePlayers.player(sampleId)?.start(Tone.now());
      return true;
    } catch {
      return false;
    }
  }

  playTransport(): boolean {
    if (!this.isReady()) return false;

    if (Tone.Transport.state === 'paused') {
      Tone.Transport.start(Tone.now() + 0.05);
      return true;
    }

    if (Tone.Transport.state === 'started') {
      return true;
    }

    this.scheduleScore();

    if (this.totalMicrobeatsInScoreForPlayback === 0) {
      this.callbacks.onPlaybackStop?.();
      return false;
    }

    Tone.Transport.start(Tone.now() + 0.05);
    return true;
  }

  pauseTransport(): void {
    if (!this.isReady() || !this.isPlaying()) return;
    Tone.Transport.pause();
  }

  stopTransport(): void {
    if (!this.isReady()) return;

    Tone.Transport.stop();
    Tone.Transport.position = 0;

    this.clearScheduledEvents();

    this.currentPlaybackMicrobeatGlobal = -1;
    this.callbacks.onPlaybackStop?.();
  }

  private ensureDroneOscillator(type: OscillatorType): Tone.Oscillator {
    if (this.droneOsc) {
      return this.droneOsc;
    }

    const rootFrequency = Tone.Frequency(this.model.getFullRootNote()).toFrequency();
    this.droneOsc = new Tone.Oscillator({
      type,
      frequency: rootFrequency,
    }).connect(this.droneVolumeNode ?? Tone.Destination);

    return this.droneOsc;
  }

  private ensureMomentaryDroneOscillator(type: OscillatorType): Tone.Oscillator {
    if (this.momentaryDroneOsc) {
      return this.momentaryDroneOsc;
    }

    const rootFrequency = Tone.Frequency(this.model.getFullRootNote()).toFrequency();
    this.momentaryDroneOsc = new Tone.Oscillator({
      type,
      frequency: rootFrequency,
    }).connect(this.momentaryDroneVolumeNode ?? Tone.Destination);

    return this.momentaryDroneOsc;
  }

  private stopAndDisposeDroneOsc(): void {
    if (!this.droneOsc) return;

    try {
      if (this.droneOsc.state === 'started') {
        this.droneOsc.stop(Tone.now());
      }
    } catch {
      // Ignore shutdown errors.
    }

    this.droneOsc.dispose();
    this.droneOsc = null;
  }

  private stopAndDisposeMomentaryDroneOsc(): void {
    if (!this.momentaryDroneOsc) return;

    try {
      if (this.momentaryDroneOsc.state === 'started') {
        this.momentaryDroneOsc.stop(Tone.now());
      }
    } catch {
      // Ignore shutdown errors.
    }

    this.momentaryDroneOsc.dispose();
    this.momentaryDroneOsc = null;
  }

  private clearScheduledEvents(): void {
    for (const eventId of this.scheduledEventIds) {
      Tone.Transport.clear(eventId);
    }

    this.scheduledEventIds.length = 0;
    this.currentPlaybackMicrobeatGlobal = -1;
  }

  private scheduleScore(): void {
    if (!this.isReady() || !this.mainSynth) return;

    this.clearScheduledEvents();

    const state = this.model.getState();
    const scoreData = state.scoreData;
    const rootNote = this.model.getFullRootNote();

    let currentMicrobeatOffset = 0;
    let microbeatGlobalIndex = 0;

    this.totalMicrobeatsInScoreForPlayback = 0;

    for (let rowIndex = 0; rowIndex < state.visibleRowsCount; rowIndex += 1) {
      const row = scoreData[rowIndex];
      if (!row || row.blocks.length === 0) {
        continue;
      }

      const sortedBlocks = [...row.blocks].sort((a, b) => a.position - b.position);
      let currentMicrobeatPositionInRow = 0;

      for (const block of sortedBlocks) {
        const gapMicrobeats = block.position - currentMicrobeatPositionInRow;
        if (gapMicrobeats > 0) {
          currentMicrobeatOffset += gapMicrobeats;
          microbeatGlobalIndex += gapMicrobeats;
          this.totalMicrobeatsInScoreForPlayback += gapMicrobeats;
        }

        const blockCapacity = BLOCK_MICROBEAT_CAPACITIES[block.type] ?? 0;

        for (let slotIndex = 0; slotIndex < blockCapacity; slotIndex += 1) {
          const noteData = block.notes[slotIndex];
          const scheduleTime = Tone.Time(`${currentMicrobeatOffset}*8n`).toSeconds();

          if (noteData) {
            const absolutePitch = this.calculateAbsolutePitch(rootNote, noteData);
            if (absolutePitch) {
              const noteEventId = Tone.Transport.scheduleOnce((audioTime) => {
                this.mainSynth?.triggerAttackRelease(absolutePitch, '8n', audioTime);
              }, scheduleTime);

              this.scheduledEventIds.push(noteEventId);
            }
          }

          const currentIndex = microbeatGlobalIndex;
          const tickEventId = Tone.Transport.scheduleOnce(() => {
            this.currentPlaybackMicrobeatGlobal = currentIndex;
            this.callbacks.onPlaybackTick?.({
              microbeatGlobalIndex: currentIndex,
              rowIndex,
              microbeatIndexInRow: block.position + slotIndex,
            });
          }, scheduleTime);

          this.scheduledEventIds.push(tickEventId);

          currentMicrobeatOffset += 1;
          microbeatGlobalIndex += 1;
          this.totalMicrobeatsInScoreForPlayback += 1;
        }

        currentMicrobeatPositionInRow = block.position + blockCapacity;
      }
    }

    if (this.totalMicrobeatsInScoreForPlayback === 0) {
      return;
    }

    const endTime = Tone.Time(`${currentMicrobeatOffset}*8n`).toSeconds();
    const endEventId = Tone.Transport.scheduleOnce(() => {
      if (Tone.Transport.state === 'started' && !Tone.Transport.loop) {
        const tailMs = Tone.Time('8n').toMilliseconds() * 0.8;
        window.setTimeout(() => {
          this.stopTransport();
          this.callbacks.onPlaybackComplete?.();
        }, tailMs);
      }
    }, endTime);

    this.scheduledEventIds.push(endEventId);
  }

  private calculateAbsolutePitch(rootNote: string, noteData: NoteData): string | null {
    try {
      const rootMidi = Tone.Frequency(rootNote).toMidi();
      const midi = rootMidi + noteData.pitchInterval;
      return Tone.Frequency(midi, 'midi').toNote();
    } catch {
      return null;
    }
  }
}

export function createBoomwhackerSketchpadAudioEngine(model: BoomwhackerSketchpadModel, callbacks: AudioCallbacks = {}): BoomwhackerSketchpadAudioEngine {
  return new BoomwhackerSketchpadAudioEngine(model, callbacks);
}
