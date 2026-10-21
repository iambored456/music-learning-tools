import * as Tone from 'tone';
import { getAudioMasterOutput } from './audioMixer.js';

/** Held, isolated auditions; successive crossings replace the sounding pitch. */
export class NoteAuditionPlayer {
  private synth: Tone.Synth | null = null;
  private generation = 0;
  private nextAttack = 0;
  private disposeTimer: ReturnType<typeof setTimeout> | null = null;
  private attackTimers = new Set<ReturnType<typeof setTimeout>>();

  async play(midis: readonly number[], onAttack?: (index: number) => void): Promise<void> {
    if (!midis.length) return;
    if (this.disposeTimer !== null) clearTimeout(this.disposeTimer);
    this.disposeTimer = null;
    const token = this.generation;
    await Tone.start();
    if (token !== this.generation) return;
    this.synth ??= new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.75, release: 0.03 },
      volume: -15,
    }).connect(getAudioMasterOutput('synth'));
    const now = Tone.now();
    this.nextAttack = Math.max(now, this.nextAttack);
    for (const [index, midi] of midis.entries()) {
      const attack = () => {
        if (token !== this.generation) return;
        this.synth?.triggerAttack(440 * 2 ** ((midi - 69) / 12));
        onAttack?.(index);
      };
      const delayMs = (this.nextAttack - now) * 1000;
      if (delayMs <= 0) attack();
      else {
        const timer = setTimeout(() => { this.attackTimers.delete(timer); attack(); }, delayMs);
        this.attackTimers.add(timer);
      }
      this.nextAttack += 0.035;
    }
  }

  private cancelAttacks(): void {
    for (const timer of this.attackTimers) clearTimeout(timer);
    this.attackTimers.clear();
    this.nextAttack = 0;
  }

  /** Release on pointer-up, canceling queued crossings before the short fade. */
  release(): void {
    this.generation++;
    this.cancelAttacks();
    if (this.disposeTimer !== null) clearTimeout(this.disposeTimer);
    this.disposeTimer = null;
    if (!this.synth) return;
    this.synth.triggerRelease();
    this.disposeTimer = setTimeout(() => this.stop(), 60);
  }

  stop(): void {
    this.generation++;
    this.cancelAttacks();
    if (this.disposeTimer !== null) clearTimeout(this.disposeTimer);
    this.disposeTimer = null;
    this.synth?.dispose();
    this.synth = null;
  }
}
