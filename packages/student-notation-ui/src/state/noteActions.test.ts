import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStore,
  type CanvasSpaceColumn,
  type PlacedNote,
  type StoreInstance
} from '@mlt/student-notation-engine';
import { ensureCircleNoteSpan } from '@mlt/student-notation-engine/state';

function createCanvasSpaceColumn(value: number): CanvasSpaceColumn {
  return value as CanvasSpaceColumn;
}

type MockNoteOverrides = Omit<Partial<PlacedNote>, 'startColumnIndex' | 'endColumnIndex'> & {
  startColumnIndex?: number;
  endColumnIndex?: number;
};

function createMockNote(overrides: MockNoteOverrides = {}): PlacedNote {
  const { startColumnIndex, endColumnIndex, ...rest } = overrides;
  return {
    uuid: 'test-note',
    row: 10,
    globalRow: 10,
    startColumnIndex: createCanvasSpaceColumn(startColumnIndex ?? 5),
    endColumnIndex: createCanvasSpaceColumn(endColumnIndex ?? 6),
    color: '#4a90e2',
    shape: 'circle',
    isDrum: false,
    ...rest
  } as PlacedNote;
}

describe('ensureCircleNoteSpan', () => {
  it('sets a minimum endColumnIndex for circle notes', () => {
    const note = createMockNote({
      shape: 'circle',
      startColumnIndex: 5,
      endColumnIndex: 5
    });

    ensureCircleNoteSpan(note);

    expect(note.endColumnIndex).toBe(6);
  });

  it('leaves circle notes unchanged when already valid', () => {
    const note = createMockNote({
      shape: 'circle',
      startColumnIndex: 5,
      endColumnIndex: 8
    });

    ensureCircleNoteSpan(note);

    expect(note.endColumnIndex).toBe(8);
  });

  it('does not modify oval notes', () => {
    const note = createMockNote({
      shape: 'oval',
      startColumnIndex: 5,
      endColumnIndex: 5
    });

    ensureCircleNoteSpan(note);

    expect(note.endColumnIndex).toBe(5);
  });

  it('does not modify drum notes', () => {
    const note = createMockNote({
      isDrum: true,
      startColumnIndex: 5,
      endColumnIndex: 5
    });

    ensureCircleNoteSpan(note);

    expect(note.endColumnIndex).toBe(5);
  });
});

describe('engine-backed note actions', () => {
  let store: StoreInstance;

  beforeEach(() => {
    store = createStore();
  });

  afterEach(() => {
    store.dispose();
  });

  it('cycles a drum cell through single, double, second-only, and empty states', () => {
    const drumHit = {
      row: 0,
      drumTrack: 'H',
      startColumnIndex: createCanvasSpaceColumn(2),
      endColumnIndex: createCanvasSpaceColumn(2),
      color: '#4a90e2',
      shape: 'circle' as const
    };

    store.toggleDrumNote(drumHit);
    expect(store.state.placedNotes[0]?.drumSubdivision).toBe('single');

    store.toggleDrumNote(drumHit);
    expect(store.state.placedNotes[0]?.drumSubdivision).toBe('double');

    store.toggleDrumNote(drumHit);
    expect(store.state.placedNotes[0]?.drumSubdivision).toBe('secondOnly');

    store.toggleDrumNote(drumHit);
    expect(store.state.placedNotes).toHaveLength(0);
  });

  it('updates both row and globalRow when dragging a note', () => {
    const note = createMockNote({ row: 10, globalRow: 10 });

    store.updateNoteRow(note, 15);

    expect(note.row).toBe(15);
    expect(note.globalRow).toBe(15);
  });

  it('emits notesChanged when updating a note row', () => {
    const note = createMockNote();
    const listener = vi.fn();

    store.on('notesChanged', listener);
    store.updateNoteRow(note, 15);

    expect(listener).toHaveBeenCalledTimes(1);
    store.off('notesChanged', listener);
  });

  it('keeps row and globalRow in sync across sequential row updates', () => {
    const note = createMockNote({ row: 10, globalRow: 10 });

    store.updateNoteRow(note, 11);
    expect(note.row).toBe(11);
    expect(note.globalRow).toBe(11);

    store.updateNoteRow(note, 12);
    expect(note.row).toBe(12);
    expect(note.globalRow).toBe(12);

    store.updateNoteRow(note, 13);
    expect(note.row).toBe(13);
    expect(note.globalRow).toBe(13);
  });

  it('updates both properties even when the initial row values are mismatched', () => {
    const note = createMockNote({ row: 10, globalRow: 5 });

    store.updateNoteRow(note, 15);

    expect(note.row).toBe(15);
    expect(note.globalRow).toBe(15);
  });

  it('preserves the current multi-row update behavior', () => {
    const notes = [
      createMockNote({ uuid: '1', row: 10, globalRow: 10 }),
      createMockNote({ uuid: '2', row: 12, globalRow: 12 }),
      createMockNote({ uuid: '3', row: 14, globalRow: 14 })
    ];

    store.updateMultipleNoteRows(notes, [11, 13, 15]);

    expect(notes).toHaveLength(3);
    expect(notes[0]?.row).toBe(10);
    expect(notes[1]?.row).toBe(12);
    expect(notes[2]?.row).toBe(14);
  });

  it('emits notesChanged once when updating multiple note rows', () => {
    const notes = [
      createMockNote({ uuid: '1' }),
      createMockNote({ uuid: '2' })
    ];
    const listener = vi.fn();

    store.on('notesChanged', listener);
    store.updateMultipleNoteRows(notes, [20, 21]);

    expect(listener).toHaveBeenCalledTimes(1);
    store.off('notesChanged', listener);
  });

  it('uses globalRow for pitch-area hit testing when available', () => {
    const note = createMockNote({
      row: 10,
      globalRow: 20,
      startColumnIndex: 5,
      endColumnIndex: 6,
      shape: 'circle'
    });

    store.state.placedNotes = [note];

    const wasErased = store.eraseInPitchArea(
      createCanvasSpaceColumn(5),
      20,
      2,
      false
    );

    expect(wasErased).toBe(true);
    expect(store.state.placedNotes).toHaveLength(0);
  });

  it('does not erase when only row matches but globalRow does not', () => {
    const note = createMockNote({
      row: 20,
      globalRow: 10,
      startColumnIndex: 5,
      endColumnIndex: 6,
      shape: 'circle'
    });

    store.state.placedNotes = [note];

    const wasErased = store.eraseInPitchArea(
      createCanvasSpaceColumn(5),
      20,
      2,
      false
    );

    expect(wasErased).toBe(false);
    expect(store.state.placedNotes).toHaveLength(1);
  });
});
