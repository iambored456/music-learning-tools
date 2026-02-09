/**
 * Guide Voice Player
 *
 * Plays guide voice notes as synthesized tones during overdub exercises.
 * Uses Tone.js PolySynth with setTimeout scheduling to align with highway scroll.
 */

import * as Tone from 'tone';
import type { TargetNote } from '../stores/highwayState.svelte.js';

class GuideVoicePlayer {
  private synth: Tone.PolySynth | null = null;
  private volume: Tone.Volume | null = null;
  private scheduledTimeouts: number[] = [];
  private _isPlaying = false;

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  async init(): Promise<void> {
    await Tone.start();

    this.volume = new Tone.Volume(-6).toDestination();

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.8,
        release: 0.15,
      },
    }).connect(this.volume);

    this.synth.maxPolyphony = 8;
  }

  setVolume(dB: number): void {
    if (this.volume) {
      this.volume.volume.value = dB;
    }
  }

  /**
   * Schedule guide voice notes for playback.
   * Notes are played at their startTimeMs offset from now.
   */
  scheduleNotes(notes: TargetNote[]): void {
    if (!this.synth) {
      console.warn('[GuideVoicePlayer] Synth not initialized');
      return;
    }

    this.clearScheduled();
    this._isPlaying = true;

    for (const note of notes) {
      if (typeof note.midi !== 'number') continue;

      const frequency = Tone.Frequency(note.midi, 'midi').toFrequency();
      const durationSec = note.durationMs / 1000;

      const timeoutId = window.setTimeout(() => {
        if (this.synth) {
          this.synth.triggerAttackRelease(frequency, durationSec);
        }
      }, note.startTimeMs);

      this.scheduledTimeouts.push(timeoutId);
    }

    // Schedule end of playback
    const lastNote = notes.reduce(
      (latest, n) => (n.startTimeMs + n.durationMs > latest ? n.startTimeMs + n.durationMs : latest),
      0,
    );
    if (lastNote > 0) {
      const endTimeoutId = window.setTimeout(() => {
        this._isPlaying = false;
      }, lastNote);
      this.scheduledTimeouts.push(endTimeoutId);
    }
  }

  clearScheduled(): void {
    for (const id of this.scheduledTimeouts) {
      window.clearTimeout(id);
    }
    this.scheduledTimeouts = [];
    this._isPlaying = false;
  }

  stop(): void {
    this.clearScheduled();
    if (this.synth) {
      this.synth.releaseAll();
    }
  }

  dispose(): void {
    this.stop();
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    if (this.volume) {
      this.volume.dispose();
      this.volume = null;
    }
  }
}

export const guideVoicePlayer = new GuideVoicePlayer();
