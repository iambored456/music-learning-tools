// js/components/canvas/PitchGrid/interactors/PitchGridRightClickEraserInteractor.ts
import store from '@state/initStore.ts';
import domCache from '@services/domCache.ts';
import type { CanvasSpaceColumn } from '@mlt/types';

type AnnotationServiceLike = {
  finishInteraction?: () => void;
  eraseAtPoint: (canvasX: number, canvasY: number) => boolean;
};

type ModulationEraser = (actualX: number, canvasY: number) => boolean;

export class PitchGridRightClickEraserInteractor {
  private isActive = false;
  private actionTaken = false;

  getIsActive(): boolean {
    return this.isActive;
  }

  shouldShowEraserHighlight(): boolean {
    return this.isActive;
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
    if (event.button !== 2 && !(event.button === 0 && store.state.selectedTool === 'eraser')) {
      return false;
    }

    event.preventDefault();
    this.handleGlobalMouseUp();
    annotationService.finishInteraction?.();
    this.isActive = true;
    this.actionTaken = false;

    domCache.get('eraserButton')?.classList.add('erasing-active');

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
    if (params.event.buttons === 0) {
      this.handleGlobalMouseUp();
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
    this.actionTaken = false;

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

    const modulationErased = eraseModulationAtPoint(actualX, canvasY);

    const eraseEndCol = (colIndex + 2 - 1) as CanvasSpaceColumn;
    const eraseStartRow = rowIndex - 1;
    const eraseEndRow = rowIndex + 1;

    const noteErased = Boolean(store.eraseInPitchArea(colIndex as CanvasSpaceColumn, rowIndex, 2, false));
    const sixteenthErased = Boolean(store.eraseSixteenthStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));
    const threeStampErased = Boolean(store.eraseSixteenthThreeStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));
    const tripletErased = Boolean(store.eraseTripletStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow));

    const target = typeof Element !== 'undefined' && event.target instanceof Element ? event.target : null;
    const canvasX = target ? event.clientX - target.getBoundingClientRect().left : actualX;
    const annotationErased = Boolean(annotationService.eraseAtPoint(canvasX, canvasY));

    // Removing a tonic changes column positions, so do it after the other hit tests.
    const tonicColumn = Object.values(store.state.tonicSignGroups ?? {}).flat().find(sign => colIndex >= sign.columnIndex && colIndex < sign.columnIndex + 2)?.columnIndex ?? colIndex;
    const tonicErased = Boolean(store.eraseTonicSignAt(tonicColumn, false));
    const passErased = modulationErased || noteErased || tonicErased || sixteenthErased || threeStampErased || tripletErased || annotationErased;
    this.actionTaken = this.actionTaken || passErased;
  }
}
