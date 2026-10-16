import { CHORD_QUALITIES, chordLabel, degreeLabel, melody, midiNote, pick, resolution, scaleDegrees, triad } from './music.ts';
import { allowedDegrees, DEFAULT_SETTINGS, exerciseMode, normalizeSettings, settingsError, type Settings } from './settings.ts';
import type { SoundPreset } from './sound.ts';

export interface TrainerAudio {
  unlock(): Promise<void>;
  notes(midis: number[], seconds: number, signal: AbortSignal): Promise<void>;
  drone(midi: number | null, volume: number): void;
  volume(value: number): void;
  speak(text: string, signal: AbortSignal, volume?: number): Promise<void>;
  preset?(value: SoundPreset): void;
  separateDroneVolume?(enabled: boolean): void;
  stop(): void;
}
export type Phase = 'idle' | 'listening' | 'answering' | 'feedback' | 'exploring' | 'finished';
export const SKIPPED_CORRECT_FLASH_MS = 400;
const QUESTION_LEAD_IN_MS = 500;
const DEGREE_QUESTION_MIN_SECONDS = 1.2;
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
  autoContinueDeadline: number | null;
  reviewSkipped: boolean;
  tonicizing: boolean;
}
export const emptyState = (): SessionState => ({
  phase: 'idle', tonic: 0, octave: 4, round: 0, activeDegree: null,
  input: [], revealed: [], message: '', results: [], error: null, answerDeadline: null, autoContinueDeadline: null, reviewSkipped: false, tonicizing: false,
});

export function hasAnswerReview(state: SessionState): boolean {
  return state.phase === 'feedback' && !state.reviewSkipped && state.results.length > 0;
}

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
  private cancelAutoContinue: (() => void) | null = null;
  private autoContinueToken = 0;

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
  private cancel(keepAutoContinue = false) {
    this.clearDeadline();
    if (!keepAutoContinue) this.clearAutoContinue();
    this.state = { ...this.state, tonicizing: false };
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
      const pocket = this.settings.mode === 'pocket';
      const sound = pocket ? this.settings.pocket : this.settings.mode === 'degrees' ? this.settings.degreeOptions : null;
      this.audio.separateDroneVolume?.(sound !== null);
      this.audio.preset?.(sound?.soundPreset ?? 'synth');
      this.audio.volume(sound?.melodyVolume ?? this.settings.volume);
      if (this.settings.mode === 'freeplay') {
        this.updateDrone();
        this.emit({ phase: 'exploring', message: 'Choose a degree on the wheel to hear it.' });
        return;
      }
      if (pocket) { await this.runPocket(signal); return; }
      if (this.settings.mode === 'cycle') {
        while (!signal.aborted) {
          await this.prepare(signal);
          const degrees = allowedDegrees(this.settings);
          const degree = degrees[this.cycleIndex++ % degrees.length];
          this.emit({ round: this.state.round + 1, message: 'Listen to each degree in turn.' });
          await this.playDegree(degree, true, signal);
          await this.pause(1000, signal); this.check(signal);
          await this.pause(800, signal);
        }
      } else await this.nextQuestion(signal);
    });
  }

  private createQuestion(): number[] {
    const s = this.settings, mode = exerciseMode(s), degrees = allowedDegrees(s);
    return mode === 'quality' ? [pick(s.qualities, this.random)]
      : mode === 'melody' ? melody(degrees, s.mode === 'pocket' ? s.pocket.melodyLength : s.melodyLength, this.random)
      : [pick(degrees, this.random)];
  }
  private pocketLabel(value: number, spoken = false): string {
    const s = this.settings, mode = s.pocket.exercise;
    if (mode === 'quality') return CHORD_QUALITIES[value].name;
    if (mode === 'chords') {
      const label = chordLabel(value, s.scale);
      if (!spoken) return label;
      const number = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'][scaleDegrees(s.scale).indexOf(value)];
      const quality = label.endsWith('°') ? 'diminished' : label.endsWith('+') ? 'augmented' : label === label.toLowerCase() ? 'minor' : 'major';
      return `${number} ${quality}`;
    }
    const label = degreeLabel(value, s.scale);
    return spoken ? label.replace('♭', 'flat ').replace('♯', 'sharp ') : label;
  }
  private async runPocket(signal: AbortSignal) {
    const p = this.settings.pocket, beat = 60 / p.tempo * 1000;
    while (!signal.aborted) {
      this.emit({ phase: 'listening', message: 'Listen…' });
      await this.prepare(signal);
      this.question = this.createQuestion();
      this.emit({ round: this.state.round + 1, message: 'Listen to the question.' });
      this.check(signal);
      for (let repeat = 0; repeat < p.repeats; repeat++) {
        if (repeat) { await this.pause(beat, signal); this.check(signal); }
        await this.playQuestion(signal);
      }
      this.emit({ phase: 'answering', message: 'Think of the answer…' });
      await this.pause(p.waitSeconds * 1000, signal); this.check(signal);
      if (p.speakAnswer) {
        this.emit({ phase: 'feedback', revealed: [...this.question], message: this.question.map(value => this.pocketLabel(value)).join(' · ') });
        this.check(signal);
        for (const value of this.question) {
          this.emit({ activeDegree: p.exercise === 'quality' ? null : value });
          this.check(signal);
          const speech = this.audio.speak(this.pocketLabel(value, true), signal, p.answerVolume);
          if (p.notesWithAnswer) await Promise.all([speech, this.playQuestion(signal, true, [value])]);
          else await speech;
          this.check(signal);
        }
      } else this.emit({ phase: 'feedback', message: 'Listening practice.' });
      for (let replay = 0; replay < p.replays; replay++) {
        await this.pause(beat, signal); this.check(signal);
        await this.playQuestion(signal, p.speakAnswer);
      }
      this.emit({ activeDegree: null });
      this.check(signal);
      await this.pause(beat, signal); this.check(signal);
    }
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
    if (this.settings.mode !== 'melody' || !this.reviewAvailable()) return;
    this.cancel(true);
    const normalized = normalizeSettings({ ...this.settings, octave });
    this.emit({ octave: normalized.octave, activeDegree: null });
    this.updateDrone();
  }
  destroy() { this.cancel(); }

  private updateDrone() {
    const s = this.settings;
    const volume = s.mode === 'pocket' ? s.pocket.droneVolume : s.mode === 'degrees' ? s.degreeOptions.droneVolume : s.droneVolume;
    // Degrees uses its volume slider to mute the drone instead of the legacy on/off option.
    const enabled = s.mode === 'degrees' ? volume > 0 : s.drone && s.mode !== 'quality';
    this.audio.drone(enabled ? midiNote(this.state.tonic, 3, 0) : null, volume);
  }
  private async prepare(signal: AbortSignal) {
    this.check(signal);
    const s = this.settings;
    const completed = s.mode === 'pocket' ? this.state.round : this.state.results.length;
    // A new key starts a block of questions; replay and review never advance that block.
    const changeKey = this.lastTonic === null || (s.mode === 'cycle'
      ? this.cycleIndex % allowedDegrees(s).length === 0
      : completed % (s.mode === 'pocket' ? s.pocket.questionsPerKey : s.questionsPerKey) === 0);
    const tonic = s.randomTonic && changeKey
      ? this.lastTonic !== null ? (this.state.tonic + 1 + Math.floor(this.random() * 11)) % 12 : Math.floor(this.random() * 12)
      : (s.randomTonic ? this.state.tonic : s.tonic);
    const octave = s.randomOctave ? pick([3, 4, 5], this.random) : s.octave;
    this.emit({ tonic, octave, input: [], revealed: [], activeDegree: null });
    this.check(signal);
    this.updateDrone();
    if (s.cadence && this.lastTonic !== tonic && s.mode !== 'quality') await this.playCadence(signal);
    this.lastTonic = tonic;
    await this.pause(QUESTION_LEAD_IN_MS, signal); this.check(signal);
  }
  private async nextQuestion(signal: AbortSignal) {
    this.emit({ phase: 'listening', reviewSkipped: false, message: 'Listen…', round: this.state.results.length + 1 });
    await this.prepare(signal);
    const s = this.settings;
    this.question = this.createQuestion();
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
  private clearAutoContinue() {
    this.cancelAutoContinue?.();
    this.cancelAutoContinue = null;
    this.autoContinueToken++;
    this.state = { ...this.state, autoContinueDeadline: null };
  }
  private scheduleAutoContinue(ms: number) {
    const token = this.autoContinueToken;
    this.cancelAutoContinue = this.schedule(() => {
      if (token === this.autoContinueToken && this.state.phase === 'feedback' && this.state.autoContinueDeadline !== null) void this.next();
    }, ms);
  }
  private async playDegree(degree: number, reveal: boolean, signal: AbortSignal, asChord = false, minimumSeconds = 0) {
    this.check(signal);
    if (reveal) this.emit({ activeDegree: degree % 12 });
    const degrees = asChord ? triad(degree, this.settings.scale) : [degree];
    const gap = this.settings.mode === 'pocket' ? 60 / this.settings.pocket.tempo : this.settings.noteGap;
    await this.audio.notes(degrees.map(d => midiNote(this.state.tonic, this.state.octave, d)), Math.max(gap * 0.8, minimumSeconds), signal);
    this.check(signal);
    if (reveal) this.emit({ activeDegree: null });
    await this.pause(gap * 200, signal); this.check(signal);
  }
  private async playQuestion(signal: AbortSignal, reveal = false, values = this.question) {
    const mode = exerciseMode(this.settings);
    if (mode === 'quality') {
      const intervals = CHORD_QUALITIES[values[0]].intervals;
      await this.audio.notes(intervals.map(d => midiNote(this.state.tonic, this.state.octave, d)), this.settings.mode === 'pocket' ? 60 / this.settings.pocket.tempo * 0.8 : 1, signal);
      this.check(signal);
    } else {
      const minimumSeconds = this.settings.mode === 'degrees' ? DEGREE_QUESTION_MIN_SECONDS : 0;
      for (const degree of values) await this.playDegree(degree, reveal, signal, mode === 'chords', minimumSeconds);
    }
  }
  async repeat() {
    if (this.state.phase !== 'answering' || this.repeatBusy) return;
    this.clearDeadline();
    this.repeatBusy = true;
    this.emit({ phase: 'listening', answerDeadline: null, message: 'Listen again…' });
    await this.run(async signal => {
      await this.pause(QUESTION_LEAD_IN_MS, signal); this.check(signal);
      await this.playQuestion(signal); this.check(signal);
      this.repeatBusy = false;
      this.beginAnswer();
      this.emit({ phase: 'answering', message: 'Choose your answer.' });
    });
  }
  async replayMelody(source: 'input' | 'revealed') {
    if (this.settings.mode !== 'melody' || !this.reviewAvailable()) return;
    const notes = [...this.state[source]];
    if (!notes.length) return;
    this.cancel(true); this.updateDrone();
    this.emit({ activeDegree: null });
    await this.run(async signal => {
      for (const degree of notes) await this.playDegree(degree, true, signal);
    });
  }
  async next() {
    if (!this.reviewAvailable()) return;
    this.cancel();
    await this.run(signal => this.advance(signal));
  }
  private reviewAvailable() {
    return hasAnswerReview(this.state);
  }
  private async advance(signal: AbortSignal) {
    this.check(signal);
    if (this.state.results.length >= this.settings.rounds) {
      this.audio.stop();
      this.emit({ phase: 'finished', reviewSkipped: false, activeDegree: null, message: 'Session complete.' });
    } else await this.nextQuestion(signal);
  }
  private async playCadence(signal: AbortSignal) {
    this.check(signal);
    this.emit({ tonicizing: true, message: 'Establishing the tonic: 1 · 4 · 5 · 1' });
    for (const degree of [0, 5, 7, 0]) await this.playDegree(degree, true, signal);
    this.check(signal);
    this.emit({ tonicizing: false, message: 'Listen…' });
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
    if (s.mode === 'pocket') return;
    if (this.state.phase === 'exploring' || (this.reviewAvailable() && s.mode !== 'quality')) {
      if (!allowedDegrees(s).includes(value)) return;
      this.cancel(true); this.updateDrone();
      this.emit({ activeDegree: null });
      await this.run(signal => this.playDegree(value, true, signal, s.mode === 'chords'));
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
    const autoContinue = correct && s.autoContinueCorrect;
    const reviewSkipped = !autoContinue && (s.reviewSkip === 'all' || (s.reviewSkip === 'correct' && correct));
    const continueDelay = s.autoContinueSeconds * 1000;
    const result: Result = { expected: label(this.question), received: timedOut ? 'Time out' : label(input), correct, seconds: Math.max(0, (this.now() - this.answerStarted) / 1000) };
    this.emit({ phase: 'feedback', reviewSkipped, activeDegree: null, answerDeadline: null, autoContinueDeadline: autoContinue ? this.now() + continueDelay : null, revealed: reviewSkipped ? [] : [...this.question], results: [...this.state.results, result], message: timedOut ? `Time’s up. The answer was ${result.expected}.` : correct ? `Correct — ${result.expected}` : `You chose ${result.received}. The answer was ${result.expected}.` });
    if (autoContinue) this.scheduleAutoContinue(continueDelay);
    await this.run(async signal => {
      if (reviewSkipped) {
        if (correct) { await this.pause(SKIPPED_CORRECT_FLASH_MS, signal); this.check(signal); }
        await this.advance(signal);
        return;
      }
      if (!correct) await this.playQuestion(signal, true);
      else if (s.resolve && (s.mode === 'degrees' || s.mode === 'melody')) {
        for (const degree of resolution(this.question[this.question.length - 1])) await this.playDegree(degree, true, signal);
      }
      // Retained reviews wait for Next or the optional auto-continue countdown.
    });
  }
}
