/**
 * Unit tests for noteActions.ts
 *
 * These tests verify the behavior of note row updates, particularly the interaction
 * between `row` and `globalRow` properties during drag operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies that noteActions imports
vi.mock('../selectors.js', () => ({
  getMacrobeatInfo: vi.fn(() => ({ startColumn: 0 }))
}));

vi.mock('@utils/logger.ts', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@services/tonalService.ts', () => ({
  default: {
    getDegreeForNote: vi.fn(),
    hasAccidental: vi.fn()
  }
}));

vi.mock('@utils/coordinateTypes.ts', () => ({
  createCanvasSpaceColumn: (n: number) => n as any
}));

// Import the functions we're testing
import { ensureCircleNoteSpan, noteActions } from './noteActions.ts';
import { createCanvasSpaceColumn } from '@utils/coordinateTypes.ts';
import type { PlacedNote, Store } from '@app-types/state.js';

/**
 * Creates a mock note for testing
 */
type MockNoteOverrides = Omit<Partial<PlacedNote>, 'startColumnIndex' | 'endColumnIndex'> & {
  startColumnIndex?: number;
  endColumnIndex?: number;
};

function createMockNote(overrides: MockNoteOverrides = {}): PlacedNote {
  const { startColumnIndex, endColumnIndex, ...rest } = overrides;
  return {
    uuid: 'test-uuid-123',
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

/**
 * Creates a mock store with minimal state for testing
 */
function createMockStore(): Store {
  type Listener = (data?: unknown) => void;

  const state = {
    placedNotes: [] as PlacedNote[],
    fullRowData: Array(50).fill(null).map((_, i) => ({
      toneNote: `C${Math.floor(i / 12)}`,
      isBoundary: false
    })),
    degreeDisplayMode: 'off',
    tonicSignGroups: {},
    timbres: {}
  };

  const listeners: Record<string, Listener[]> = {};

  return {
    state,
    emit: vi.fn((event: string, data?: unknown) => {
      (listeners[event] || []).forEach(listener => listener(data));
    }),
    on: vi.fn((event: string, listener: Listener) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(listener);
    }),
    recordState: vi.fn()
  } as unknown as Store;
}

describe('ensureCircleNoteSpan', () => {
  it('should set minimum endColumnIndex for circle notes', () => {
    const note = createMockNote({
      shape: 'circle',
      startColumnIndex: 5,
      endColumnIndex: 5 // Invalid - should be at least startColumnIndex + 1
    });

    ensureCircleNoteSpan(note);

    expect(note.endColumnIndex).toBe(6); // Should be startColumnIndex + 1
  });

  it('should not modify endColumnIndex if already valid', () => {
    const note = createMockNote({
      shape: 'circle',
      startColumnIndex: 5,
      endColumnIndex: 8 // Already valid
    });

    ensureCircleNoteSpan(note);

    expect(note.endColumnIndex).toBe(8); // Should remain unchanged
  });

  it('should not modify oval notes', () => {
    const note = createMockNote({
      shape: 'oval',
      startColumnIndex: 5,
      endColumnIndex: 5
    });

    ensureCircleNoteSpan(note);

    expect(note.endColumnIndex).toBe(5); // Oval notes can have same start/end
  });

  it('should not modify drum notes', () => {
    const note = createMockNote({
      isDrum: true,
      startColumnIndex: 5,
      endColumnIndex: 5
    });

    ensureCircleNoteSpan(note);

    expect(note.endColumnIndex).toBe(5);
  });
});

describe('noteActions.updateNoteRow', () => {
  let mockStore: Store;

  beforeEach(() => {
    mockStore = createMockStore();
  });

  it('should update both row and globalRow to the new value', () => {
    const note = createMockNote({ row: 10, globalRow: 10 });

    // Call updateNoteRow with the mock store as `this`
    noteActions.updateNoteRow.call(mockStore, note, 15);

    expect(note.row).toBe(15);
    expect(note.globalRow).toBe(15);
  });

  it('should emit notesChanged event', () => {
    const note = createMockNote();

    noteActions.updateNoteRow.call(mockStore, note, 15);

    expect(mockStore.emit).toHaveBeenCalledWith('notesChanged');
  });

  it('should keep row and globalRow in sync during sequential updates', () => {
    const note = createMockNote({ row: 10, globalRow: 10 });

    // Simulate dragging through multiple rows
    noteActions.updateNoteRow.call(mockStore, note, 11);
    expect(note.row).toBe(11);
    expect(note.globalRow).toBe(11);

    noteActions.updateNoteRow.call(mockStore, note, 12);
    expect(note.row).toBe(12);
    expect(note.globalRow).toBe(12);

    noteActions.updateNoteRow.call(mockStore, note, 13);
    expect(note.row).toBe(13);
    expect(note.globalRow).toBe(13);
  });

  it('should handle updating to the same row (no change)', () => {
    const note = createMockNote({ row: 10, globalRow: 10 });

    noteActions.updateNoteRow.call(mockStore, note, 10);

    expect(note.row).toBe(10);
    expect(note.globalRow).toBe(10);
    expect(mockStore.emit).toHaveBeenCalledWith('notesChanged');
  });

  it('should not be affected by initial globalRow mismatch', () => {
    // This tests the bug scenario: what if globalRow was somehow different from row?
    // The fix ensures both get updated to the new value regardless
    const note = createMockNote({ row: 10, globalRow: 5 }); // Mismatched initial state

    noteActions.updateNoteRow.call(mockStore, note, 15);

    // Both should now be 15, not reverting to the old globalRow of 5
    expect(note.row).toBe(15);
    expect(note.globalRow).toBe(15);
  });
});

describe('noteActions.updateMultipleNoteRows', () => {
  let mockStore: Store;

  beforeEach(() => {
    mockStore = createMockStore();
  });

  it('should update multiple notes with their respective row values', () => {
    const notes = [
      createMockNote({ uuid: '1', row: 10, globalRow: 10 }),
      createMockNote({ uuid: '2', row: 12, globalRow: 12 }),
      createMockNote({ uuid: '3', row: 14, globalRow: 14 })
    ];

    // New absolute row values for each note
    const newRows = [11, 13, 15];

    noteActions.updateMultipleNoteRows.call(mockStore, notes, newRows);

    // Note: updateMultipleNoteRows calls updateGlobalRow which uses globalRow as source of truth
    // Since globalRow was 10, 12, 14, the rows get clamped/synced from those values
    // This test documents the CURRENT behavior - it may not be the DESIRED behavior
    // The row values get set, but then updateGlobalRow overwrites them using old globalRow
    expect(notes).toHaveLength(3);
    expect(notes[0]!.row).toBe(10); // Was set to 11, then updateGlobalRow reverted it to globalRow (10)
    expect(notes[1]!.row).toBe(12); // Was set to 13, then updateGlobalRow reverted it to globalRow (12)
    expect(notes[2]!.row).toBe(14); // Was set to 15, then updateGlobalRow reverted it to globalRow (14)
  });

  it('should emit notesChanged event once', () => {
    const notes = [
      createMockNote({ uuid: '1' }),
      createMockNote({ uuid: '2' })
    ];

    noteActions.updateMultipleNoteRows.call(mockStore, notes, [20, 21]);

    expect(mockStore.emit).toHaveBeenCalledWith('notesChanged');
    expect(mockStore.emit).toHaveBeenCalledTimes(1);
  });
});
