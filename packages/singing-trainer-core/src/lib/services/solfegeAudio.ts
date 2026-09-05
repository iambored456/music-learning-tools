import * as Tone from 'tone';
import { getLocalDrumSampleById } from '@mlt/audio-samples/local-samples';
import type { SolfegeLine } from '../constants/ladukhin.js';
import { solfegeJustMidi } from './solfegeNotation.js';

/** A row owns its audio nodes, so stopping cancels even future scheduled sounds. */
export class SolfegeAudio {
  private synth: Tone.Synth | null = null;
  private drum: Tone.Player | null = null;
  private cancelled = false;
  private started = 0;

  async init(): Promise<void> {
    await Tone.start();
    if (this.cancelled) return;
    this.synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.75, release: 0.03 },
      volume: -15,
    }).toDestination();
    const drum = new Tone.Player({ volume: -10 }).toDestination();
    this.drum = drum;
    await drum.load(getLocalDrumSampleById('roland-tr-33-roland-tr-33-kick')!.url);
  }

  schedule(line: SolfegeLine, tonicMidi: number, bpm: number, countIn: number, melody: boolean, drums: boolean): void {
    if (this.cancelled) return;
    const secondsPerBeat = 60 / bpm;
    this.started = Tone.immediate() + 0.1;
    const origin = this.started + countIn * secondsPerBeat;
    this.setDrums(drums);
    for (const beat of line.barlines) {
      this.drum?.start(origin + beat * secondsPerBeat);
    }
    if (melody) {
      for (const note of line.notes) {
        if (note.midi === null) continue;
        const frequency = 440 * 2 ** ((solfegeJustMidi(note.midi, tonicMidi) - 69) / 12);
        this.synth?.triggerAttackRelease(frequency, Math.max(0.02, note.durationBeats * secondsPerBeat - 0.03), origin + note.beat * secondsPerBeat);
      }
    }
  }

  get elapsedSeconds(): number { return Tone.immediate() - this.started; }

  setDrums(enabled: boolean): void {
    if (this.drum) this.drum.mute = !enabled;
  }

  dispose(): void {
    this.cancelled = true;
    this.synth?.dispose();
    this.drum?.dispose();
    this.synth = null;
    this.drum = null;
  }
}
