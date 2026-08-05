import { describe, expect, it } from 'vitest';
import { getInitialState } from '@mlt/student-notation-engine';
import type { CanvasSpaceColumn, PlacedNote } from '@mlt/types';
import TonalService from './tonalService.ts';

function createNoteAtPitch(toneNote: string): { note: PlacedNote; state: ReturnType<typeof getInitialState> } {
  const state = getInitialState();
  const row = state.fullRowData.findIndex(pitchRow => pitchRow.toneNote === toneNote);
  if (row < 0) {
    throw new Error(`Pitch row not found for ${toneNote}`);
  }

  return {
    state,
    note: {
      uuid: `note-${toneNote}`,
      row,
      globalRow: row,
      startColumnIndex: 0 as CanvasSpaceColumn,
      endColumnIndex: 0 as CanvasSpaceColumn,
      shape: 'oval',
      color: '#4a90e2',
    },
  };
}

describe('TonalService pitch labels', () => {
  it('keeps pitch labels octave-free by default', () => {
    const { note, state } = createNoteAtPitch('C4');

    expect(TonalService.getPitchLabelForNote(note, state)).toBe('C');
  });

  it('adds the scientific-pitch octave to natural and enharmonic labels', () => {
    const natural = createNoteAtPitch('C4');
    natural.state.showPitchOctaveLabels = true;

    const accidental = createNoteAtPitch('Db4');
    accidental.state.showPitchOctaveLabels = true;

    expect(TonalService.getPitchLabelForNote(natural.note, natural.state)).toBe('C4');
    expect(TonalService.getPitchLabelForNote(accidental.note, accidental.state)).toBe('C#4/Db4');
  });
});
