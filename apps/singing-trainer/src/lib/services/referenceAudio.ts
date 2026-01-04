/**
 * Reference Audio Service
 *
 * Plays sine wave reference tones for the demo exercise.
 */

import * as Tone from 'tone';

class ReferenceAudioService {
  private synth: Tone.Synth | null = null;
  private scheduledTimeouts: number[] = []; // Store timeout IDs for cleanup
  private volume: Tone.Volume | null = null;
  private startTime: number = 0; // Performance.now() when playback started
  private _isPlaying: boolean = false; // Track if a reference tone is currently playing

  /**
   * Check if a reference tone is currently playing
   */
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Initialize the audio service
   */
  async init(): Promise<void> {
    await Tone.start();

    // Create volume node
    this.volume = new Tone.Volume(-12).toDestination();

    // Create synth with triangle wave (less likely to be picked up by mic as same frequency)
    this.synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.9,
        release: 0.1,
      },
    }).connect(this.volume);
  }

  /**
   * Set reference tone volume
   */
  setVolume(dB: number): void {
    if (this.volume) {
      this.volume.volume.value = dB;
    }
  }

  /**
   * Schedule all reference tones for the exercise
   * Uses setTimeout for precise timing aligned with the highway animation
   */
  scheduleReferenceTones(
    notes: Array<{ midi: number; startTimeMs: number; durationMs: number }>
  ): void {
    if (!this.synth) {
      console.warn('[ReferenceAudio] Synth not initialized');
      return;
    }

    // Clear any existing scheduled notes
    this.clearScheduled();

    // Record start time for synchronization
    this.startTime = performance.now();

    notes.forEach((note) => {
      const duration = note.durationMs / 1000;
      const frequency = Tone.Frequency(note.midi, 'midi').toFrequency();

      // Schedule the note start
      const startTimeoutId = window.setTimeout(() => {
        if (this.synth) {
          console.log(`[ReferenceAudio] Playing ${note.midi} at ${performance.now() - this.startTime}ms`);
          this._isPlaying = true;
          this.synth.triggerAttackRelease(frequency, duration);
        }
      }, note.startTimeMs);

      // Schedule the note end (to clear isPlaying flag)
      const endTimeoutId = window.setTimeout(() => {
        this._isPlaying = false;
      }, note.startTimeMs + note.durationMs);

      this.scheduledTimeouts.push(startTimeoutId, endTimeoutId);
    });

    console.log(`[ReferenceAudio] Scheduled ${notes.length} reference tones`);
  }

  /**
   * Play a single reference tone immediately
   */
  playTone(midi: number, durationMs: number): void {
    if (!this.synth) {
      console.warn('[ReferenceAudio] Synth not initialized');
      return;
    }

    const frequency = Tone.Frequency(midi, 'midi').toFrequency();
    const duration = durationMs / 1000;
    this.synth.triggerAttackRelease(frequency, duration);
  }

  /**
   * Clear all scheduled notes
   */
  clearScheduled(): void {
    this.scheduledTimeouts.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    this.scheduledTimeouts = [];
  }

  /**
   * Stop all audio
   */
  stop(): void {
    this.clearScheduled();
    if (this.synth) {
      this.synth.triggerRelease();
    }
  }

  /**
   * Dispose of audio resources
   */
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

// Singleton instance
export const referenceAudio = new ReferenceAudioService();
