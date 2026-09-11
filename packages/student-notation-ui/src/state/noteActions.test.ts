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

  it('can defer drum history so a multi-cell gesture records once', () => {
    const initialHistoryIndex = store.state.historyIndex;
    for (const column of [2, 3, 4]) {
      store.toggleDrumNote({
        drumTrack: 'H',
        startColumnIndex: createCanvasSpaceColumn(column),
        color: '#4a90e2',
        shape: 'circle'
      }, false);
    }

    expect(store.state.placedNotes).toHaveLength(3);
    expect(store.state.historyIndex).toBe(initialHistoryIndex);
    store.recordState();
    expect(store.state.historyIndex).toBe(initialHistoryIndex + 1);
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

  it('rebases arrows, text, and drawn paths when tonic columns are added and removed', () => {
    store.dispose();
    store = createStore({
      noteActionCallbacks: {
        getMacrobeatInfo: state => ({
          startColumn: Object.keys(state.tonicSignGroups).length > 0 ? 6 : 4,
          endColumn: Object.keys(state.tonicSignGroups).length > 0 ? 7 : 5
        })
      }
    });

    store.state.annotations = [
      {
        type: 'arrow',
        startCol: 2,
        startRow: 1,
        endCol: 5,
        endRow: 2,
        settings: {
          lineStyle: 'solid',
          strokeWeight: 2,
          startArrowhead: 'none',
          endArrowhead: 'filled',
          arrowheadSize: 8
        }
      },
      {
        type: 'text',
        col: 3,
        row: 1,
        widthCols: 3,
        heightRows: 2,
        text: 'Across boundary',
        settings: {
          color: '#000000',
          size: 16,
          bold: false,
          italic: false,
          underline: false,
          background: false,
          superscript: false,
          subscript: false
        }
      },
      {
        type: 'marker',
        path: [
          { col: 2, row: 1 },
          { col: 4, row: 2 },
          { col: 6, row: 3 }
        ],
        settings: { color: '#000000', size: 4 }
      }
    ];
    const annotationsChanged = vi.fn();
    store.on('annotationsChanged', annotationsChanged);

    store.addTonicSignGroup([{
      row: 10,
      tonicNumber: 1,
      preMacrobeatIndex: 0,
      columnIndex: createCanvasSpaceColumn(4)
    }]);

    expect(store.state.annotations[0]).toMatchObject({ startCol: 2, endCol: 7 });
    expect(store.state.annotations[1]).toMatchObject({ col: 3, widthCols: 5 });
    expect(store.state.annotations[2]).toMatchObject({
      path: [{ col: 2 }, { col: 6 }, { col: 8 }]
    });
    expect(annotationsChanged).toHaveBeenCalledTimes(1);

    expect(store.eraseTonicSignAt(createCanvasSpaceColumn(4))).toBe(true);
    expect(store.state.annotations[0]).toMatchObject({ startCol: 2, endCol: 5 });
    expect(store.state.annotations[1]).toMatchObject({ col: 3, widthCols: 3 });
    expect(store.state.annotations[2]).toMatchObject({
      path: [{ col: 2 }, { col: 4 }, { col: 6 }]
    });
    expect(annotationsChanged).toHaveBeenCalledTimes(2);
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
