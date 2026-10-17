import { CHORD_QUALITIES, SCALE_MODES, scaleDegrees, type ScaleMode } from './music.ts';
import type { WheelOrder } from '@mlt/compass-core';
import { SOUND_PRESETS, type SoundPreset } from './sound.ts';
import { defaultLessonTiming, normalizeLessonTiming, type TimingProfiles } from './timing.ts';

const DEFAULTS_VERSION = 1;

export const GAME_MODES = [
  { id: 'freeplay', name: 'Free Play', description: 'Explore the wheel and hear each degree in context.' },
  { id: 'degrees', name: 'Degrees', description: 'Listen to one note, then identify its scale degree.' },
  { id: 'melody', name: 'Melody', description: 'Listen to a short melody, then enter its degrees in order.' },
  { id: 'chords', name: 'Chords', description: 'Identify the scale degree of one diatonic triad.' },
  { id: 'chord-progressions', name: 'Chord Progressions', description: 'Listen to a sequence of diatonic chords, then enter them in order.' },
  { id: 'quality', name: 'Chord Quality', description: 'Identify the quality of the chord you hear.' },
  { id: 'pocket', name: 'Pocket Mode', description: 'Practise any exercise hands-free with spoken answers.' },
  { id: 'cycle', name: 'Cycle', description: 'Hear the selected degrees in ascending order.' },
] as const;
export type GameMode = typeof GAME_MODES[number]['id'];
export const isChordMode = (mode: GameMode) => mode === 'chords' || mode === 'chord-progressions';
export const isSequenceMode = (mode: GameMode) => mode === 'melody' || mode === 'chord-progressions';
export const WHEEL_VIEWS = [
  { id: 'fifths', name: 'Fifths', wheelStyle: 'compass', order: 'fifths' },
  { id: 'chromatic', name: 'Chromatic', wheelStyle: 'compass', order: 'chromatic' },
  { id: 'minimal', name: 'Minimal', wheelStyle: 'minimal', order: 'fifths' },
  { id: 'minimal-chromatic', name: 'Minimal Chromatic', wheelStyle: 'minimal', order: 'chromatic' },
] as const;
export function wheelView(settings: Pick<Settings, 'wheelStyle' | 'order'>) {
  return WHEEL_VIEWS.find(view => view.wheelStyle === settings.wheelStyle && view.order === settings.order)!.id;
}
export function setWheelView(settings: Pick<Settings, 'wheelStyle' | 'order'>, id: string) {
  const view = WHEEL_VIEWS.find(view => view.id === id);
  if (view) { settings.wheelStyle = view.wheelStyle; settings.order = view.order; }
}
export const POCKET_EXERCISES = [
  { id: 'degrees', name: 'Degrees' }, { id: 'melody', name: 'Melody' },
  { id: 'chords', name: 'Chords' }, { id: 'chord-progressions', name: 'Chord Progressions' }, { id: 'quality', name: 'Chord Quality' },
] as const;
export type PocketExercise = typeof POCKET_EXERCISES[number]['id'];
export const REVIEW_SKIP_OPTIONS = [
  { id: 'none', name: 'No skip' },
  { id: 'correct', name: 'Skip correct' },
  { id: 'all', name: 'Skip all' },
] as const;
export const AUTO_CONTINUE_DELAYS = [0.5, 1, 2, 5] as const;
export interface DegreeSettings {
  soundPreset: SoundPreset;
  /** Legacy saved preference; new per-mode choices live in Settings.timings. */
  reviewSkip: typeof REVIEW_SKIP_OPTIONS[number]['id'];
  droneVolume: number;
  melodyVolume: number;
  showTimeLeft: boolean;
}
export function normalizeDegreeSettings(input: unknown): DegreeSettings {
  const d = (input && typeof input === 'object' ? input : {}) as Partial<DegreeSettings>;
  const volume = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value)) : fallback;
  return {
    soundPreset: SOUND_PRESETS.some(s => s.id === d.soundPreset) ? d.soundPreset! : 'synth',
    reviewSkip: REVIEW_SKIP_OPTIONS.some(option => option.id === d.reviewSkip) ? d.reviewSkip! : 'correct',
    droneVolume: volume(d.droneVolume, 1),
    melodyVolume: volume(d.melodyVolume, 0.9),
    showTimeLeft: typeof d.showTimeLeft === 'boolean' ? d.showTimeLeft : false,
  };
}
export const QUESTIONS_PER_KEY = [5, 10, 15, 20, 30] as const;
export const POCKET_QUESTIONS_PER_KEY = QUESTIONS_PER_KEY;
export interface PocketSettings {
  exercise: PocketExercise;
  soundPreset: SoundPreset;
  tempo: number;
  melodyLength: number;
  progressionLength: number;
  repeats: number;
  waitSeconds: number;
  replays: number;
  answerVolume: number;
  droneVolume: number;
  melodyVolume: number;
  questionsPerKey: number;
  notesWithAnswer: boolean;
  speakAnswer: boolean;
}
export function normalizePocketSettings(input: unknown): PocketSettings {
  const p = (input && typeof input === 'object' ? input : {}) as Partial<PocketSettings>;
  const number = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  return {
    exercise: POCKET_EXERCISES.some(e => e.id === p.exercise) ? p.exercise! : 'degrees',
    soundPreset: SOUND_PRESETS.some(s => s.id === p.soundPreset) ? p.soundPreset! : 'synth',
    tempo: Math.round(number(p.tempo, 30, 180, 40)),
    melodyLength: Math.round(number(p.melodyLength, 1, 5, 1)),
    progressionLength: Math.round(number(p.progressionLength, 2, 8, 3)),
    repeats: Math.round(number(p.repeats, 1, 5, 1)),
    waitSeconds: number(p.waitSeconds, 0, 15, 1),
    replays: Math.round(number(p.replays, 0, 4, 1)),
    answerVolume: number(p.answerVolume, 0, 1, 0.8),
    droneVolume: number(p.droneVolume, 0, 1, 1),
    melodyVolume: number(p.melodyVolume, 0, 1, 0.9),
    questionsPerKey: POCKET_QUESTIONS_PER_KEY.some(n => n === p.questionsPerKey) ? p.questionsPerKey! : 5,
    notesWithAnswer: typeof p.notesWithAnswer === 'boolean' ? p.notesWithAnswer : false,
    speakAnswer: typeof p.speakAnswer === 'boolean' ? p.speakAnswer : true,
  };
}
export interface Settings {
  timings: TimingProfiles;
  defaultsVersion: number;
  mode: GameMode;
  pocket: PocketSettings;
  degreeOptions: DegreeSettings;
  tonic: number;
  octave: number;
  scale: ScaleMode;
  degrees: number[];
  qualities: number[];
  melodyLength: number;
  progressionLength: number;
  noteGap: number;
  rounds: number;
  reviewSkip: typeof REVIEW_SKIP_OPTIONS[number]['id'];
  answerSeconds: number;
  autoContinueCorrect: boolean;
  autoContinueSeconds: number;
  randomTonic: boolean;
  questionsPerKey: number;
  randomOctave: boolean;
  cadence: boolean;
  resolve: boolean;
  drone: boolean;
  droneVolume: number;
  volume: number;
  order: WheelOrder;
  wheelStyle: 'compass' | 'minimal';
}
export const DEFAULT_SETTINGS: Settings = {
  timings: {},
  defaultsVersion: DEFAULTS_VERSION,
  mode: 'freeplay', pocket: normalizePocketSettings({}), degreeOptions: normalizeDegreeSettings({}), tonic: 0, octave: 4, scale: '1', degrees: [0, 2, 4, 5, 7, 9, 11],
  qualities: [0, 1], melodyLength: 3, progressionLength: 3, noteGap: 0.8, rounds: 10, reviewSkip: 'correct', answerSeconds: 0,
  autoContinueCorrect: false, autoContinueSeconds: 2,
  randomTonic: true, questionsPerKey: 5, randomOctave: false, cadence: true, resolve: true,
  drone: true, droneVolume: 1, volume: 0.65, order: 'chromatic', wheelStyle: 'minimal',
};

export function normalizeSettings(input: unknown): Settings {
  const s = (input && typeof input === 'object' ? input : {}) as Partial<Settings>;
  const result: Settings = { ...DEFAULT_SETTINGS, timings: {}, degrees: [...DEFAULT_SETTINGS.degrees], qualities: [...DEFAULT_SETTINGS.qualities] };
  const range = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  for (const name of ['randomTonic', 'randomOctave', 'cadence', 'resolve', 'drone', 'autoContinueCorrect'] as const) {
    if (typeof s[name] === 'boolean') result[name] = s[name];
  }
  if (GAME_MODES.some(m => m.id === s.mode)) result.mode = s.mode!;
  if (POCKET_EXERCISES.some(exercise => exercise.id === result.mode) || result.mode === 'pocket') result.randomTonic = true;
  result.pocket = normalizePocketSettings(s.pocket);
  result.degreeOptions = normalizeDegreeSettings(s.degreeOptions);
  result.reviewSkip = REVIEW_SKIP_OPTIONS.some(option => option.id === s.reviewSkip) ? s.reviewSkip! : result.degreeOptions.reviewSkip;
  result.degreeOptions.reviewSkip = result.reviewSkip;
  if (SCALE_MODES.some(m => m.id === s.scale)) result.scale = s.scale!;
  if (s.order === 'chromatic' || s.order === 'fifths') result.order = s.order;
  result.tonic = Math.round(range(s.tonic, 0, 11, result.tonic));
  result.octave = Math.round(range(s.octave, 2, 6, result.octave));
  result.melodyLength = Math.round(range(s.melodyLength, 2, 8, result.melodyLength));
  result.progressionLength = Math.round(range(s.progressionLength, 2, 8, result.progressionLength));
  result.rounds = Math.round(range(s.rounds, 1, 100, result.rounds));
  result.questionsPerKey = Math.round(range(s.questionsPerKey, 1, 100, result.questionsPerKey));
  if (s.wheelStyle === 'minimal' || s.wheelStyle === 'compass') result.wheelStyle = s.wheelStyle;
  result.answerSeconds = s.answerSeconds === 2 || s.answerSeconds === 5 ? s.answerSeconds : 0;
  result.autoContinueSeconds = AUTO_CONTINUE_DELAYS.some(delay => delay === s.autoContinueSeconds) ? s.autoContinueSeconds! : 2;
  result.noteGap = range(s.noteGap, 0.3, 2, result.noteGap);
  result.volume = range(s.volume, 0, 1, result.volume);
  result.droneVolume = range(s.droneVolume, 0, 1, result.droneVolume);
  const selection = (v: unknown, max: number, fallback: number[]) => Array.isArray(v)
    ? [...new Set(v.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < max))].sort((a, b) => a - b)
    : fallback;
  result.degrees = selection(s.degrees, 12, result.degrees);
  result.qualities = selection(s.qualities, CHORD_QUALITIES.length, result.qualities);
  if (s.timings && typeof s.timings === 'object') {
    for (const mode of GAME_MODES) {
      const value = s.timings[mode.id];
      if (value && typeof value === 'object') result.timings[mode.id] = normalizeLessonTiming(value, defaultLessonTiming(result, mode.id));
    }
  }
  return result;
}

/** Upgrade the previous app defaults once; newer saves retain explicitly chosen settings. */
export function migrateSettingsDefaults(input: unknown): Settings {
  const settings = normalizeSettings(input);
  if (input && typeof input === 'object' && !('reviewSkip' in input)) {
    if (settings.rounds === 20) settings.rounds = 10;
    if (settings.reviewSkip === 'none') settings.reviewSkip = settings.degreeOptions.reviewSkip = 'correct';
  }
  if (input && typeof input === 'object' && (input as Partial<Settings>).defaultsVersion !== DEFAULTS_VERSION) {
    // Both Compass/Fifths and Melody's forced Minimal/Fifths were previous defaults.
    if (settings.order === 'fifths') { settings.order = 'chromatic'; settings.wheelStyle = 'minimal'; }
    if (settings.droneVolume === 0.15) settings.droneVolume = 1;
    if (settings.degreeOptions.droneVolume === 0.8) settings.degreeOptions.droneVolume = 1;
    if (settings.pocket.droneVolume === 0.8) settings.pocket.droneVolume = 1;
  }
  return settings;
}

export function allowedDegrees(s: Settings): number[] {
  const scale = scaleDegrees(s.scale);
  return s.degrees.filter(d => !isChordMode(exerciseMode(s)) || scale.includes(d));
}

export const exerciseMode = (s: Settings): GameMode => s.mode === 'pocket' ? s.pocket.exercise : s.mode;
export function questionLength(s: Settings): number {
  const mode = exerciseMode(s);
  const options = s.mode === 'pocket' ? s.pocket : s;
  return mode === 'chord-progressions' ? options.progressionLength : mode === 'melody' ? options.melodyLength : 1;
}
export function settingsError(s: Settings): string | null {
  if (exerciseMode(s) === 'quality') return s.qualities.length ? null : 'Select at least one chord quality.';
  return allowedDegrees(s).length ? null : 'Select at least one available degree for this mode.';
}
