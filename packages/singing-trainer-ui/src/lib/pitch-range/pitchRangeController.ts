import { midiToNoteName } from '@mlt/pitch-utils';

export type PitchRange = { bottomMidi: number; topMidi: number };
export type ActiveHandle = 'top' | 'bottom' | null;

export const MIN_MIDI = 21;
export const MAX_MIDI = 108;
export const MIN_RANGE_SEMITONES = 12;

export function clampPitchRange(range: PitchRange): PitchRange {
  const bottomMidi = Math.max(MIN_MIDI, Math.min(MAX_MIDI - MIN_RANGE_SEMITONES, range.bottomMidi));
  const topMidi = Math.max(bottomMidi + MIN_RANGE_SEMITONES, Math.min(MAX_MIDI, range.topMidi));
  return { bottomMidi, topMidi };
}

export function setTop(range: PitchRange, candidateTop: number): PitchRange {
  const topMidi = Math.max(range.bottomMidi + MIN_RANGE_SEMITONES, Math.min(MAX_MIDI, Math.round(candidateTop)));
  return { bottomMidi: range.bottomMidi, topMidi };
}

export function setBottom(range: PitchRange, candidateBottom: number): PitchRange {
  const bottomMidi = Math.max(MIN_MIDI, Math.min(range.topMidi - MIN_RANGE_SEMITONES, Math.round(candidateBottom)));
  return { bottomMidi, topMidi: range.topMidi };
}

/** Convert a y pixel position to a snapped MIDI note number. y=0 is top of grid. */
export function yToMidi(yPx: number, gridHeightPx: number, range: PitchRange): number {
  if (gridHeightPx <= 0) return range.topMidi;
  const ratio = yPx / gridHeightPx;
  const midi = range.topMidi - ratio * (range.topMidi - range.bottomMidi);
  return Math.round(Math.max(MIN_MIDI, Math.min(MAX_MIDI, midi)));
}

/** Convert a MIDI note number to a y pixel position. y=0 is top of grid. */
export function midiToY(midi: number, gridHeightPx: number, range: PitchRange): number {
  const span = range.topMidi - range.bottomMidi;
  if (span <= 0) return 0;
  return ((range.topMidi - midi) / span) * gridHeightPx;
}

/** MIDI to display label, e.g. 60 → "C4" */
export function midiToLabel(midi: number): string {
  return midiToNoteName(midi);
}

/** Generate an array of { midi, label } for all valid MIDI values, high to low. */
export function generateMidiOptions(): Array<{ midi: number; label: string }> {
  const options: Array<{ midi: number; label: string }> = [];
  for (let midi = MAX_MIDI; midi >= MIN_MIDI; midi--) {
    options.push({ midi, label: midiToLabel(midi) });
  }
  return options;
}
