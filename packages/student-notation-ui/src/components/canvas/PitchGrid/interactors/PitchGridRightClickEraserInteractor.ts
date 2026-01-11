// js/components/canvas/PitchGrid/interactors/PitchGridRightClickEraserInteractor.ts
import store from '@state/initStore.ts';
import domCache from '@services/domCache.ts';
import type { CanvasSpaceColumn } from '../../../../../types/state.js';

type AnnotationServiceLike = {
  eraseAtPoint: (canvasX: number, canvasY: number) => boolean;
};

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

    this.actionTaken ||= Boolean(store.eraseInPitchArea(colIndex as CanvasSpaceColumn, rowIndex, 2, false));
    this.actionTaken ||= Boolean(store.eraseTonicSignAt(colIndex, false));

    const eraseEndCol = (colIndex + 2 - 1) as CanvasSpaceColumn;
    const eraseStartRow = rowIndex - 1;
    const eraseEndRow = rowIndex + 1;
    this.actionTaken ||= Boolean(store.eraseSixteenthStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));
    this.actionTaken ||= Boolean(store.eraseTripletStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));

    const target = event.target instanceof Element ? event.target : null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;
      this.actionTaken ||= Boolean(annotationService.eraseAtPoint(canvasX, canvasY));
    }

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

    this.actionTaken ||= Boolean(store.eraseInPitchArea(colIndex as CanvasSpaceColumn, rowIndex, 2, false));
    this.actionTaken ||= Boolean(store.eraseTonicSignAt(colIndex, false));

    const eraseEndCol = (colIndex + 2 - 1) as CanvasSpaceColumn;
    const eraseStartRow = rowIndex - 1;
    const eraseEndRow = rowIndex + 1;
    this.actionTaken ||= Boolean(store.eraseSixteenthStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));
    this.actionTaken ||= Boolean(store.eraseTripletStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));

    const target = event.target instanceof Element ? event.target : null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;
      this.actionTaken ||= Boolean(annotationService.eraseAtPoint(canvasX, canvasY));
    }

    return true;
  }

  handleGlobalMouseUp(): boolean {
    if (!this.isActive) {
      return false;
    }

    if (this.actionTaken) {
      store.recordState();
    }

    this.isActive = false;
    this.actionTaken = false;

    if (this.previousTool) {
      store.setSelectedTool(this.previousTool);
      this.previousTool = null;
    }

    domCache.get('eraserButton')?.classList.remove('erasing-active');
    return true;
  }
}

