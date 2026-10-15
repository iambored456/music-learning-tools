import { MODE_SCALE_DEGREES, mod12 } from '@mlt/compass-core';

export const SCALE_MODES = [
  { id: '1', name: 'Major (Ionian)' }, { id: '2', name: 'Dorian' },
  { id: '3', name: 'Phrygian' }, { id: '4', name: 'Lydian' },
  { id: '5', name: 'Mixolydian' }, { id: '6', name: 'Minor (Aeolian)' },
  { id: '7', name: 'Locrian' },
] as const;
export type ScaleMode = keyof typeof MODE_SCALE_DEGREES;
export const DEGREE_LABELS = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
export const CHORD_QUALITIES = [
  { name: 'Major', intervals: [0, 4, 7] },
  { name: 'Minor', intervals: [0, 3, 7] },
  { name: 'Diminished', intervals: [0, 3, 6] },
  { name: 'Augmented', intervals: [0, 4, 8] },
  { name: 'Dominant 7', intervals: [0, 4, 7, 10] },
  { name: 'Major 7', intervals: [0, 4, 7, 11] },
  { name: 'Minor 7', intervals: [0, 3, 7, 10] },
] as const;

export const scaleDegrees = (mode: ScaleMode): number[] => [...MODE_SCALE_DEGREES[mode]];
export const midiNote = (tonic: number, octave: number, degree: number) => 12 * (octave + 1) + tonic + degree;
export const midiFrequency = (note: number) => 440 * 2 ** ((note - 69) / 12);

export function degreeLabel(degree: number, mode: ScaleMode): string {
  return degree === 6 && mode === '7' ? '♭5' : DEGREE_LABELS[mod12(degree)];
}

/** Stack thirds in the selected mode, retaining octave crossings. */
export function triad(degree: number, mode: ScaleMode): number[] {
  const scale = scaleDegrees(mode);
  const index = scale.indexOf(degree);
  if (index < 0) throw new Error('Choose a scale degree for a diatonic chord.');
  return [0, 2, 4].map(step => scale[(index + step) % 7] + 12 * Math.floor((index + step) / 7));
}

export function chordLabel(degree: number, mode: ScaleMode): string {
  const index = scaleDegrees(mode).indexOf(degree);
  if (index < 0) return '—';
  const notes = triad(degree, mode);
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][index];
  const third = notes[1] - notes[0], fifth = notes[2] - notes[0];
  return (third === 3 ? roman.toLowerCase() : roman) + (fifth === 6 ? '°' : fifth === 8 ? '+' : '');
}

export function pick<T>(values: readonly T[], random: () => number = Math.random): T {
  if (!values.length) throw new Error('Select at least one answer to practise.');
  return values[Math.min(values.length - 1, Math.max(0, Math.floor(random() * values.length)))];
}

/** Keep melodies singable: mostly nearby allowed degrees, with occasional leaps. */
export function melody(degrees: number[], length: number, random: () => number = Math.random): number[] {
  const notes = [pick(degrees, random)];
  while (notes.length < length) {
    const previous = notes[notes.length - 1];
    const neighbours = degrees.filter(n => n !== previous && Math.abs(n - previous) <= 4);
    notes.push(pick(neighbours.length && random() < 0.7 ? neighbours : degrees, random));
  }
  return notes;
}

/** Short resolutions preserve the familiar functional-ear-training pattern. */
export function resolution(degree: number): number[] {
  const targets = [0, 0, 0, 2, 0, 4, 7, 12, 7, 7, 12, 12];
  return degree === 0 ? [] : [targets[degree]];
}
