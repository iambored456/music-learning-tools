// js/services/keyboardHandler.ts
import { copyLassoSelection, hasLassoClipboardContent, pasteLassoClipboard } from './annotation/annotationLassoClipboard.ts';
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

export function initKeyboardHandler(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const activeElement = document.activeElement;
    if (!activeElement) {return;}

    const tagName = activeElement.tagName.toLowerCase();
    const isEditable = (activeElement as HTMLElement).contentEditable === 'true';
    if (['input', 'textarea'].includes(tagName) || isEditable) {
      return;
    }
    const isShortcut = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

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

    let handled = false;
    switch (e.key) {
      case 'Backspace':
      case 'Delete':
        // Delete all items in lasso selection
        if (store.state.lassoSelection?.isActive) {
          const selectedItems = store.state.lassoSelection.selectedItems;

          selectedItems.forEach(item => {
            if (item.type === 'note') {
              const noteData = item.data as PlacedNote;
              const noteIndex = store.state.placedNotes.findIndex(note => note.uuid === noteData.uuid);
              if (noteIndex !== -1) {
                store.state.placedNotes.splice(noteIndex, 1);
              }
            } else if (item.type === 'sixteenthStamp') {
              const stampData = item.data as SixteenthStampPlacement;
              const stampIndex = store.state.sixteenthStampPlacements.findIndex(stamp => stamp.id === stampData.id);
              if (stampIndex !== -1) {
                store.state.sixteenthStampPlacements.splice(stampIndex, 1);
              }
            } else if (item.type === 'tripletStamp') {
              const tripletData = item.data as TripletStampPlacement;
              const tripletIndex = store.state.tripletStampPlacements.findIndex(triplet => triplet.id === tripletData.id);
              if (tripletIndex !== -1) {
                store.state.tripletStampPlacements.splice(tripletIndex, 1);
              }
            } else if (item.type === 'sixteenthThreeStamp') {
              const stampData = item.data as SixteenthThreeStampPlacement;
              const stampIndex = store.state.sixteenthThreeStampPlacements.findIndex(stamp => stamp.id === stampData.id);
              if (stampIndex !== -1) {
                store.state.sixteenthThreeStampPlacements.splice(stampIndex, 1);
              }
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
  });
  logger.info('KeyboardHandler', 'Initialized', null, 'keyboard');
}



