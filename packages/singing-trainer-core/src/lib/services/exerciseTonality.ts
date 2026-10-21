import type { OverdubExerciseTemplate } from '@mlt/lesson-templates';
import { NOTE_TO_PITCH_CLASS } from '@mlt/pitch-data';
import type { TonicNote } from '../stores/appState.svelte.js';

const TONICS: TonicNote[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Resolve degree 1 from the score and the same transposition applied to its notes. */
export function resolveExerciseTonality(
  template: OverdubExerciseTemplate | null,
  transposeSemitones: number,
): { tonic: TonicNote; pitchClass: number } | null {
  const sourceTonic = template?.config.tonalCenter?.pitchClass;
  if (!sourceTonic || !Object.prototype.hasOwnProperty.call(NOTE_TO_PITCH_CLASS, sourceTonic)
    || !Number.isFinite(transposeSemitones)) return null;
  const pitchClass = ((NOTE_TO_PITCH_CLASS[sourceTonic] + Math.round(transposeSemitones)) % 12 + 12) % 12;
  return { tonic: TONICS[pitchClass]!, pitchClass };
}
