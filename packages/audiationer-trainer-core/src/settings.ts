import { CHORD_QUALITIES, SCALE_MODES, scaleDegrees, type ScaleMode } from './music.ts';
import type { WheelOrder } from '@mlt/compass-core';

export const GAME_MODES = [
  { id: 'freeplay', name: 'Free Play', description: 'Explore the wheel and hear each degree in context.' },
  { id: 'degrees', name: 'Degrees', description: 'Listen to one note, then identify its scale degree.' },
  { id: 'melody', name: 'Melody', description: 'Listen to a short melody, then enter its degrees in order.' },
  { id: 'chords', name: 'Chord Progressions', description: 'Identify the scale degree of a diatonic triad.' },
  { id: 'quality', name: 'Chord Quality', description: 'Identify the quality of the chord you hear.' },
  { id: 'pocket', name: 'Pocket Mode', description: 'Listen hands-free; the answer is spoken after each note.' },
  { id: 'cycle', name: 'Cycle', description: 'Hear the selected degrees in ascending order.' },
] as const;
export type GameMode = typeof GAME_MODES[number]['id'];
export interface Settings {
  mode: GameMode;
  tonic: number;
  octave: number;
  scale: ScaleMode;
  degrees: number[];
  qualities: number[];
  melodyLength: number;
  noteGap: number;
  rounds: number;
  answerSeconds: number;
  randomTonic: boolean;
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
  mode: 'freeplay', tonic: 0, octave: 4, scale: '1', degrees: [0, 2, 4, 5, 7, 9, 11],
  qualities: [0, 1], melodyLength: 3, noteGap: 0.8, rounds: 20, answerSeconds: 0,
  randomTonic: false, randomOctave: false, cadence: true, resolve: true,
  drone: true, droneVolume: 0.15, volume: 0.65, order: 'fifths', wheelStyle: 'compass',
};

export function normalizeSettings(input: unknown): Settings {
  const s = (input && typeof input === 'object' ? input : {}) as Partial<Settings>;
  const result: Settings = { ...DEFAULT_SETTINGS, degrees: [...DEFAULT_SETTINGS.degrees], qualities: [...DEFAULT_SETTINGS.qualities] };
  const range = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  for (const name of ['randomTonic', 'randomOctave', 'cadence', 'resolve', 'drone'] as const) {
    if (typeof s[name] === 'boolean') result[name] = s[name];
  }
  if (GAME_MODES.some(m => m.id === s.mode)) result.mode = s.mode!;
  if (SCALE_MODES.some(m => m.id === s.scale)) result.scale = s.scale!;
  if (s.order === 'chromatic' || s.order === 'fifths') result.order = s.order;
  result.tonic = Math.round(range(s.tonic, 0, 11, result.tonic));
  result.octave = Math.round(range(s.octave, 2, 6, result.octave));
  result.melodyLength = Math.round(range(s.melodyLength, 2, 8, result.melodyLength));
  result.rounds = Math.round(range(s.rounds, 1, 100, result.rounds));
  result.wheelStyle = s.wheelStyle === 'minimal' ? 'minimal' : 'compass';
  result.answerSeconds = s.answerSeconds === 2 || s.answerSeconds === 5 ? s.answerSeconds : 0;
  result.noteGap = range(s.noteGap, 0.3, 2, result.noteGap);
  result.volume = range(s.volume, 0, 1, result.volume);
  result.droneVolume = range(s.droneVolume, 0, 0.5, result.droneVolume);
  const selection = (v: unknown, max: number, fallback: number[]) => Array.isArray(v)
    ? [...new Set(v.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < max))].sort((a, b) => a - b)
    : fallback;
  result.degrees = selection(s.degrees, 12, result.degrees);
  result.qualities = selection(s.qualities, CHORD_QUALITIES.length, result.qualities);
  return result;
}

export function allowedDegrees(s: Settings): number[] {
  const scale = scaleDegrees(s.scale);
  return s.degrees.filter(d => s.mode !== 'chords' || scale.includes(d));
}

export function settingsError(s: Settings): string | null {
  if (s.mode === 'quality') return s.qualities.length ? null : 'Select at least one chord quality.';
  return allowedDegrees(s).length ? null : 'Select at least one available degree for this mode.';
}
