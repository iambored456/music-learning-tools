/**
 * Note Actions
 *
 * Framework-agnostic note manipulation actions for the store.
 * All dependencies (selectors, services) are injected via callbacks.
 */

import type {
  PlacedNote,
  TonicSign,
  Store,
  CanvasSpaceColumn,
  PitchRowData,
  TonicSignGroups
} from '@mlt/types';

/**
 * Macrobeat info from selector
 */
export interface MacrobeatInfo {
  startColumn: number;
  endColumn: number;
}

/**
 * Callbacks for note actions
 */
export interface NoteActionCallbacks {
  /** Get macrobeat info by index */
  getMacrobeatInfo?: (state: Store['state'], index: number) => MacrobeatInfo;
  /** Get degree for a note */
  getDegreeForNote?: (note: PlacedNote, state: Store['state']) => string | null;
  /** Check if degree has accidental */
  hasAccidental?: (degree: string) => boolean;
  /** Logger function */
  log?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
}

/**
 * Ensure circle notes span at least 2 columns
 */
export function ensureCircleNoteSpan(note: PlacedNote): void {
  if (!note || note.isDrum) return;
  if (note.shape === 'circle' && typeof note.startColumnIndex === 'number') {
    const minimumEnd = note.startColumnIndex + 1;
    if (typeof note.endColumnIndex !== 'number' || note.endColumnIndex < minimumEnd) {
      note.endColumnIndex = minimumEnd as CanvasSpaceColumn;
    }
  }
}

/**
 * Clamps and synchronizes a note's row and globalRow to valid bounds.
 *
 * WARNING: This function uses globalRow as the source of truth, NOT row.
 * If called after setting note.row to a new value, it will OVERWRITE that
 * value with the (unchanged) globalRow, effectively reverting the change.
 *
 * This is intentional for operations like:
 * - Loading notes from file (where globalRow is the authoritative position)
 * - Adding new notes (to clamp to valid row range)
 *
 * DO NOT call this from updateNoteRow() during drag operations, as it will
 * cause the visual note position to not update. See updateNoteRow() for details.
 *
 * @param note - The note to update
 * @param fullRowData - The pitch row data for bounds checking
 */
function updateGlobalRow(note: PlacedNote, fullRowData: PitchRowData[]): void {
  if (typeof note.row !== 'number') return;
  const maxRowIndex = fullRowData.length > 0 ? fullRowData.length - 1 : -1;
  if (maxRowIndex < 0) return;

  // Use globalRow as source of truth, falling back to row if globalRow not set
  const candidate = typeof note.globalRow === 'number' ? note.globalRow : note.row;
  const globalRow = Math.max(0, Math.min(maxRowIndex, Math.round(candidate)));

  // Sync both properties to the clamped value
  note.globalRow = globalRow;
  note.row = globalRow;
}

/**
 * Generate a UUID for notes/tonic signs
 */
function generateUUID(): string {
  return `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create note action methods bound to a store instance
 */
export function createNoteActions(callbacks: NoteActionCallbacks = {}) {
  const {
    getMacrobeatInfo,
    getDegreeForNote,
    hasAccidental,
    log = () => {}
  } = callbacks;

  return {
    /**
     * Adds a note to the state.
     * IMPORTANT: This function no longer records history. The calling function is responsible for that.
     */
    addNote(this: Store, note: Partial<PlacedNote>): PlacedNote | null {
      // Check if there's already a note of the same color at the same position (row + startColumnIndex)
      const existingNote = this.state.placedNotes.find(existingNote =>
        !existingNote.isDrum &&
        existingNote.row === note.row &&
        existingNote.startColumnIndex === note.startColumnIndex &&
        existingNote.color === note.color
      );

      if (existingNote) {
        // Check if Show Degrees is ON and we can toggle enharmonic equivalents
        if (this.state.degreeDisplayMode !== 'off' && getDegreeForNote && hasAccidental) {
          // Get the current degree for this existing note
          const currentDegree = getDegreeForNote(existingNote, this.state);

          // Check if the degree has an accidental that can be toggled
          if (currentDegree && hasAccidental(currentDegree)) {
            // Toggle the enharmonic preference
            existingNote.enharmonicPreference = !existingNote.enharmonicPreference;

            log('debug', '[ENHARMONIC] Toggled enharmonic preference for note', {
              noteUuid: existingNote.uuid,
              currentDegree,
              enharmonicPreference: existingNote.enharmonicPreference
            });

            // Emit change to trigger re-render
            this.emit('notesChanged');
            return existingNote;
          }
        }

        // Don't add the note if there's already one of the same color at this position
        // and no enharmonic toggle was possible
        return null;
      }

      const noteWithId: PlacedNote = { ...note, uuid: generateUUID() } as PlacedNote;
      ensureCircleNoteSpan(noteWithId);
      updateGlobalRow(noteWithId, this.state.fullRowData);
      this.state.placedNotes.push(noteWithId);
      this.emit('notesChanged');
      return noteWithId;
    },

    updateNoteTail(this: Store, note: PlacedNote, newEndColumn: CanvasSpaceColumn): void {
      let nextEnd = newEndColumn;
      if (note.shape === 'circle') {
        nextEnd = Math.max(note.startColumnIndex + 1, newEndColumn) as CanvasSpaceColumn;
      }
      note.endColumnIndex = nextEnd as CanvasSpaceColumn;
      this.emit('notesChanged');
    },

    updateMultipleNoteTails(this: Store, notes: PlacedNote[], newEndColumn: CanvasSpaceColumn): void {
      notes.forEach((note) => {
        let nextEnd = newEndColumn;
        if (note.shape === 'circle') {
          nextEnd = Math.max(note.startColumnIndex + 1, newEndColumn) as CanvasSpaceColumn;
        }
        note.endColumnIndex = nextEnd as CanvasSpaceColumn;
      });
      this.emit('notesChanged');
    },

    /**
     * Updates a note's row position during drag operations.
     *
     * IMPORTANT: This function sets both `row` and `globalRow` directly.
     * We intentionally skip calling updateGlobalRow() because it would
     * use the OLD globalRow value as a candidate, then overwrite our
     * newly-set row back to the old value. This was the root cause of
     * a bug where notes wouldn't visually move during drag.
     *
     * The relationship between row and globalRow:
     * - `row`: The current visual row position (used for rendering)
     * - `globalRow`: The row in global pitch data coordinates (survives view changes)
     * During interactive drag, these should always be kept in sync.
     */
    updateNoteRow(this: Store, note: PlacedNote, newRow: number): void {
      // Update both row and globalRow to the new value to keep them in sync
      note.row = newRow;
      note.globalRow = newRow;
      this.emit('notesChanged');
    },

    updateMultipleNoteRows(this: Store, notes: PlacedNote[], rowOffsets: number[]): void {
      notes.forEach((note, index) => {
        const offset = rowOffsets[index];
        if (offset !== undefined) {
          note.row = offset;
          updateGlobalRow(note, this.state.fullRowData);
        }
      });
      this.emit('notesChanged');
    },

    updateNotePosition(this: Store, note: PlacedNote, newStartColumn: CanvasSpaceColumn): void {
      note.startColumnIndex = newStartColumn;
      note.endColumnIndex = (note.shape === 'circle'
        ? newStartColumn + 1
        : newStartColumn) as CanvasSpaceColumn; // Oval notes have startColumn === endColumn
      this.emit('notesChanged');
    },

    updateMultipleNotePositions(this: Store, notes: PlacedNote[], newStartColumn: CanvasSpaceColumn): void {
      notes.forEach((note) => {
        note.startColumnIndex = newStartColumn;
        note.endColumnIndex = (note.shape === 'circle'
          ? newStartColumn + 1
          : newStartColumn) as CanvasSpaceColumn; // Oval notes have startColumn === endColumn
      });
      this.emit('notesChanged');
    },

    removeNote(this: Store, note: PlacedNote): void {
      const index = this.state.placedNotes.indexOf(note);
      if (index > -1) {
        this.state.placedNotes.splice(index, 1);
        this.emit('notesChanged');
      }
    },

    removeMultipleNotes(this: Store, notes: PlacedNote[]): void {
      const noteSet = new Set(notes);
      this.state.placedNotes = this.state.placedNotes.filter(note => !noteSet.has(note));
      this.emit('notesChanged');
    },

    eraseInPitchArea(this: Store, col: CanvasSpaceColumn, row: number, width = 1, record = true): boolean {
      const eraseEndCol = col + width - 1;
      const eraseStartRow = row - 1; // Eraser starts 1 row above
      const eraseEndRow = row + 1; // Eraser covers 3 rows: row-1, row, row+1
      let wasErased = false;

      const initialNoteCount = this.state.placedNotes.length;
      this.state.placedNotes = this.state.placedNotes.filter(note => {
        if (note.isDrum) return true;

        // For circle notes, check if their 2×1 footprint intersects with eraser's 2×3 area
        if (note.shape === 'circle') {
          const minSpanEnd = note.startColumnIndex + 1;
          const noteEndCol = typeof note.endColumnIndex === 'number'
            ? Math.max(minSpanEnd, note.endColumnIndex)
            : minSpanEnd;
          // Circle notes only span 1 row (note.row)

          // Check for any overlap between note's 2×1 area and eraser's 2×3 area
          const horizontalOverlap = note.startColumnIndex <= eraseEndCol && noteEndCol >= col;
          const verticalOverlap = note.row >= eraseStartRow && note.row <= eraseEndRow;

          if (horizontalOverlap && verticalOverlap) {
            return false; // Remove this note
          }
        } else {
          // For non-circle notes, check if note overlaps with eraser's 2×3 coverage area
          const noteInEraseArea = note.row >= eraseStartRow && note.row <= eraseEndRow &&
            note.startColumnIndex <= eraseEndCol && note.endColumnIndex >= col;

          if (noteInEraseArea) {
            return false; // Remove this note
          }
        }

        return true; // Keep this note
      });

      if (this.state.placedNotes.length < initialNoteCount) {
        wasErased = true;
      }

      if (wasErased) {
        this.emit('notesChanged');
        if (record) this.recordState();
      }
      return wasErased;
    },

    addTonicSignGroup(
      this: Store,
      tonicSignGroup: Array<Pick<TonicSign, 'preMacrobeatIndex' | 'columnIndex' | 'row' | 'tonicNumber' | 'globalRow' | 'uuid'>>
    ): void {
      log('debug', 'Starting addTonicSignGroup', { tonicSignGroup });

      const firstSign = tonicSignGroup[0];
      if (!firstSign) return;

      const { preMacrobeatIndex } = firstSign;
      log('debug', 'preMacrobeatIndex', { preMacrobeatIndex });

      // If a tonic already exists for this measure, do nothing (no replacement).
      const existingEntry = Object.entries(this.state.tonicSignGroups).find(([, group]) =>
        group.some(ts => ts.preMacrobeatIndex === preMacrobeatIndex)
      );
      if (existingEntry) {
        log('debug', 'Existing tonic already present for measure, skipping', { preMacrobeatIndex });
        return;
      }

      if (!getMacrobeatInfo) {
        log('error', 'getMacrobeatInfo callback not provided');
        return;
      }

      // boundaryColumn is canvas-space (0 = first musical beat) from getMacrobeatInfo
      const boundaryColumn = getMacrobeatInfo(this.state, preMacrobeatIndex + 1).startColumn as CanvasSpaceColumn;
      log('debug', 'Boundary column (canvas-space) for shifting notes', { boundaryColumn });

      const notesToShift = this.state.placedNotes.filter(note => note.startColumnIndex >= boundaryColumn);
      log('debug', 'Notes that will be shifted', {
        noteRanges: notesToShift.map(n => `${n.startColumnIndex}-${n.endColumnIndex}`)
      });

      // Shift notes right by 2 columns (in canvas-space) to make room for tonic sign
      this.state.placedNotes.forEach(note => {
        if (note.startColumnIndex >= boundaryColumn) {
          const oldStart = note.startColumnIndex;
          const oldEnd = note.endColumnIndex;
          note.startColumnIndex = (note.startColumnIndex + 2) as CanvasSpaceColumn;
          note.endColumnIndex = (note.endColumnIndex + 2) as CanvasSpaceColumn;
          log('debug', `Shifted note from ${oldStart}-${oldEnd} to ${note.startColumnIndex}-${note.endColumnIndex}`);
        }
      });

      const uuid = generateUUID();
      const groupWithId = tonicSignGroup.map(sign => ({
        ...sign,
        uuid,
        globalRow: typeof sign.globalRow === 'number' ? sign.globalRow : sign.row
      }));
      this.state.tonicSignGroups[uuid] = groupWithId as TonicSign[];
      log('debug', 'Added tonic group', { uuid, columns: groupWithId.map(s => s.columnIndex) });

      log('debug', 'Emitting events: notesChanged, rhythmStructureChanged');
      this.emit('notesChanged');
      this.emit('rhythmStructureChanged');
      this.recordState();
    },

    /**
     * Erases tonic sign at the specified column index (canvas-space)
     */
    eraseTonicSignAt(this: Store, columnIndex: CanvasSpaceColumn, record = true): boolean {
      // Find any tonic group that has a sign at this column
      const tonicGroupToDelete = Object.entries(this.state.tonicSignGroups).find(([, group]) =>
        group.some(sign => sign.columnIndex === columnIndex)
      );

      if (!tonicGroupToDelete) {
        return false; // No tonic sign found at this column
      }

      if (!getMacrobeatInfo) {
        log('error', 'getMacrobeatInfo callback not provided');
        return false;
      }

      const [uuidToDelete, groupToDelete] = tonicGroupToDelete;
      const firstSign = groupToDelete[0];
      if (!firstSign) return false;

      const preMacrobeatIndex = firstSign.preMacrobeatIndex;
      // boundaryColumn is canvas-space (0 = first musical beat) from getMacrobeatInfo
      const boundaryColumn = getMacrobeatInfo(this.state, preMacrobeatIndex + 1).startColumn as CanvasSpaceColumn;

      // Remove the tonic group
      delete this.state.tonicSignGroups[uuidToDelete];

      // Shift all notes that come after the tonic column back by 2 (in canvas-space)
      this.state.placedNotes.forEach(note => {
        if (note.startColumnIndex >= boundaryColumn) {
          note.startColumnIndex = (note.startColumnIndex - 2) as CanvasSpaceColumn;
          note.endColumnIndex = (note.endColumnIndex - 2) as CanvasSpaceColumn;
        }
      });

      this.emit('notesChanged');
      this.emit('rhythmStructureChanged');

      if (record) {
        this.recordState();
      }

      return true;
    },

    clearAllNotes(this: Store): void {
      this.state.placedNotes = [];
      this.state.tonicSignGroups = {};
      this.emit('notesChanged');
      this.emit('rhythmStructureChanged');
      this.recordState();
    },

    loadNotes(this: Store, importedNotes: Partial<PlacedNote>[]): void {
      const normalizedNotes = (importedNotes || []).map(note => {
        const normalizedNote: PlacedNote = {
          ...note,
          uuid: note?.uuid ?? generateUUID()
        } as PlacedNote;
        ensureCircleNoteSpan(normalizedNote);
        updateGlobalRow(normalizedNote, this.state.fullRowData);
        return normalizedNote;
      });
      this.state.placedNotes = normalizedNotes;
      this.emit('notesChanged');
      this.recordState();
    }
  };
}
