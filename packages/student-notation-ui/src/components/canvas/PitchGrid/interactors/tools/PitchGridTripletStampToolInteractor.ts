import store from '@state/initStore.ts';
import audioPreviewService from '@services/audioPreviewService.ts';
import rhythmPlaybackService from '@services/rhythmPlaybackService.ts';
import { placeTripletStampGroup } from '@/rhythm/tripletStampPlacements.js';
import TripletStampsToolbar from '@components/rhythm/stampToolbars/tripletStampsToolbar.js';
import { hitTestAnyTripletStampShape } from '@utils/tripletStampHitTest.ts';
import { canvasToTime, timeToCanvas } from '@services/columnMapService.ts';
import { getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.js';
import type { TripletStampPlacement } from '@app-types/state.js';

interface DraggedTripletShape {
  type: 'tripletStamp';
  slot: number;
  shapeKey: string;
  placement: TripletStampPlacement;
  startRow: number;
  startMouseY: number;
}

export class PitchGridTripletStampToolInteractor {
  private draggedTripletShape: DraggedTripletShape | null = null;

  isDraggingShape(): boolean {
    return this.draggedTripletShape !== null;
  }

  tryStartShapeDrag(opts: { actualX: number; canvasY: number }): boolean {
    const allTriplets = store.getAllTripletStampPlacements();
    const fullOptions = { ...store.state };
    const hitResult = hitTestAnyTripletStampShape(opts.actualX, opts.canvasY, allTriplets, fullOptions);
    if (!hitResult) {
      return false;
    }

    this.draggedTripletShape = {
      ...hitResult,
      startRow: store.getTripletStampShapeRow(hitResult.placement, hitResult.shapeKey),
      startMouseY: opts.canvasY
    };
    return true;
  }

  handleMouseDown(opts: {
    colIndex: number;
    rowIndex: number;
    actualX: number;
    canvasY: number;
    getPitchForRow: (rowIndex: number) => string | null;
  }): { handled: boolean; activePreviewPitches?: string[] } {
    if (this.tryStartShapeDrag({ actualX: opts.actualX, canvasY: opts.canvasY })) {
      return { handled: true };
    }

    if (store.state.selectedTool !== 'tripletStamp') {
      return { handled: false };
    }

    // Convert canvas-space column to time-space.
    const timeCol = canvasToTime(opts.colIndex, store.state);
    if (timeCol === null) {
      return { handled: true };
    }
    const startTimeIndex = timeCol;

    const existingTriplet = rhythmPlaybackService.getTripletStampAtPosition(startTimeIndex, opts.rowIndex);
    if (existingTriplet) {
      const pitch = opts.getPitchForRow(opts.rowIndex);
      if (pitch) {
        rhythmPlaybackService.playTripletPattern(existingTriplet.tripletStampId, pitch, existingTriplet.color, existingTriplet);
        return { handled: true, activePreviewPitches: [pitch] };
      }
      return { handled: true };
    }

    const selectedTriplet = TripletStampsToolbar.getSelectedTripletStamp();
    if (!selectedTriplet || !store.state.selectedNote) {
      return { handled: true };
    }

    const placement = placeTripletStampGroup(selectedTriplet.id, startTimeIndex, opts.rowIndex, store.state.selectedNote.color);

    const pitch = opts.getPitchForRow(opts.rowIndex);
    if (pitch && placement) {
      rhythmPlaybackService.playTripletPattern(selectedTriplet.id, pitch, store.state.selectedNote.color, placement);
      store.recordState();
      return { handled: true, activePreviewPitches: [pitch] };
    }

    store.recordState();
    return { handled: true };
  }

  handleMouseMove(opts: {
    rowIndex: number;
    canvasEl: HTMLElement | null;
    getPitchForRow: (rowIndex: number) => string | null;
  }): boolean {
    if (!this.draggedTripletShape) {
      return false;
    }

    const rowOffset = opts.rowIndex - this.draggedTripletShape.placement.row;
    store.updateTripletStampShapeOffset(
      this.draggedTripletShape.placement.id,
      this.draggedTripletShape.shapeKey,
      rowOffset
    );

    if (opts.rowIndex !== this.draggedTripletShape.startRow) {
      const pitch = opts.getPitchForRow(opts.rowIndex);
      if (pitch) {
        const color = this.draggedTripletShape.placement.color || store.state.selectedNote?.color;
        if (color) {
          audioPreviewService.playTransient(pitch, color, 100);
        }
      }
      this.draggedTripletShape.startRow = opts.rowIndex;
    }

    if (opts.canvasEl) {
      opts.canvasEl.style.cursor = 'ns-resize';
    }

    return true;
  }

  updateHoverCursor(opts: { actualX: number; canvasY: number; canvasEl: HTMLElement | null }): void {
    if (store.state.selectedTool !== 'tripletStamp') {
      return;
    }

    if (this.draggedTripletShape) {
      return;
    }

    const canvasEl = opts.canvasEl;
    if (!canvasEl) {
      return;
    }

    const allTriplets = store.getAllTripletStampPlacements();
    const fullOptions = { ...store.state };
    const hitResult = hitTestAnyTripletStampShape(opts.actualX, opts.canvasY, allTriplets, fullOptions);
    if (hitResult || isOverTripletStamp(opts.actualX, opts.canvasY, allTriplets, fullOptions)) {
      canvasEl.style.cursor = 'grab';
    } else {
      canvasEl.style.cursor = 'default';
    }
  }

  handleMouseUp(): boolean {
    if (!this.draggedTripletShape) {
      return false;
    }

    this.draggedTripletShape = null;
    store.recordState();

    const canvas = document.getElementById('notation-grid') as HTMLElement | null;
    if (canvas) {
      canvas.style.cursor = 'default';
    }

    return true;
  }
}

function isOverTripletStamp(
  mouseX: number,
  mouseY: number,
  placements: TripletStampPlacement[],
  options: { cellHeight: number; columnWidths?: number[] }
): boolean {
  for (const placement of placements) {
    const timeSpan = placement.span * 2;
    const startColumn = timeToCanvas(placement.startTimeIndex, store.state);
    const endColumn = startColumn + timeSpan;
    const startX = getColumnX(startColumn, options as any);
    const endX = getColumnX(endColumn, options as any);
    const rowCenterY = getRowY(placement.row, options as any);
    const y = rowCenterY - (options.cellHeight / 2);

    if (mouseX >= startX && mouseX <= endX && mouseY >= y && mouseY <= y + options.cellHeight) {
      return true;
    }
  }

  return false;
}




