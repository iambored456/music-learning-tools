import { CHORD_QUALITIES, chordLabel, degreeLabel, melody, midiNote, pick, resolution, triad } from './music.ts';
import { allowedDegrees, DEFAULT_SETTINGS, normalizeSettings, settingsError, type Settings } from './settings.ts';

export interface TrainerAudio {
  unlock(): Promise<void>;
  notes(midis: number[], seconds: number, signal: AbortSignal): Promise<void>;
  drone(midi: number | null, volume: number): void;
  volume(value: number): void;
  speak(text: string, signal: AbortSignal): Promise<void>;
  stop(): void;
}
export type Phase = 'idle' | 'listening' | 'answering' | 'feedback' | 'exploring' | 'finished';
export interface Result {
  expected: string;
  received: string;
  correct: boolean;
  seconds: number;
}
export interface SessionState {
  phase: Phase;
  tonic: number;
  octave: number;
  round: number;
  activeDegree: number | null;
  input: number[];
  revealed: number[];
  message: string;
  results: Result[];
  error: string | null;
  answerDeadline: number | null;
}
export const emptyState = (): SessionState => ({
  phase: 'idle', tonic: 0, octave: 4, round: 0, activeDegree: null,
  input: [], revealed: [], message: '', results: [], error: null, answerDeadline: null,
});

export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    const cancel = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

/** Session orchestration is independent of Svelte and of the chosen audio backend. */
export class TrainerSession {
  private state = emptyState();
  private settings = normalizeSettings(DEFAULT_SETTINGS);
  private controller = new AbortController();
  private question: number[] = [];
  private answerStarted = 0;
  private cycleIndex = 0;
  private lastTonic: number | null = null;
  private repeatBusy = false;
  private cancelDeadline: (() => void) | null = null;

  constructor(
    private audio: TrainerAudio,
    private changed: (state: SessionState) => void,
    private random: () => number = Math.random,
    private pause: (ms: number, signal: AbortSignal) => Promise<void> = wait,
    private now: () => number = () => performance.now(),
    private schedule: (callback: () => void, ms: number) => () => void = (callback, ms) => {
      const timer = setTimeout(callback, ms);
      return () => clearTimeout(timer);
    },
  ) {}

  snapshot(): SessionState {
    return { ...this.state, input: [...this.state.input], revealed: [...this.state.revealed], results: this.state.results.map(r => ({ ...r })) };
  }
  private emit(patch: Partial<SessionState> = {}) {
    this.state = { ...this.state, ...patch };
    this.changed(this.snapshot());
  }
  private cancel() {
    this.clearDeadline();
    this.controller.abort();
    this.controller = new AbortController();
    this.audio.stop();
    this.repeatBusy = false;
  }
  private async run(action: (signal: AbortSignal) => Promise<void>) {
    const signal = this.controller.signal;
    try { await action(signal); }
    catch (error) {
      if (signal.aborted) return;
      this.cancel();
      this.emit({ phase: 'idle', activeDegree: null, answerDeadline: null, error: error instanceof Error ? error.message : 'Audio could not start. Please try again.' });
    }
  }
  private check(signal: AbortSignal) { signal.throwIfAborted(); }

  async start(input: Settings) {
    this.cancel();
    this.settings = normalizeSettings(input);
    this.state = { ...emptyState(), tonic: this.settings.tonic, octave: this.settings.octave };
    const error = settingsError(this.settings);
    if (error) { this.emit({ error }); return; }
    this.lastTonic = null;
    this.cycleIndex = 0;
    this.emit({ phase: 'listening', message: 'Starting audio…' });
    await this.run(async signal => {
      await this.audio.unlock(); this.check(signal);
      this.audio.volume(this.settings.volume);
      if (this.settings.mode === 'freeplay') {
        this.updateDrone();
        this.emit({ phase: 'exploring', message: 'Choose a degree on the wheel to hear it.' });
        return;
      }
      if (this.settings.mode === 'cycle' || this.settings.mode === 'pocket') {
        while (!signal.aborted) {
          await this.prepare(signal);
          const degrees = allowedDegrees(this.settings);
          const degree = this.settings.mode === 'cycle' ? degrees[this.cycleIndex++ % degrees.length] : pick(degrees, this.random);
          this.emit({ round: this.state.round + 1, message: this.settings.mode === 'cycle' ? 'Listen to each degree in turn.' : 'Listen; the answer follows.' });
          await this.playDegree(degree, this.settings.mode === 'cycle', signal);
          await this.pause(1000, signal); this.check(signal);
          if (this.settings.mode === 'pocket') {
            const label = degreeLabel(degree, this.settings.scale);
            this.emit({ activeDegree: degree, message: `Degree ${label}` });
            await this.audio.speak(label.replace('♭', 'flat ').replace('♯', 'sharp '), signal);
            this.check(signal);
          }
          await this.pause(800, signal);
        }
      } else await this.nextQuestion(signal);
    });
  }

  stop() {
    this.cancel();
    this.emit({ phase: this.state.results.length ? 'finished' : 'idle', activeDegree: null, answerDeadline: null, message: 'Session stopped.' });
  }
  reset() { this.cancel(); this.state = emptyState(); this.emit(); }
  setFreeplayPitch(tonic: number, octave: number) {
    if (this.settings.mode !== 'freeplay' || this.state.phase !== 'exploring') return;
    this.cancel();
    this.settings = normalizeSettings({ ...this.settings, tonic, octave });
    this.emit({ tonic: this.settings.tonic, octave: this.settings.octave, activeDegree: null });
    this.updateDrone();
  }
  setFeedbackOctave(octave: number) {
    if (this.settings.mode !== 'melody' || this.state.phase !== 'feedback') return;
    this.cancel();
    const normalized = normalizeSettings({ ...this.settings, octave });
    this.emit({ octave: normalized.octave, activeDegree: null });
    this.updateDrone();
  }
  destroy() { this.cancel(); }

  private updateDrone() {
    this.audio.drone(this.settings.drone && this.settings.mode !== 'quality' ? midiNote(this.state.tonic, 3, 0) : null, this.settings.droneVolume);
  }
  private async prepare(signal: AbortSignal) {
    const s = this.settings;
    // Cycle changes key only at the start of each traversal of the selected degrees.
    const changeKey = s.mode !== 'cycle' || this.cycleIndex % allowedDegrees(s).length === 0;
    const tonic = s.randomTonic && changeKey ? Math.floor(this.random() * 12) : (s.randomTonic ? this.state.tonic : s.tonic);
    const octave = s.randomOctave ? pick([3, 4, 5], this.random) : s.octave;
    this.emit({ tonic, octave, input: [], revealed: [], activeDegree: null });
    this.updateDrone();
    if (s.cadence && this.lastTonic !== tonic && s.mode !== 'quality') await this.playCadence(signal);
    this.lastTonic = tonic;
    await this.pause(300, signal); this.check(signal);
  }
  private async nextQuestion(signal: AbortSignal) {
    this.emit({ phase: 'listening', message: 'Listen…', round: this.state.results.length + 1 });
    await this.prepare(signal);
    const s = this.settings, degrees = allowedDegrees(s);
    this.question = s.mode === 'quality' ? [pick(s.qualities, this.random)]
      : s.mode === 'melody' ? melody(degrees, s.melodyLength, this.random) : [pick(degrees, this.random)];
    await this.playQuestion(signal); this.check(signal);
    this.beginAnswer();
    this.emit({ phase: 'answering', message: s.mode === 'melody' ? 'Enter the degrees in the order you heard them.' : s.mode === 'quality' ? 'Which chord quality did you hear?' : 'Choose your answer on the wheel.' });
  }
  private clearDeadline() {
    this.cancelDeadline?.();
    this.cancelDeadline = null;
  }
  private beginAnswer() {
    this.clearDeadline();
    this.answerStarted = this.now();
    const ms = this.settings.answerSeconds * 1000;
    const signal = this.controller.signal;
    this.emit({ answerDeadline: ms ? this.answerStarted + ms : null });
    if (ms) this.cancelDeadline = this.schedule(() => {
      if (!signal.aborted && this.state.phase === 'answering') void this.finishAnswer(true);
    }, ms);
  }
  private async playDegree(degree: number, reveal: boolean, signal: AbortSignal, asChord = false) {
    this.check(signal);
    if (reveal) this.emit({ activeDegree: degree % 12 });
    const degrees = asChord ? triad(degree, this.settings.scale) : [degree];
    await this.audio.notes(degrees.map(d => midiNote(this.state.tonic, this.state.octave, d)), this.settings.noteGap * 0.8, signal);
    this.check(signal);
    if (reveal) this.emit({ activeDegree: null });
    await this.pause(this.settings.noteGap * 200, signal);
  }
  private async playQuestion(signal: AbortSignal, reveal = false) {
    if (this.settings.mode === 'quality') {
      const intervals = CHORD_QUALITIES[this.question[0]].intervals;
      await this.audio.notes(intervals.map(d => midiNote(this.state.tonic, this.state.octave, d)), 1, signal);
    } else {
      for (const degree of this.question) await this.playDegree(degree, reveal, signal, this.settings.mode === 'chords');
    }
  }
  async repeat() {
    if (this.state.phase !== 'answering' || this.repeatBusy) return;
    this.clearDeadline();
    this.repeatBusy = true;
    this.emit({ phase: 'listening', answerDeadline: null, message: 'Listen again…' });
    await this.run(async signal => {
      await this.playQuestion(signal); this.check(signal);
      this.repeatBusy = false;
      this.beginAnswer();
      this.emit({ phase: 'answering', message: 'Choose your answer.' });
    });
  }
  async replayMelody(source: 'input' | 'revealed') {
    if (this.settings.mode !== 'melody' || this.state.phase !== 'feedback') return;
    const notes = [...this.state[source]];
    if (!notes.length) return;
    this.cancel(); this.updateDrone();
    this.emit({ activeDegree: null });
    await this.run(async signal => {
      for (const degree of notes) await this.playDegree(degree, true, signal);
    });
  }
  async next() {
    if (this.settings.mode !== 'melody' || this.state.phase !== 'feedback') return;
    this.cancel();
    if (this.state.results.length >= this.settings.rounds) {
      this.emit({ phase: 'finished', activeDegree: null, message: 'Session complete.' });
    } else await this.run(signal => this.nextQuestion(signal));
  }
  private async playCadence(signal: AbortSignal) {
    this.emit({ message: 'Establishing the tonic: 1 · 4 · 5 · 1' });
    for (const degree of [0, 5, 7, 0]) await this.playDegree(degree, true, signal);
  }
  async cadence() {
    if (this.state.phase !== 'exploring') return;
    this.emit({ phase: 'listening' });
    await this.run(async signal => {
      await this.playCadence(signal); this.check(signal);
      this.emit({ phase: 'exploring', message: 'Choose a degree on the wheel.' });
    });
  }
  undoAnswer() {
    if (this.state.phase === 'answering') this.emit({ input: this.state.input.slice(0, -1) });
  }
  async answer(value: number) {
    const s = this.settings;
    if (this.state.phase === 'exploring' || (s.mode === 'melody' && this.state.phase === 'feedback')) {
      if (!allowedDegrees(s).includes(value)) return;
      this.cancel(); this.updateDrone();
      this.emit({ activeDegree: null });
      await this.run(signal => this.playDegree(value, true, signal));
      return;
    }
    if (this.state.phase !== 'answering') return;
    if (this.state.answerDeadline !== null && this.now() >= this.state.answerDeadline) { await this.finishAnswer(true); return; }
    const allowed = s.mode === 'quality' ? s.qualities : allowedDegrees(s);
    if (!allowed.includes(value)) return;
    const input = [...this.state.input, value];
    this.emit({ input });
    if (input.length < this.question.length) return;
    await this.finishAnswer(false);
  }
  private async finishAnswer(timedOut: boolean) {
    if (this.state.phase !== 'answering') return;
    this.clearDeadline();
    const s = this.settings, input = this.state.input;
    const label = (values: number[]) => values.map(v => s.mode === 'quality' ? CHORD_QUALITIES[v].name : s.mode === 'chords' ? chordLabel(v, s.scale) : degreeLabel(v, s.scale)).join(' · ');
    const correct = !timedOut && this.question.every((v, i) => v === input[i]);
    const result: Result = { expected: label(this.question), received: timedOut ? 'Time out' : label(input), correct, seconds: Math.max(0, (this.now() - this.answerStarted) / 1000) };
    this.emit({ phase: 'feedback', answerDeadline: null, revealed: [...this.question], results: [...this.state.results, result], message: timedOut ? `Time’s up. The answer was ${result.expected}.` : correct ? `Correct — ${result.expected}` : `You chose ${result.received}. The answer was ${result.expected}.` });
    await this.run(async signal => {
      if (!correct) await this.playQuestion(signal, true);
      else if (s.resolve && (s.mode === 'degrees' || s.mode === 'melody')) {
        for (const degree of resolution(this.question[this.question.length - 1])) await this.playDegree(degree, true, signal);
      }
      // Melody feedback stays available for replay and free play until Next is pressed.
      if (s.mode === 'melody') return;
      await this.pause(1400, signal); this.check(signal);
      if (this.state.results.length >= s.rounds) {
        this.audio.stop();
        this.emit({ phase: 'finished', activeDegree: null, message: 'Session complete.' });
      } else await this.nextQuestion(signal);
    });
  }
}
