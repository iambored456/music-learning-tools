// (file path: src/components/BeltOrderManager.ts)

import { appState } from '../state/appState.ts';
import { savePreferences, loadPreferences } from '../services/PreferencesService.ts';
import { ErrorHandler } from '../utils/ErrorHandler.ts';
import type { BeltId, Preferences } from '../types.ts';

const BELT_IDS: BeltId[] = ['pitch', 'degree', 'intervals', 'chromatic'];

export default class BeltOrderManager {
  container: HTMLElement | null;
  draggedItem: HTMLElement | null;
  dragOverItem: HTMLElement | null;
  onOrderChange: ((beltOrder: BeltId[]) => void) | null;

  constructor() {
    this.container = null;
    this.draggedItem = null;
    this.dragOverItem = null;
    this.onOrderChange = null;
    
    this.init();
  }

  init() {
    try {
      this.container = document.getElementById('belt-order-list') as HTMLElement | null;
      if (!this.container) {
        throw new Error('Belt order list container not found');
      }

      this._setupEventListeners();
      this._loadSavedOrder();
      this._updateDisplay();
      
    } catch (error) {
      ErrorHandler.handle(error, 'BeltOrderManager', () => {
        console.error('Failed to initialize Belt Order Manager');
      });
    }
  }

  _setupEventListeners() {
    if (!this.container) {
      return;
    }

    this.container.addEventListener('dragstart', this._handleDragStart.bind(this));
    this.container.addEventListener('dragover', this._handleDragOver.bind(this));
    this.container.addEventListener('dragenter', this._handleDragEnter.bind(this));
    this.container.addEventListener('dragleave', this._handleDragLeave.bind(this));
    this.container.addEventListener('drop', this._handleDrop.bind(this));
    this.container.addEventListener('dragend', this._handleDragEnd.bind(this));
  }

  _handleDragStart(event: DragEvent) {
    const target = event.target as HTMLElement | null;
    if (!target || !target.classList.contains('belt-order-item')) return;
    
    this.draggedItem = target;
    this.draggedItem.classList.add('dragging');
    
    // Set drag data
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', this.draggedItem.dataset.belt || '');
    
    // Add ghost image
    event.dataTransfer.setDragImage(this.draggedItem, 0, 0);
  }

  _handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  _handleDragEnter(event: DragEvent) {
    event.preventDefault();
    
    const target = event.target as HTMLElement | null;
    if (target?.classList.contains('belt-order-item') && 
        target !== this.draggedItem) {
      
      // Remove previous drag-over class
      if (this.dragOverItem) {
        this.dragOverItem.classList.remove('drag-over');
      }
      
      this.dragOverItem = target;
      this.dragOverItem.classList.add('drag-over');
    }
  }

  _handleDragLeave(event: DragEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.classList.contains('belt-order-item')) {
      target.classList.remove('drag-over');
    }
  }

  _handleDrop(event: DragEvent) {
    event.preventDefault();
    
    if (!this.draggedItem || !this.dragOverItem) return;
    
    try {
      const draggedBelt = this.draggedItem.dataset.belt as BeltId | undefined;
      const targetBelt = this.dragOverItem.dataset.belt as BeltId | undefined;
      if (!draggedBelt || !targetBelt || !BELT_IDS.includes(draggedBelt) || !BELT_IDS.includes(targetBelt)) {
        return;
      }
      
      this._reorderBelts(draggedBelt, targetBelt);
      this._saveOrder();
      this._updateDisplay();
      this._applyBeltOrder();
      
      // Announce change for accessibility
      this._announceOrderChange(draggedBelt, targetBelt);
      
    } catch (error) {
      ErrorHandler.handle(error, 'BeltOrderManager', () => {
        console.error('Failed to handle belt reordering');
      });
    }
  }

  _handleDragEnd(event: DragEvent) {
    // Clean up drag states
    if (this.draggedItem) {
      this.draggedItem.classList.remove('dragging');
      this.draggedItem = null;
    }
    
    if (this.dragOverItem) {
      this.dragOverItem.classList.remove('drag-over');
      this.dragOverItem = null;
    }
    
    // Remove any remaining drag-over classes
    if (this.container) {
      this.container.querySelectorAll('.drag-over').forEach(item => {
        (item as HTMLElement).classList.remove('drag-over');
      });
    }
  }

  _reorderBelts(draggedBelt: BeltId, targetBelt: BeltId) {
    const currentOrder = [...appState.belts.order];
    const draggedIndex = currentOrder.indexOf(draggedBelt);
    const targetIndex = currentOrder.indexOf(targetBelt);
    
    console.log('=== BELT ORDER MANAGER REORDER DEBUG ===', {
      draggedBelt,
      targetBelt,
      currentOrder: [...currentOrder],
      draggedIndex,
      targetIndex
    });
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Remove dragged item and insert at target position
    currentOrder.splice(draggedIndex, 1);
    // Fix: Use proper logic to place after target instead of before
    const newTargetIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    
    console.log('BeltOrderManager reorder calculation:', {
      afterRemoval: [...currentOrder],
      newTargetIndex,
      calculation: `${draggedIndex} < ${targetIndex} ? ${targetIndex} : ${targetIndex + 1}`,
      explanation: draggedIndex < targetIndex ? 'Moving forward: place after target' : 'Moving backward: place after target'
    });
    
    currentOrder.splice(newTargetIndex, 0, draggedBelt);
    
    console.log('Final BeltOrderManager order:', [...currentOrder]);
    appState.belts.order = currentOrder;
  }

  _updateDisplay() {
    if (!this.container) {
      return;
    }

    const items = Array.from(this.container.querySelectorAll<HTMLElement>('.belt-order-item'));
    
    // Sort items according to current order
    appState.belts.order.forEach((beltId: BeltId, index: number) => {
      const item = items.find(item => item.dataset.belt === beltId);
      if (item) {
        item.style.order = String(index + 1);
      }
    });
  }

  _applyBeltOrder() {
    const beltsContainer = document.querySelector<HTMLElement>('.belts-container');
    if (!beltsContainer) return;
    
    // Map belt IDs to their corresponding CSS classes
    const beltMapping: Record<BeltId, string> = {
      pitch: '.pitch-belt',
      degree: '.degree-belt',
      intervals: '.interval-brackets-wrapper',
      chromatic: '.chromatic-belt'
    };
    
    // Apply order to actual belt elements
    appState.belts.order.forEach((beltId: BeltId, index: number) => {
      const selector = beltMapping[beltId];
      if (selector) {
        const element = beltsContainer.querySelector<HTMLElement>(selector);
        if (element) {
          element.style.order = String(index + 1);
        }
      }
    });
    
    // Trigger callback if set
    if (this.onOrderChange) {
      this.onOrderChange(appState.belts.order);
    }
  }

  _loadSavedOrder() {
    try {
      const preferences = loadPreferences();
      if (preferences && preferences.beltOrder && Array.isArray(preferences.beltOrder)) {
        // Validate that saved order contains all required belts
        const requiredBelts = BELT_IDS;
        const hasAllBelts = requiredBelts.every(belt => preferences.beltOrder.includes(belt));
        
        if (hasAllBelts && preferences.beltOrder.length === requiredBelts.length) {
          appState.belts.order = preferences.beltOrder;
        }
      }
    } catch (error) {
      console.warn('Failed to load belt order preferences:', error);
    }
  }

  _saveOrder() {
    try {
      const preferences: Partial<Preferences> = loadPreferences() || {};
      preferences.beltOrder = appState.belts.order;
      savePreferences(preferences);
    } catch (error) {
      console.warn('Failed to save belt order preferences:', error);
    }
  }

  _announceOrderChange(draggedBelt: BeltId, targetBelt: BeltId) {
    const beltNames: Record<BeltId, string> = {
      pitch: 'Pitch Classes',
      degree: 'Degrees',
      intervals: 'Intervals',
      chromatic: 'Chromatic'
    };
    
    const message = `${beltNames[draggedBelt]} moved before ${beltNames[targetBelt]}`;
    
    // Try to use existing announcement system
    const liveRegion = document.getElementById('basic-announcements') || 
                      document.getElementById('status-messages');
    
    if (liveRegion) {
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);
    }
  }

  /**
   * Set callback for order changes
   * @param {Function} callback - Function to call when order changes
   */
  setOrderChangeCallback(callback: (beltOrder: BeltId[]) => void) {
    this.onOrderChange = callback;
  }

  /**
   * Get current belt order
   * @returns {Array<string>} Current order of belt IDs
   */
  getCurrentOrder() {
    return [...appState.belts.order];
  }

  /**
   * Set belt order programmatically
   * @param {Array<string>} newOrder - New order of belt IDs
   */
  setOrder(newOrder: BeltId[]) {
    if (!Array.isArray(newOrder)) return false;
    
    const requiredBelts = BELT_IDS;
    const hasAllBelts = requiredBelts.every(belt => newOrder.includes(belt));
    
    if (!hasAllBelts || newOrder.length !== requiredBelts.length) {
      console.error('Invalid belt order - must contain all required belts');
      return false;
    }
    
    appState.belts.order = [...newOrder];
    this._updateDisplay();
    this._applyBeltOrder();
    this._saveOrder();
    
    return true;
  }

  /**
   * Reset to default order
   */
  resetToDefault() {
    const defaultOrder: BeltId[] = ['pitch', 'degree', 'intervals', 'chromatic'];
    this.setOrder(defaultOrder);
    
    // Announce reset
    const liveRegion = document.getElementById('basic-announcements') || 
                      document.getElementById('status-messages');
    if (liveRegion) {
      liveRegion.textContent = 'Belt order reset to default';
    }
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    if (this.container) {
      this.container.removeEventListener('dragstart', this._handleDragStart);
      this.container.removeEventListener('dragover', this._handleDragOver);
      this.container.removeEventListener('dragenter', this._handleDragEnter);
      this.container.removeEventListener('dragleave', this._handleDragLeave);
      this.container.removeEventListener('drop', this._handleDrop);
      this.container.removeEventListener('dragend', this._handleDragEnd);
    }
  }
}
