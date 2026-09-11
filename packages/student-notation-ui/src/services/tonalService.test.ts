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

function createModalDegreeContext(toneNote: string, tonicNumber: number) {
  const context = createNoteAtPitch(toneNote);
  const tonicRow = context.state.fullRowData.findIndex(pitchRow => pitchRow.toneNote === 'C4');

  context.note.startColumnIndex = 2 as CanvasSpaceColumn;
  context.note.endColumnIndex = 2 as CanvasSpaceColumn;
  context.state.degreeDisplayMode = 'modal';
  context.state.accidentalMode = { sharp: true, flat: true };
  context.state.tonicSignGroups = {
    tonic: [{
      row: tonicRow,
      globalRow: tonicRow,
      columnIndex: 0 as CanvasSpaceColumn,
      tonicNumber,
      preMacrobeatIndex: -1
    }]
  };

  return context;
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

describe('TonalService modal degree labels', () => {
  const chromaticPitches = ['C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4'];
  const cases = [
    ['major', 1, ['1', '♯1/♭2', '2', '♯2/♭3', '3', '4', '♯4/♭5', '5', '♯5/♭6', '6', '♯6/♭7', '7']],
    ['dorian', 2, ['1', '♯1/♭2', '2', '♭3', '3', '4', '♯4/♭5', '5', '♯5/♭6', '6', '♭7', '7']],
    ['phrygian', 3, ['1', '♭2', '2', '♭3', '3', '4', '♯4/♭5', '5', '♭6', '6', '♭7', '7']],
    ['lydian', 4, ['1', '♯1/♭2', '2', '♯2/♭3', '3', '4', '♯4', '5', '♯5/♭6', '6', '♯6/♭7', '7']],
    ['mixolydian', 5, ['1', '♯1/♭2', '2', '♯2/♭3', '3', '4', '♯4/♭5', '5', '♯5/♭6', '6', '♭7', '7']],
    ['minor', 6, ['1', '♯1/♭2', '2', '♭3', '3', '4', '♯4/♭5', '5', '♭6', '6', '♭7', '7']],
    ['locrian', 7, ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7']]
  ] as const;

  it.each(cases)('uses canonical scale-tone accidentals throughout %s mode', (_mode, tonicNumber, expectedLabels) => {
    const labels = chromaticPitches.map(toneNote => {
      const { note, state } = createModalDegreeContext(toneNote, tonicNumber);
      return TonalService.getDegreeLabelForNote(note, state).label;
    });

    expect(labels).toEqual(expectedLabels);
  });

  it('keeps the accidental visibility controls for modal scale tones', () => {
    const { note, state } = createModalDegreeContext('Eb4', 2);

    state.accidentalMode = { sharp: true, flat: false };
    expect(TonalService.getDegreeLabelForNote(note, state).label).toBe('♯2');

    state.accidentalMode = { sharp: false, flat: true };
    expect(TonalService.getDegreeLabelForNote(note, state).label).toBe('♭3');
  });
});
