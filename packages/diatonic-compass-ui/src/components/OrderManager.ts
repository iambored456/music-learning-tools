// (file path: src/components/OrderManager.ts)

import { appState } from '../state/appState.ts';
import { savePreferences, loadPreferences } from '../services/PreferencesService.ts';
import { ErrorHandler } from '../utils/ErrorHandler.ts';
import type { BeltId, LayoutOrder, Preferences } from '../types.ts';

type ComponentId = 'compass' | 'result' | BeltId;
const BELT_IDS: BeltId[] = ['pitch', 'degree', 'intervals', 'chromatic'];

export default class OrderManager {
  container: HTMLElement | null;
  draggedItem: HTMLElement | null;
  dragOverItem: HTMLElement | null;
  onOrderChange: ((layoutOrder: LayoutOrder, beltOrder: BeltId[]) => void) | null;
  touchStartY: number;
  touchStartX: number;
  isDraggingTouch: boolean;
  touchScrollThreshold: number;
  dragGhost: HTMLElement | null;

  constructor() {
    this.container = null;
    this.draggedItem = null;
    this.dragOverItem = null;
    this.onOrderChange = null;

    // Touch support
    this.touchStartY = 0;
    this.touchStartX = 0;
    this.isDraggingTouch = false;
    this.touchScrollThreshold = 10; // pixels before considering it a drag
    this.dragGhost = null; // Visual element that follows touch/mouse

    this.init();
  }

  init() {
    try {
      this.container = document.getElementById('belt-order-list') as HTMLElement | null;
      if (!this.container) {
        throw new Error('Order list container not found');
      }

      this._setupEventListeners();
      this._loadSavedOrder();
      this._updateDisplay();
      
    } catch (error) {
      ErrorHandler.handle(error, 'OrderManager', () => {
        console.error('Failed to initialize Order Manager');
      });
    }
  }

  _setupEventListeners() {
    if (!this.container) {
      return;
    }

    // Mouse/desktop drag events
    this.container.addEventListener('dragstart', this._handleDragStart.bind(this));
    this.container.addEventListener('dragover', this._handleDragOver.bind(this));
    this.container.addEventListener('dragenter', this._handleDragEnter.bind(this));
    this.container.addEventListener('dragleave', this._handleDragLeave.bind(this));
    this.container.addEventListener('drop', this._handleDrop.bind(this));
    this.container.addEventListener('dragend', this._handleDragEnd.bind(this));

    // Touch events for mobile
    this.container.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this._handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this._handleTouchEnd.bind(this), { passive: false });
    this.container.addEventListener('touchcancel', this._handleTouchEnd.bind(this), { passive: false });
  }

  _handleDragStart(event: DragEvent) {
    console.log('Drag start event triggered', event.target);

    // Check if drag started from the drag handle
    const target = event.target as HTMLElement | null;
    if (!target || !target.classList.contains('drag-handle')) {
      console.log('Not a drag-handle, ignoring');
      return;
    }

    // Get the parent order-item
    this.draggedItem = target.closest('.order-item') as HTMLElement | null;
    if (!this.draggedItem) {
      console.log('No parent order-item found, ignoring');
      return;
    }

    this.draggedItem.classList.add('dragging');
    console.log('Dragging item:', this.draggedItem.dataset.component);

    // Set drag data
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', this.draggedItem.outerHTML);

    // Hide the original item after a brief delay (to allow drag ghost to be created)
    setTimeout(() => {
      if (this.draggedItem) {
        this.draggedItem.style.opacity = '0';
      }
    }, 1);
  }

  _handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  _handleDragEnter(event: DragEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.classList.contains('order-item') && target !== this.draggedItem) {
      this.dragOverItem = target;
      target.classList.add('drag-over');
      this._animateReorder(target);
    }
  }

  _handleDragLeave(event: DragEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.classList.contains('order-item')) {
      target.classList.remove('drag-over');
    }
  }

  _handleDrop(event: DragEvent) {
    event.preventDefault();
    console.log('Drop event triggered');
    
    if (!this.draggedItem || !this.dragOverItem || this.dragOverItem === this.draggedItem) {
      console.log('Drop cancelled - no valid target');
      return;
    }
    
    const draggedId = this.draggedItem.dataset.component;
    const targetId = this.dragOverItem.dataset.component;
    if (!draggedId || !targetId) {
      console.log('Drop cancelled - missing component id');
      return;
    }
    console.log(`Dropping ${draggedId} onto ${targetId}`);
    
    this._reorderComponents(draggedId, targetId);
    this._saveOrder();
    this._updateDisplay();
    this._applyComponentOrder();
  }

  _handleDragEnd(event: DragEvent) {
    if (!this.container) {
      return;
    }

    // Clean up drag states
    if (this.draggedItem) {
      this.draggedItem.classList.remove('dragging');
      this.draggedItem.style.opacity = ''; // Restore visibility
    }
    
    // Remove all drag-over classes
    this.container.querySelectorAll('.drag-over').forEach(item => {
      item.classList.remove('drag-over');
    });
    
    // Reset all animations
    this._resetAnimations();
    
    this.draggedItem = null;
    this.dragOverItem = null;
  }

  _reorderComponents(draggedId: string, targetId: string) {
    const currentOrientation = appState.belts.orientation;
    const currentOrder = [...appState.belts.layoutOrder[currentOrientation]];
    
    // Handle vertical layout special case for nested belts
    if (currentOrientation === 'vertical') {
      this._reorderVerticalLayout(draggedId, targetId, currentOrder);
    } else {
      this._reorderHorizontalLayout(draggedId, targetId, currentOrder);
    }
  }

  _reorderHorizontalLayout(draggedId: string, targetId: string, currentOrder: string[]) {
    const draggedIndex = currentOrder.indexOf(draggedId);
    const targetIndex = currentOrder.indexOf(targetId);
    
    console.log('=== HORIZONTAL REORDER DEBUG ===', {
      draggedId,
      targetId,
      currentOrder: [...currentOrder],
      draggedIndex,
      targetIndex
    });
    
    if (draggedIndex === -1 || targetIndex === -1) {
      console.log('Invalid indices - horizontal reorder cancelled');
      return;
    }
    
    // Remove dragged item and insert at target position
    currentOrder.splice(draggedIndex, 1);
    // After removing the dragged item, adjust target index if needed
    // If we're moving forward (to a higher index), the target index shifts down by 1
    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;

    console.log('Horizontal reorder calculation:', {
      afterRemoval: [...currentOrder],
      adjustedTargetIndex,
      calculation: `${draggedIndex} < ${targetIndex} ? ${targetIndex - 1} : ${targetIndex}`,
      explanation: draggedIndex < targetIndex ? 'Moving forward: target shifted down after removal' : 'Moving backward: target index unchanged'
    });

    currentOrder.splice(adjustedTargetIndex, 0, draggedId);
    
    console.log('Final horizontal order:', [...currentOrder]);
    appState.belts.layoutOrder.horizontal = currentOrder;
  }

  _reorderVerticalLayout(draggedId: string, targetId: string, currentOrder: string[]) {
    console.log('=== VERTICAL REORDER DEBUG ===', {
      draggedId,
      targetId,
      currentOrder,
      isCompassInvolved: draggedId === 'compass' || targetId === 'compass'
    });
    
    // In vertical layout, only compass and result are top-level
    // Belts are nested under result
    if (draggedId === 'compass' || targetId === 'compass') {
      // If compass is being dragged onto a belt, treat it as dropping onto result group
      const beltIds = BELT_IDS;
      let actualTargetId = targetId;
      let actualDraggedId = draggedId;
      
      // Convert belt targets to 'result' since belts are nested under result
      if (beltIds.includes(targetId as BeltId)) {
        actualTargetId = 'result';
        console.log(`Converting belt target '${targetId}' to 'result'`);
      }
      if (beltIds.includes(draggedId as BeltId)) {
        actualDraggedId = 'result';
        console.log(`Converting belt dragged '${draggedId}' to 'result'`);
      }
      
      // Simple reorder for compass vs result group
      const draggedIndex = currentOrder.indexOf(actualDraggedId);
      const targetIndex = currentOrder.indexOf(actualTargetId);
      
      console.log('Compass reorder indices:', { draggedIndex, targetIndex, actualDraggedId, actualTargetId });
      
      if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
        currentOrder.splice(draggedIndex, 1);
        
        // Special case: when compass is dragged onto a belt, it should go AFTER result group
        let adjustedTargetIndex;
        if (actualDraggedId === 'compass' && beltIds.includes(targetId as BeltId)) {
          // Place compass after the result group (at the end)
          adjustedTargetIndex = currentOrder.length;
          console.log('Placing compass after result group at index:', adjustedTargetIndex);
        } else {
          // Normal reorder logic - adjust for the removed item
          adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
          console.log('Normal reorder to index:', adjustedTargetIndex);
        }

        currentOrder.splice(adjustedTargetIndex, 0, actualDraggedId);
        appState.belts.layoutOrder.vertical = currentOrder;
        console.log('New vertical layout order:', currentOrder);
      } else {
        console.log('Invalid indices or same position - reorder cancelled');
      }
    } else {
      console.log('Belt reorder within result group');
      // Reordering belts within the result group
      if (BELT_IDS.includes(draggedId as BeltId) && BELT_IDS.includes(targetId as BeltId)) {
        this._reorderBelts(draggedId as BeltId, targetId as BeltId);
      }
    }
  }

  _reorderBelts(draggedBelt: BeltId, targetBelt: BeltId) {
    const currentOrder = [...appState.belts.order];
    const draggedIndex = currentOrder.indexOf(draggedBelt);
    const targetIndex = currentOrder.indexOf(targetBelt);
    
    console.log('=== BELT REORDER DEBUG ===', {
      draggedBelt,
      targetBelt,
      currentOrder: [...currentOrder],
      draggedIndex,
      targetIndex
    });
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Remove dragged item and insert at target position
    currentOrder.splice(draggedIndex, 1);
    // After removing the dragged item, adjust target index if needed
    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;

    console.log('Belt reorder calculation:', {
      afterRemoval: [...currentOrder],
      adjustedTargetIndex,
      calculation: `${draggedIndex} < ${targetIndex} ? ${targetIndex - 1} : ${targetIndex}`,
      explanation: draggedIndex < targetIndex ? 'Moving forward: target shifted down after removal' : 'Moving backward: target index unchanged'
    });

    currentOrder.splice(adjustedTargetIndex, 0, draggedBelt);
    
    console.log('Final belt order:', [...currentOrder]);
    appState.belts.order = currentOrder;
  }

  _updateDisplay() {
    if (!this.container) {
      return;
    }

    const currentOrientation = appState.belts.orientation;
    const container = this.container;
    if (!container) {
      return;
    }
    container.innerHTML = '';
    
    if (currentOrientation === 'horizontal') {
      this._renderHorizontalLayout();
    } else {
      this._renderVerticalLayout();
    }
  }

  _renderHorizontalLayout() {
    const container = this.container;
    if (!container) {
      return;
    }

    const order = appState.belts.layoutOrder.horizontal as ComponentId[];
    
    order.forEach(componentId => {
      const item = this._createOrderItem(componentId, this._getComponentLabel(componentId));
      container.appendChild(item);
    });
  }

  _renderVerticalLayout() {
    const container = this.container;
    if (!container) {
      return;
    }

    const order = appState.belts.layoutOrder.vertical as ComponentId[];
    
    console.log('=== RENDERING VERTICAL LAYOUT ===', {
      order,
      beltOrder: appState.belts.order
    });
    
    order.forEach((componentId, index) => {
      console.log(`Rendering component ${index}: ${componentId}`);
      
      if (componentId === 'result') {
        // Create result group with nested belts
        const resultItem = this._createOrderItem('result', 'Mode Name', true);
        container.appendChild(resultItem);
        console.log('Added result group item');
        
        // Add nested belt items
        appState.belts.order.forEach((beltId: BeltId, beltIndex: number) => {
          const beltItem = this._createOrderItem(beltId, this._getComponentLabel(beltId), false, true);
          container.appendChild(beltItem);
          console.log(`Added nested belt item ${beltIndex}: ${beltId}`);
        });
      } else {
        const item = this._createOrderItem(componentId, this._getComponentLabel(componentId));
        container.appendChild(item);
        console.log(`Added regular item: ${componentId}`);
      }
    });
    
    console.log('Final sidebar structure:', Array.from(container.children).map(child => {
      const element = child as HTMLElement;
      return {
        className: element.className,
        textContent: element.textContent?.trim() || '',
        dataComponent: element.dataset.component
      };
    }));
  }

  _createOrderItem(componentId: ComponentId, label: string, isGroup = false, isNested = false) {
    const item = document.createElement('div');
    item.className = `order-item${isGroup ? ' group' : ''}${isNested ? ' nested' : ''}`;
    item.draggable = false; // Don't make the entire item draggable
    item.dataset.component = componentId;

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '⋮⋮';
    dragHandle.draggable = true; // Only the handle is draggable

    const labelSpan = document.createElement('span');
    labelSpan.className = 'component-label';
    labelSpan.textContent = label;

    if (isNested) {
      const indent = document.createElement('span');
      indent.className = 'nested-indent';
      indent.textContent = '  ';
      item.appendChild(indent);
    }

    item.appendChild(dragHandle);
    item.appendChild(labelSpan);

    return item;
  }

  _getComponentLabel(componentId: ComponentId) {
    const labels: Record<ComponentId, string> = {
      compass: 'Compass',
      result: 'Mode Name',
      pitch: 'Pitch',
      degree: 'Degrees',
      intervals: 'Intervals',
      chromatic: 'Chromatic'
    };
    
    return labels[componentId];
  }

  _saveOrder() {
    try {
      const preferences: Partial<Preferences> = loadPreferences() || {};
      preferences.layoutOrder = appState.belts.layoutOrder;
      preferences.beltOrder = appState.belts.order;
      savePreferences(preferences);
    } catch (error) {
      console.warn('Failed to save order preferences:', error);
    }
  }

  _loadSavedOrder() {
    try {
      const preferences = loadPreferences();
      if (preferences && preferences.layoutOrder) {
        appState.belts.layoutOrder = preferences.layoutOrder;
      }
      if (preferences && preferences.beltOrder) {
        appState.belts.order = preferences.beltOrder;
      }
    } catch (error) {
      console.warn('Failed to load order preferences:', error);
    }
  }

  _applyComponentOrder() {
    // Trigger layout update
    if (this.onOrderChange) {
      this.onOrderChange(appState.belts.layoutOrder, appState.belts.order);
    }
  }

  setOrderChangeCallback(callback: (layoutOrder: LayoutOrder, beltOrder: BeltId[]) => void) {
    this.onOrderChange = callback;
  }

  // Called when orientation changes to update the display
  onOrientationChange() {
    this._updateDisplay();
  }

  /**
   * Animate items moving out of the way when dragging over
   */
  _animateReorder(targetItem: HTMLElement) {
    if (!this.container || !this.draggedItem || !targetItem) return;
    
    const draggedItem = this.draggedItem;
    const items = Array.from(this.container.querySelectorAll<HTMLElement>('.order-item'));
    const draggedIndex = items.indexOf(draggedItem);
    const targetIndex = items.indexOf(targetItem);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Determine drop position
    const insertBefore = draggedIndex > targetIndex;
    
    items.forEach((item, index) => {
      if (item === draggedItem) {
        // Keep dragged item in place visually
        return;
      }
      
      let translateY = 0;
      
      if (insertBefore) {
        // Dragging from bottom to top
        if (index >= targetIndex && index < draggedIndex) {
          translateY = draggedItem.offsetHeight + 8; // height + gap
        }
      } else {
        // Dragging from top to bottom
        if (index > draggedIndex && index <= targetIndex) {
          translateY = -(draggedItem.offsetHeight + 8); // negative height + gap
        }
      }
      
      item.style.transform = `translateY(${translateY}px)`;
      item.style.transition = 'transform 0.2s ease';
    });
  }
  
  /**
   * Reset all animation transforms
   */
  _resetAnimations() {
    if (!this.container) {
      return;
    }

    const items = this.container.querySelectorAll<HTMLElement>('.order-item');
    items.forEach(item => {
      item.style.transform = '';
      item.style.transition = '';
    });
  }

  // Create a visual ghost element that follows the drag
  _createDragGhost(sourceElement: HTMLElement, x: number, y: number) {
    const ghost = sourceElement.cloneNode(true) as HTMLElement;
    ghost.classList.add('drag-ghost');
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.8';
    ghost.style.width = sourceElement.offsetWidth + 'px';
    ghost.style.left = x - (sourceElement.offsetWidth / 2) + 'px';
    ghost.style.top = y - (sourceElement.offsetHeight / 2) + 'px';
    ghost.style.transform = 'rotate(-2deg)';
    ghost.style.transition = 'none';
    document.body.appendChild(ghost);
    return ghost;
  }

  _updateDragGhost(x: number, y: number) {
    if (this.dragGhost) {
      this.dragGhost.style.left = x - (this.dragGhost.offsetWidth / 2) + 'px';
      this.dragGhost.style.top = y - (this.dragGhost.offsetHeight / 2) + 'px';
    }
  }

  _removeDragGhost() {
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
  }

  // Touch event handlers for mobile support
  _handleTouchStart(event: TouchEvent) {
    const target = event.target as HTMLElement | null;

    // Only handle touches on drag handles
    if (!target || !target.classList.contains('drag-handle')) {
      return;
    }

    const touch = event.touches[0];
    this.touchStartY = touch.clientY;
    this.touchStartX = touch.clientX;
    this.isDraggingTouch = false;

    // Get the parent order-item
    this.draggedItem = target.closest('.order-item') as HTMLElement | null;
    if (!this.draggedItem) {
      return;
    }

    console.log('Touch start on drag handle:', this.draggedItem.dataset.component);
  }

  _handleTouchMove(event: TouchEvent) {
    if (!this.draggedItem) {
      return;
    }

    const touch = event.touches[0];
    const deltaY = Math.abs(touch.clientY - this.touchStartY);
    const deltaX = Math.abs(touch.clientX - this.touchStartX);

    // If movement exceeds threshold, start dragging
    if (!this.isDraggingTouch && (deltaY > this.touchScrollThreshold || deltaX > this.touchScrollThreshold)) {
      this.isDraggingTouch = true;
      this.draggedItem.classList.add('dragging');
      event.preventDefault(); // Prevent scrolling while dragging

      // Create drag ghost
      this.dragGhost = this._createDragGhost(this.draggedItem, touch.clientX, touch.clientY);
      console.log('Started touch dragging');
    }

    if (this.isDraggingTouch) {
      event.preventDefault();

      // Update ghost position
      this._updateDragGhost(touch.clientX, touch.clientY);

      // Find element under touch point
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetItem = (elementBelow?.closest('.order-item') as HTMLElement | null) ?? null;

      // Update drag-over state
      if (targetItem && targetItem !== this.draggedItem) {
        // Remove previous drag-over
        if (this.dragOverItem && this.dragOverItem !== targetItem) {
          this.dragOverItem.classList.remove('drag-over');
        }

        this.dragOverItem = targetItem;
        targetItem.classList.add('drag-over');
        this._animateReorder(targetItem);
      }
    }
  }

  _handleTouchEnd(event: TouchEvent) {
    if (!this.draggedItem) {
      return;
    }

    if (this.isDraggingTouch) {
      event.preventDefault();
      console.log('Touch drag ended');

      // Perform the drop
      if (this.dragOverItem && this.dragOverItem !== this.draggedItem) {
        const draggedId = this.draggedItem.dataset.component;
        const targetId = this.dragOverItem.dataset.component;
        if (!draggedId || !targetId) {
          return;
        }
        console.log(`Touch dropping ${draggedId} onto ${targetId}`);

        this._reorderComponents(draggedId, targetId);
        this._saveOrder();
        this._updateDisplay();
        this._applyComponentOrder();
      }

      // Remove drag ghost
      this._removeDragGhost();
    }

    // Clean up
    if (this.draggedItem) {
      this.draggedItem.classList.remove('dragging');
    }
    if (this.dragOverItem) {
      this.dragOverItem.classList.remove('drag-over');
    }
    this._resetAnimations();

    this.draggedItem = null;
    this.dragOverItem = null;
    this.isDraggingTouch = false;
  }

  destroy() {
    if (this.container) {
      this.container.removeEventListener('dragstart', this._handleDragStart.bind(this));
      this.container.removeEventListener('dragover', this._handleDragOver.bind(this));
      this.container.removeEventListener('dragenter', this._handleDragEnter.bind(this));
      this.container.removeEventListener('dragleave', this._handleDragLeave.bind(this));
      this.container.removeEventListener('drop', this._handleDrop.bind(this));
      this.container.removeEventListener('dragend', this._handleDragEnd.bind(this));
    }
  }
}
