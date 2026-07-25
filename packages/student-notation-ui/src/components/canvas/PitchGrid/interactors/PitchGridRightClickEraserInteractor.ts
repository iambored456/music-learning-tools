// js/components/canvas/PitchGrid/interactors/PitchGridRightClickEraserInteractor.ts
import store from '@state/initStore.ts';
import domCache from '@services/domCache.ts';
import type { CanvasSpaceColumn } from '@mlt/types';

type AnnotationServiceLike = {
  eraseAtPoint: (canvasX: number, canvasY: number) => boolean;
};

type ModulationEraser = (actualX: number, canvasY: number) => boolean;

export class PitchGridRightClickEraserInteractor {
  private isActive = false;
  private isModulationOnly = false;
  private actionTaken = false;
  private previousTool: string | null = null;

  getIsActive(): boolean {
    return this.isActive;
  }

  shouldShowEraserHighlight(): boolean {
    return this.isActive;
  }

  getIsModulationOnly(): boolean {
    return this.isActive && this.isModulationOnly;
  }

  handleMouseDown(params: {
    event: MouseEvent;
    colIndex: CanvasSpaceColumn;
    rowIndex: number;
    actualX: number;
    canvasY: number;
    annotationService: AnnotationServiceLike;
    eraseModulationAtPoint: ModulationEraser;
  }): boolean {
    const { event, colIndex, rowIndex, actualX, canvasY, annotationService, eraseModulationAtPoint } = params;
    if (event.button !== 2) {
      return false;
    }

    event.preventDefault();
    this.isActive = true;
    this.isModulationOnly = store.state.selectedTool === 'modulation';
    this.actionTaken = false;

    if (!this.isModulationOnly && store.state.selectedTool !== 'eraser') {
      this.previousTool = store.state.selectedTool;
      store.setSelectedTool('eraser');
    }
    if (!this.isModulationOnly) {
      domCache.get('eraserButton')?.classList.add('erasing-active');
    }

    this.applyEraserPass({
      event,
      colIndex,
      rowIndex,
      actualX,
      canvasY,
      annotationService,
      eraseModulationAtPoint
    });

    return true;
  }

  handleMouseMove(params: {
    event: MouseEvent;
    colIndex: CanvasSpaceColumn;
    rowIndex: number;
    actualX: number;
    canvasY: number;
    annotationService: AnnotationServiceLike;
    eraseModulationAtPoint: ModulationEraser;
  }): boolean {
    if (!this.isActive) {
      return false;
    }

    const { event, colIndex, rowIndex, actualX, canvasY, annotationService, eraseModulationAtPoint } = params;

    this.applyEraserPass({
      event,
      colIndex,
      rowIndex,
      actualX,
      canvasY,
      annotationService,
      eraseModulationAtPoint
    });

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
    this.isModulationOnly = false;
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
    actualX: number;
    canvasY: number;
    annotationService: AnnotationServiceLike;
    eraseModulationAtPoint: ModulationEraser;
  }): void {
    const { event, colIndex, rowIndex, actualX, canvasY, annotationService, eraseModulationAtPoint } = params;

    if (this.isModulationOnly) {
      this.actionTaken = eraseModulationAtPoint(actualX, canvasY) || this.actionTaken;
      return;
    }

    const eraseEndCol = (colIndex + 2 - 1) as CanvasSpaceColumn;
    const eraseStartRow = rowIndex - 1;
    const eraseEndRow = rowIndex + 1;

    const noteErased = Boolean(store.eraseInPitchArea(colIndex as CanvasSpaceColumn, rowIndex, 2, false));
    const tonicErased = Boolean(store.eraseTonicSignAt(colIndex, false));
    const sixteenthErased = Boolean(store.eraseSixteenthStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));
    const threeStampErased = Boolean(store.eraseSixteenthThreeStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));
    const tripletErased = Boolean(store.eraseTripletStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));

    let annotationErased = false;
    const target = event.target instanceof Element ? event.target : null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;
      annotationErased = Boolean(annotationService.eraseAtPoint(canvasX, canvasY));
    }

    const passErased = noteErased || tonicErased || sixteenthErased || threeStampErased || tripletErased || annotationErased;
    this.actionTaken = this.actionTaken || passErased;
  }
}
