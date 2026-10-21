// js/services/keyboardHandler.ts
import { copyLassoSelection, hasLassoClipboardContent, pasteLassoClipboard } from './annotation/annotationLassoClipboard.ts';
import { selectAllPitchGridNotes } from './annotation/annotationLassoSelection.ts';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import type { PlacedNote, SixteenthStampPlacement, SixteenthThreeStampPlacement, TripletStampPlacement } from '@mlt/types';

logger.moduleLoaded('KeyboardHandler', 'keyboard');

function getLassoRenderOptions() {
  return {
    columnWidths: store.state.columnWidths,
    cellWidth: store.state.cellWidth,
    cellHeight: store.state.cellHeight,
    tempoModulationMarkers: store.state.tempoModulationMarkers,
    baseMicrobeatPx: store.state.cellWidth
  };
}

function emitLassoPasteChanges(changed: {
  notes: boolean;
  sixteenthStamps: boolean;
  sixteenthThreeStamps: boolean;
  tripletStamps: boolean;
}): void {
  if (changed.notes) {
    store.emit('notesChanged');
  }
  if (changed.sixteenthStamps) {
    store.emit('sixteenthStampPlacementsChanged');
  }
  if (changed.sixteenthThreeStamps) {
    store.emit('sixteenthThreeStampPlacementsChanged');
  }
  if (changed.tripletStamps) {
    store.emit('tripletStampPlacementsChanged');
  }
}

function handleKeyDown(e: KeyboardEvent): void {
    const activeElement = document.activeElement;
    if (!activeElement) {return;}

    const tagName = activeElement.tagName.toLowerCase();
    const isEditable = (activeElement as HTMLElement).isContentEditable;
    if (['input', 'textarea', 'select'].includes(tagName) || isEditable) {
      return;
    }
    if (e.key === 'Escape') {
      store.setSelectedTool('select');
      e.preventDefault();
      return;
    }
    const isShortcut = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (isShortcut && key === 'a' && !e.altKey) {
      e.preventDefault();
      // Changing tools may finish an interaction and clear its previous selection.
      store.setSelectedTool('select');
      store.setPlaybackStartMacrobeat(null);
      store.state.lassoSelection = selectAllPitchGridNotes(store.state, getLassoRenderOptions());
      store.emit('selectionChanged', store.state.lassoSelection);
      store.emit('render');
      return;
    }

    // Handle Ctrl+P for printing
    if (isShortcut && key === 'p') {
      e.preventDefault(); // Prevent browser's default print dialog
      logger.info('KeyboardHandler', 'Ctrl+P pressed. Opening print preview', null, 'keyboard');
      store.emit('printPreviewStateChanged', true);
      return; // Stop further processing for this event
    }

    // Handle Ctrl+Z for undo
    if (isShortcut && key === 'z') {
      e.preventDefault();
      (store as { undo: () => void }).undo();
      return;
    }

    // Handle Ctrl+Y for redo
    if (isShortcut && key === 'y') {
      e.preventDefault();
      (store as { redo: () => void }).redo();
      return;
    }

    // Handle Ctrl+C for lasso selection copy
    if (isShortcut && key === 'c') {
      const copiedCount = copyLassoSelection(store.state.lassoSelection);
      if (copiedCount > 0) {
        e.preventDefault();
        logger.info('KeyboardHandler', `Copied ${copiedCount} lasso-selected items`, null, 'keyboard');
      }
      return;
    }

    // Handle Ctrl+V for lasso clipboard paste
    if (isShortcut && key === 'v') {
      if (!hasLassoClipboardContent()) {
        return;
      }

      const pasteResult = pasteLassoClipboard(store.state, getLassoRenderOptions());
      e.preventDefault();

      if (pasteResult) {
        store.state.lassoSelection = pasteResult.selection;
        store.recordState();
        emitLassoPasteChanges(pasteResult.changed);
        store.emit('render');
        logger.info('KeyboardHandler', `Pasted ${pasteResult.pastedCount} lasso-selected items`, null, 'keyboard');
      }
      return;
    }

    const isCut = isShortcut && key === 'x' && !e.altKey;
    if (isCut && copyLassoSelection(store.state.lassoSelection) === 0) return;

    let handled = false;
    switch (isCut ? 'Delete' : e.key) {
      case 'Backspace':
      case 'Delete':
        // Delete all items in lasso selection
        if (store.state.lassoSelection?.isActive) {
          // Cut removes only the note/stamp types that the clipboard can restore.
          const selectedItems = store.state.lassoSelection.selectedItems.filter(item => !isCut
            || ['note', 'sixteenthStamp', 'sixteenthThreeStamp', 'tripletStamp'].includes(item.type));

          selectedItems.forEach(item => {
            if (item.type === 'note') {
              const noteData = item.data as PlacedNote;
              const noteIndex = store.state.placedNotes.findIndex(note => note.uuid === noteData.uuid);
              if (noteIndex !== -1) {
                store.removeNote(store.state.placedNotes[noteIndex]!);
              }
            } else if (item.type === 'sixteenthStamp') {
              const stampData = item.data as SixteenthStampPlacement;
              store.removeSixteenthStampPlacement(stampData.id);
            } else if (item.type === 'tripletStamp') {
              const tripletData = item.data as TripletStampPlacement;
              store.removeTripletStampPlacement(tripletData.id);
            } else if (item.type === 'sixteenthThreeStamp') {
              const stampData = item.data as SixteenthThreeStampPlacement;
              store.removeSixteenthThreeStampPlacement(stampData.id);
            } else if (item.type === 'annotation') {
              const annotationIndex = store.state.annotations.indexOf(item.data);
              if (annotationIndex !== -1) store.state.annotations.splice(annotationIndex, 1);
            } else if (item.type === 'modulationMarker') {
              store.removeModulationMarker(item.data.id, false);
            } else if (item.type === 'tonicSign') {
              const group = store.state.tonicSignGroups[item.groupId];
              const firstSign = group?.[0];
              if (firstSign) store.eraseTonicSignAt(firstSign.columnIndex, false);
            }
          });

          // Clear selection
          store.state.lassoSelection = {
            selectedItems: [],
            convexHull: null,
            isActive: false
          };

          // Record state and render
          store.recordState();
          store.emit('render');
          handled = true;
          logger.info('KeyboardHandler', `Deleted ${selectedItems.length} items from lasso selection`, null, 'keyboard');
        }
        break;
    }

    if (handled) {
      e.preventDefault();
    }
}

export function initKeyboardHandler(): void {
  document.removeEventListener('keydown', handleKeyDown);
  document.addEventListener('keydown', handleKeyDown);
  logger.info('KeyboardHandler', 'Initialized', null, 'keyboard');
}



