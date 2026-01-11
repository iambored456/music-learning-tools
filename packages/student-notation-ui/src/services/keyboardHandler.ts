// js/services/keyboardHandler.ts
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import type { PlacedNote, SixteenthStampPlacement, TripletStampPlacement } from '../../types/state.js';

logger.moduleLoaded('KeyboardHandler', 'keyboard');
export function initKeyboardHandler(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const activeElement = document.activeElement;
    if (!activeElement) {return;}

    const tagName = activeElement.tagName.toLowerCase();
    const isEditable = (activeElement as HTMLElement).contentEditable === 'true';
    if (['input', 'textarea'].includes(tagName) || isEditable) {
      return;
    }
    // Handle Ctrl+P for printing
    if (e.ctrlKey && e.key.toLowerCase() === 'p') {
      e.preventDefault(); // Prevent browser's default print dialog
      logger.info('KeyboardHandler', 'Ctrl+P pressed. Opening print preview', null, 'keyboard');
      store.emit('printPreviewStateChanged', true);
      return; // Stop further processing for this event
    }

    // Handle Ctrl+Z for undo
    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      (store as { undo: () => void }).undo();
      return;
    }

    // Handle Ctrl+Y for redo
    if (e.ctrlKey && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      (store as { redo: () => void }).redo();
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



