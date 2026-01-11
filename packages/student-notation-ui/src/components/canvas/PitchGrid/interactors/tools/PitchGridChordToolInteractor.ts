import store from '@state/initStore.ts';
import audioPreviewService from '@services/audioPreviewService.ts';
import GlobalService from '@services/globalService.ts';
import { isNotePlayableAtColumn } from '@/utils/tonicColumnUtils.ts';
import type { CanvasSpaceColumn, PlacedNote } from '@app-types/state.js';

export interface PitchGridChordToolState {
  activeChordNotes: PlacedNote[];
  lastDragRow: number | null;
  activePreviewPitches: string[];
}

export class PitchGridChordToolInteractor {
  handleMouseDown(
    colIndex: number,
    rowIndex: number,
    state: PitchGridChordToolState,
    placementFillNoteIds: Set<string>,
    opts: {
      getPitchForRow: (rowIndex: number) => string | null;
      getChordPitchesForRootPitch: (rootPitch: string) => string[];
    }
  ): { handled: boolean; state: PitchGridChordToolState; shouldStartDragging: boolean } {
    if (store.state.selectedTool !== 'chord') {
      return { handled: false, state, shouldStartDragging: false };
    }

    if (!isNotePlayableAtColumn(colIndex, store.state)) {
      return { handled: true, state, shouldStartDragging: false };
    }

    const rootPitch = opts.getPitchForRow(rowIndex);
    if (!rootPitch) {
      return { handled: true, state, shouldStartDragging: false };
    }

    const chordPitches = opts.getChordPitchesForRootPitch(rootPitch);
    const selectedNote = store.state.selectedNote;
    if (!selectedNote) {
      return { handled: true, state, shouldStartDragging: false };
    }
    const { shape, color } = selectedNote;

    audioPreviewService.triggerAttacks(chordPitches, color, { kind: 'chord', bypassThrottle: true });

    const pitchColor = store.state.fullRowData[rowIndex]?.hex || '#888888';
    const chordAdsr = store.state.timbres[color]?.adsr;
    if (chordAdsr) {
      GlobalService.adsrComponent?.playheadManager.trigger('chord_preview', 'attack', pitchColor, chordAdsr);
    }

    const nextChordNotes: PlacedNote[] = [];
    chordPitches.forEach(noteName => {
      const noteRow = store.state.fullRowData.findIndex(r => r.toneNote === noteName);
      if (noteRow === -1) {
        return;
      }

      const defaultEndColumn = (shape === 'circle' ? colIndex + 1 : colIndex) as CanvasSpaceColumn;
      const newNote: Partial<PlacedNote> = {
        row: noteRow,
        startColumnIndex: colIndex as CanvasSpaceColumn,
        endColumnIndex: defaultEndColumn,
        color,
        shape,
        isDrum: false
      };

      const addedNote = store.addNote(newNote);
      if (!addedNote) {
        return;
      }

      nextChordNotes.push(addedNote);

      if (addedNote.uuid) {
        placementFillNoteIds.add(addedNote.uuid);
        store.emit('noteAttack', { noteId: addedNote.uuid, color: addedNote.color });
        store.emit('noteInteractionStart', { noteId: addedNote.uuid, color: addedNote.color });
      }
    });

    return {
      handled: true,
      shouldStartDragging: true,
      state: {
        ...state,
        activeChordNotes: nextChordNotes,
        activePreviewPitches: [...chordPitches],
        lastDragRow: rowIndex
      }
    };
  }

  handleActiveChordDrag(
    colIndex: number,
    rowIndex: number,
    state: PitchGridChordToolState,
    opts: {
      getPitchForRow: (rowIndex: number) => string | null;
    }
  ): PitchGridChordToolState {
    if (!state.activeChordNotes || state.activeChordNotes.length === 0) {
      return state;
    }

    const firstChordNote = state.activeChordNotes[0];
    if (!firstChordNote) {
      return state;
    }

    const chordColor = firstChordNote.color;
    const newRow = rowIndex;

    if (firstChordNote.shape === 'circle') {
      const newEndIndex = colIndex as CanvasSpaceColumn;
      const notesToUpdate = state.activeChordNotes.filter(note => newEndIndex !== note.endColumnIndex);
      if (notesToUpdate.length > 0) {
        store.updateMultipleNoteTails(notesToUpdate, newEndIndex);
      }

      if (newRow !== state.lastDragRow) {
        const baseRow = state.lastDragRow ?? firstChordNote.row;
        const rowOffset = newRow - baseRow;
        if (rowOffset === 0) {
          return state;
        }

        audioPreviewService.quickReleasePitches(state.activePreviewPitches, chordColor);

        const newRows = state.activeChordNotes.map(note => note.row + rowOffset);
        const allValid = newRows.every(row => opts.getPitchForRow(row) !== null);
        if (!allValid) {
          return state;
        }

        store.updateMultipleNoteRows(state.activeChordNotes, newRows);

        const newPitches = newRows
          .map(row => opts.getPitchForRow(row))
          .filter((p): p is string => typeof p === 'string');

        audioPreviewService.triggerAttacks(newPitches, chordColor, { kind: 'chord' });

        return {
          ...state,
          activePreviewPitches: newPitches,
          lastDragRow: newRow
        };
      }

      return state;
    }

    if (firstChordNote.shape === 'oval') {
      const newStartIndex = colIndex as CanvasSpaceColumn;
      const notesToUpdate = state.activeChordNotes.filter(note => newStartIndex !== note.startColumnIndex);
      if (notesToUpdate.length > 0) {
        store.updateMultipleNotePositions(notesToUpdate, newStartIndex);
      }

      const baseRow = state.lastDragRow !== null ? state.lastDragRow : firstChordNote.row;
      const rowOffset = newRow - baseRow;
      if (rowOffset === 0) {
        return state;
      }

      audioPreviewService.quickReleasePitches(state.activePreviewPitches, chordColor);

      const newRows = state.activeChordNotes.map(note => note.row + rowOffset);
      const allValid = newRows.every(row => opts.getPitchForRow(row) !== null);
      if (!allValid) {
        return state;
      }

      store.updateMultipleNoteRows(state.activeChordNotes, newRows);

      const newPitches = newRows
        .map(row => opts.getPitchForRow(row))
        .filter((p): p is string => typeof p === 'string');

      audioPreviewService.triggerAttacks(newPitches, chordColor, { kind: 'chord' });

      return {
        ...state,
        activePreviewPitches: newPitches,
        lastDragRow: newRow
      };
    }

    return state;
  }
}
