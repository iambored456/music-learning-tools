import store from '@state/initStore.ts';
import audioPreviewService from '@services/audioPreviewService.ts';
import GlobalService from '@services/globalService.ts';
import rhythmPlaybackService from '@services/rhythmPlaybackService.ts';
import { isNotePlayableAtColumn } from '@/utils/tonicColumnUtils.ts';
import type { CanvasSpaceColumn, PlacedNote } from '@app-types/state.js';

export interface PitchGridNoteToolState {
  activeNote: PlacedNote | null;
  lastDragRow: number | null;
  activePreviewPitches: string[];
}

export class PitchGridNoteToolInteractor {
  handleExistingNoteMouseDown(
    colIndex: number,
    rowIndex: number,
    state: PitchGridNoteToolState,
    opts: {
      getPitchForRow: (rowIndex: number) => string | null;
    }
  ): { handled: boolean; state: PitchGridNoteToolState } {
    if (store.state.selectedTool !== 'note') {
      return { handled: false, state };
    }

    const existingNote = store.state.placedNotes.find(note =>
      !note.isDrum &&
      note.row === rowIndex &&
      colIndex >= note.startColumnIndex &&
      colIndex <= note.endColumnIndex
    );

    if (!existingNote) {
      return { handled: false, state };
    }

    const pitch = opts.getPitchForRow(rowIndex);
    if (!pitch) {
      return { handled: true, state };
    }

    const staticWaveform = window.waveformVisualizer;
    if (staticWaveform) {
      staticWaveform.currentColor = existingNote.color;
      staticWaveform.generateWaveform();
      staticWaveform.startSingleNoteVisualization(existingNote.color);
    }

    const stamp = rhythmPlaybackService.getSixteenthStampAtPosition(colIndex, rowIndex);
    if (stamp) {
      rhythmPlaybackService.playRhythmPattern(stamp.sixteenthStampId, pitch, existingNote.color, existingNote.shape, stamp);
      return {
        handled: true,
        state: {
          ...state,
          activePreviewPitches: [pitch],
          activeNote: existingNote
        }
      };
    }

    audioPreviewService.triggerAttack(pitch, existingNote.color, { kind: 'single', bypassThrottle: true });
    const pitchColor = store.state.fullRowData[rowIndex]?.hex || '#888888';
    const adsr = store.state.timbres[existingNote.color]?.adsr;
    if (adsr) {
      GlobalService.adsrComponent?.playheadManager.trigger(existingNote.uuid, 'attack', pitchColor, adsr);
    }

    return {
      handled: true,
      state: {
        ...state,
        activePreviewPitches: [pitch],
        activeNote: existingNote
      }
    };
  }

  attemptPlaceNoteAt(
    colIndex: number,
    rowIndex: number,
    state: PitchGridNoteToolState,
    placementFillNoteIds: Set<string>,
    opts: {
      getPitchForRow: (rowIndex: number) => string | null;
    }
  ): { placed: boolean; state: PitchGridNoteToolState; shouldStartDragging: boolean } {
    if (store.state.selectedTool !== 'note') {
      return { placed: false, state, shouldStartDragging: false };
    }

    if (!isNotePlayableAtColumn(colIndex, store.state)) {
      return { placed: false, state, shouldStartDragging: false };
    }

    const selectedNote = store.state.selectedNote;
    if (!selectedNote) {
      return { placed: false, state, shouldStartDragging: false };
    }

    const { shape, color } = selectedNote;

    // For circle notes (2-column span), also check the second column.
    if (shape === 'circle' && !isNotePlayableAtColumn(colIndex + 1, store.state)) {
      return { placed: false, state, shouldStartDragging: false };
    }

    const defaultEndColumn = (shape === 'circle' ? colIndex + 1 : colIndex) as CanvasSpaceColumn;
    const newNote: Partial<PlacedNote> = {
      row: rowIndex,
      startColumnIndex: colIndex as CanvasSpaceColumn,
      endColumnIndex: defaultEndColumn,
      color,
      shape,
      isDrum: false
    };

    const addedNote = store.addNote(newNote);
    if (!addedNote) {
      return { placed: false, state, shouldStartDragging: false };
    }

    const nextState: PitchGridNoteToolState = {
      ...state,
      activeNote: addedNote,
      lastDragRow: rowIndex
    };

    if (addedNote.uuid) {
      store.emit('noteInteractionStart', { noteId: addedNote.uuid, color: addedNote.color });
    }

    const pitch = opts.getPitchForRow(rowIndex);
    if (pitch) {
      if (addedNote.uuid) {
        placementFillNoteIds.add(addedNote.uuid);
        store.emit('noteAttack', { noteId: addedNote.uuid, color: addedNote.color });
      }

      nextState.activePreviewPitches = [pitch];
      audioPreviewService.triggerAttack(pitch, addedNote.color, { kind: 'single', bypassThrottle: true });

      const pitchColor = store.state.fullRowData[rowIndex]?.hex || '#888888';
      const adsr = store.state.timbres[addedNote.color]?.adsr;
      if (adsr) {
        GlobalService.adsrComponent?.playheadManager.trigger(
          addedNote.uuid,
          'attack',
          pitchColor,
          adsr
        );
      }

      const staticWaveform = window.waveformVisualizer;
      if (staticWaveform) {
        staticWaveform.currentColor = addedNote.color;
        staticWaveform.generateWaveform();
        staticWaveform.startSingleNoteVisualization(addedNote.color);
      }
    }

    return { placed: true, state: nextState, shouldStartDragging: true };
  }

  handleActiveNoteDrag(
    colIndex: number,
    rowIndex: number,
    state: PitchGridNoteToolState,
    opts: {
      getPitchForRow: (rowIndex: number) => string | null;
    }
  ): PitchGridNoteToolState {
    const activeNote = state.activeNote;
    if (!activeNote) {
      return state;
    }

    const newEndIndex = colIndex;
    const newRow = rowIndex;
    const activeNoteUuid = activeNote.uuid;

    if (activeNote.shape === 'circle') {
      if (newEndIndex !== activeNote.endColumnIndex) {
        store.updateNoteTail(activeNote, newEndIndex as CanvasSpaceColumn);
      }

      if (newRow !== state.lastDragRow) {
        const newPitch = opts.getPitchForRow(newRow);
        if (!newPitch) {
          return state;
        }

        if (state.activePreviewPitches.length > 0) {
          audioPreviewService.quickReleasePitches(state.activePreviewPitches, activeNote.color);
        }

        const currentNoteRef = store.state.placedNotes.find(n => n.uuid === activeNoteUuid);
        if (currentNoteRef) {
          store.updateNoteRow(currentNoteRef, newRow);
        }

        const refreshedNoteRef = store.state.placedNotes.find(n => n.uuid === activeNoteUuid);
        const nextActiveNote = refreshedNoteRef || currentNoteRef || activeNote;

        let nextPreviewPitches = state.activePreviewPitches;
        if (audioPreviewService.triggerAttack(newPitch, nextActiveNote.color, { kind: 'single' })) {
          nextPreviewPitches = [newPitch];
        }

        const pitchColor = store.state.fullRowData[newRow]?.hex || '#888888';
        const adsr = store.state.timbres[nextActiveNote.color]?.adsr;
        if (adsr && nextActiveNote.uuid) {
          GlobalService.adsrComponent?.playheadManager.trigger(nextActiveNote.uuid, 'attack', pitchColor, adsr);
        }

        return {
          ...state,
          activeNote: nextActiveNote,
          lastDragRow: newRow,
          activePreviewPitches: nextPreviewPitches
        };
      }

      return state;
    }

    // Oval notes: reposition horizontally and allow vertical pitch changes.
    if (activeNote.shape === 'oval') {
      const newStartIndex = colIndex;
      if (newStartIndex !== activeNote.startColumnIndex) {
        store.updateNotePosition(activeNote, newStartIndex as CanvasSpaceColumn);
      }

      if (newRow !== state.lastDragRow) {
        const newPitch = opts.getPitchForRow(newRow);
        if (!newPitch) {
          return state;
        }

        if (state.activePreviewPitches.length > 0) {
          audioPreviewService.quickReleasePitches(state.activePreviewPitches, activeNote.color);
        }

        const currentNoteRef = store.state.placedNotes.find(n => n.uuid === activeNoteUuid);
        if (currentNoteRef) {
          store.updateNoteRow(currentNoteRef, newRow);
        }

        const refreshedNoteRef = store.state.placedNotes.find(n => n.uuid === activeNoteUuid);
        const nextActiveNote = refreshedNoteRef || currentNoteRef || activeNote;

        let nextPreviewPitches = state.activePreviewPitches;
        if (audioPreviewService.triggerAttack(newPitch, nextActiveNote.color, { kind: 'single' })) {
          nextPreviewPitches = [newPitch];
        }

        const pitchColor = store.state.fullRowData[newRow]?.hex || '#888888';
        const adsr = store.state.timbres[nextActiveNote.color]?.adsr;
        if (adsr && nextActiveNote.uuid) {
          GlobalService.adsrComponent?.playheadManager.trigger(nextActiveNote.uuid, 'attack', pitchColor, adsr);
        }

        return {
          ...state,
          activeNote: nextActiveNote,
          lastDragRow: newRow,
          activePreviewPitches: nextPreviewPitches
        };
      }
    }

    return state;
  }
}
