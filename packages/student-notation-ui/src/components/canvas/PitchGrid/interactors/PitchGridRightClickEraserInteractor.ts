// js/components/canvas/PitchGrid/interactors/PitchGridRightClickEraserInteractor.ts
import store from '@state/initStore.ts';
import domCache from '@services/domCache.ts';
import type { CanvasSpaceColumn } from '@app-types/state.js';

type AnnotationServiceLike = {
  eraseAtPoint: (canvasX: number, canvasY: number) => boolean;
};

function isRightClickEraserDebugEnabled(): boolean {
  try {
    const win = globalThis as typeof globalThis & { __SN_DEBUG_RCLICK_ERASE?: boolean };
    if (Boolean(win.__SN_DEBUG_RCLICK_ERASE)) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    return localStorage.getItem('sn:debugRightClickErase') === '1';
  } catch {
    return false;
  }
}

function logRightClickEraser(phase: string, data: Record<string, unknown>): void {
  if (!isRightClickEraserDebugEnabled()) {
    return;
  }

  try {
    console.debug(`[RightClickEraser] ${phase}`, data);
  } catch {
    // ignore
  }
}

export class PitchGridRightClickEraserInteractor {
  private isActive = false;
  private actionTaken = false;
  private previousTool: string | null = null;

  getIsActive(): boolean {
    return this.isActive;
  }

  handleMouseDown(params: {
    event: MouseEvent;
    colIndex: CanvasSpaceColumn;
    rowIndex: number;
    annotationService: AnnotationServiceLike;
  }): boolean {
    const { event, colIndex, rowIndex, annotationService } = params;
    if (event.button !== 2) {
      return false;
    }

    event.preventDefault();
    this.isActive = true;
    this.actionTaken = false;

    if (store.state.selectedTool !== 'eraser') {
      this.previousTool = store.state.selectedTool;
      store.setSelectedTool('eraser');
    }
    domCache.get('eraserButton')?.classList.add('erasing-active');

    this.applyEraserPass({ event, colIndex, rowIndex, annotationService, phase: 'mousedown' });

    return true;
  }

  handleMouseMove(params: {
    event: MouseEvent;
    colIndex: CanvasSpaceColumn;
    rowIndex: number;
    annotationService: AnnotationServiceLike;
  }): boolean {
    if (!this.isActive) {
      return false;
    }

    const { event, colIndex, rowIndex, annotationService } = params;

    this.applyEraserPass({ event, colIndex, rowIndex, annotationService, phase: 'mousemove' });

    return true;
  }

  handleGlobalMouseUp(): boolean {
    if (!this.isActive) {
      return false;
    }

    if (this.actionTaken) {
      store.recordState();
    }

    logRightClickEraser('mouseup', {
      actionTaken: this.actionTaken,
      restoredTool: this.previousTool
    });

    this.isActive = false;
    this.actionTaken = false;

    if (this.previousTool) {
      store.setSelectedTool(this.previousTool);
      this.previousTool = null;
    }

    domCache.get('eraserButton')?.classList.remove('erasing-active');
    return true;
  }

  private applyEraserPass(params: {
    event: MouseEvent;
    colIndex: CanvasSpaceColumn;
    rowIndex: number;
    annotationService: AnnotationServiceLike;
    phase: 'mousedown' | 'mousemove';
  }): void {
    const { event, colIndex, rowIndex, annotationService, phase } = params;
    const previousActionTaken = this.actionTaken;
    const eraseEndCol = (colIndex + 2 - 1) as CanvasSpaceColumn;
    const eraseStartRow = rowIndex - 1;
    const eraseEndRow = rowIndex + 1;

    const noteErased = Boolean(store.eraseInPitchArea(colIndex as CanvasSpaceColumn, rowIndex, 2, false));
    const tonicErased = Boolean(store.eraseTonicSignAt(colIndex, false));
    const sixteenthErased = Boolean(store.eraseSixteenthStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));
    const tripletErased = Boolean(store.eraseTripletStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));

    let annotationErased = false;
    const target = event.target instanceof Element ? event.target : null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;
      annotationErased = Boolean(annotationService.eraseAtPoint(canvasX, canvasY));
    }

    const passErased = noteErased || tonicErased || sixteenthErased || tripletErased || annotationErased;
    this.actionTaken = this.actionTaken || passErased;

    logRightClickEraser(phase, {
      colIndex,
      rowIndex,
      noteErased,
      tonicErased,
      sixteenthErased,
      tripletErased,
      annotationErased,
      passErased,
      previousActionTaken,
      actionTaken: this.actionTaken
    });
  }
}
