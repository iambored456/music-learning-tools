import type { PlacedNote, CanvasSpaceColumn, MacrobeatGrouping, MacrobeatBoundaryStyle } from '@mlt/types';
import type { PitchRowData } from '@mlt/pitch-data';
import type { SolfegeLine } from '../constants/ladukhin.js';

export const SOLFEGE_SOURCE_TONIC = 60;
export const SOLFEGE_COLUMNS_PER_BEAT = 2;
const degrees = ['1', '♯1', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];

const justRatios = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];

/** Equal-tempered MIDI coordinate of a justly tuned pitch relative to the tonic. */
export function solfegeJustMidi(sourceMidi: number, tonicMidi: number): number {
  const offset = sourceMidi - SOLFEGE_SOURCE_TONIC;
  return tonicMidi + Math.floor(offset / 12) * 12 + 12 * Math.log2(justRatios[((offset % 12) + 12) % 12]!);
}

/** Source C4 becomes the singer's speaking pitch; columns represent eighth notes. */
export function createSolfegeNotation(line: SolfegeLine, speakingMidi: number, fullRowData: PitchRowData[]) {
  const labels = new Map<string, string>();
  const placedNotes: PlacedNote[] = line.notes.flatMap((note, index) => {
    if (note.midi === null) return [];
    const midi = note.midi + speakingMidi - SOLFEGE_SOURCE_TONIC;
    const globalRow = fullRowData.findIndex(row => row.midi === midi);
    if (globalRow < 0) throw new Error(`Solfege pitch ${midi} is outside the pitch gamut`);
    const uuid = `ladukhin-${line.number}-${index}`;
    labels.set(uuid, degrees[((note.midi - SOLFEGE_SOURCE_TONIC) % 12 + 12) % 12]!);
    return [{
      uuid, row: globalRow, globalRow,
      startColumnIndex: (note.beat * SOLFEGE_COLUMNS_PER_BEAT) as CanvasSpaceColumn,
      endColumnIndex: ((note.beat + note.durationBeats) * SOLFEGE_COLUMNS_PER_BEAT - 1) as CanvasSpaceColumn,
      shape: note.durationBeats < 1 ? 'oval' : 'circle',
      color: fullRowData[globalRow]!.hex,
    }];
  });
  const macrobeatGroupings: MacrobeatGrouping[] = Array.from({ length: line.durationBeats }, () => 2);
  const macrobeatBoundaryStyles: MacrobeatBoundaryStyle[] = macrobeatGroupings.map((_, index) => (
    line.barlines.includes(index + 1) ? 'solid' : 'dashed'
  ));
  return {
    placedNotes, macrobeatGroupings, macrobeatBoundaryStyles,
    columnWidths: Array.from({ length: line.durationBeats * SOLFEGE_COLUMNS_PER_BEAT }, () => 1),
    getScaleDegreeLabel: (note: PlacedNote) => ({ label: labels.get(note.uuid) ?? null, isAccidental: false }),
  };
}
