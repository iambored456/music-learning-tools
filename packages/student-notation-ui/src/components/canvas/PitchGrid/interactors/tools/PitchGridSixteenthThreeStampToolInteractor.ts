import store from '@state/initStore.ts';
import audioPreviewService from '@services/audioPreviewService.ts';
import rhythmPlaybackService from '@services/rhythmPlaybackService.ts';
import { placeSixteenthThreeStamp } from '@/rhythm/sixteenthThreeStampPlacements.ts';
import { getNearestSixteenthThreeStampSnapTarget } from '@/rhythm/sixteenthThreeStampSnap.ts';
import SixteenthThreeStampsToolbar from '@components/rhythm/stampToolbars/sixteenthThreeStampsToolbar.ts';
import { hitTestAnySixteenthThreeStampShape } from '@utils/sixteenthThreeStampHitTest.ts';
import { getColumnFromX, getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { timeToCanvas } from '@services/columnMapService.ts';
import type { SixteenthThreeStampPlacement } from '@mlt/types';

interface DraggedStampShape {
  type: 'diamond' | 'oval';
  slot: number;
  shapeKey: string;
  placement: SixteenthThreeStampPlacement;
  startRow: number;
  startMouseY: number;
}

export class PitchGridSixteenthThreeStampToolInteractor {
  private draggedStampShape: DraggedStampShape | null = null;

  isDraggingShape(): boolean {
    return this.draggedStampShape !== null;
  }

  tryStartShapeDrag(opts: { actualX: number; canvasY: number }): boolean {
    const allStamps = store.getAllSixteenthThreeStampPlacements();
    const fullOptions = { ...store.state };
    const hitResult = hitTestAnySixteenthThreeStampShape(opts.actualX, opts.canvasY, allStamps, fullOptions);
    if (!hitResult) {
      return false;
    }

    this.draggedStampShape = {
      ...hitResult,
      startRow: store.getSixteenthThreeStampShapeRow(hitResult.placement, hitResult.shapeKey),
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
    // First, check if clicking on an individual shape within an existing stamp.
    if (this.tryStartShapeDrag({ actualX: opts.actualX, canvasY: opts.canvasY })) {
      return { handled: true, activePreviewPitches: [] };
    }

    if (store.state.selectedTool !== 'sixteenthThreeStamp') {
      return { handled: false };
    }

    const pointerCanvasCol = getColumnFromX(opts.actualX, {
      ...store.state,
      columnWidths: store.state.columnWidths,
      musicalColumnWidths: store.state.columnWidths,
      cellWidth: store.state.cellWidth,
      cellHeight: store.state.cellHeight,
      tempoModulationMarkers: store.state.tempoModulationMarkers,
      baseMicrobeatPx: store.state.baseMicrobeatPx || store.state.cellWidth
    });

    const snapTarget = getNearestSixteenthThreeStampSnapTarget(pointerCanvasCol, store.state);
    if (!snapTarget) {
      return { handled: true, activePreviewPitches: [] };
    }
    const startTimeIndex = snapTarget.startTimeIndex;

    // No shape hit - check if clicking on an existing stamp (to replay the rhythm pattern).
    const existingStamp = rhythmPlaybackService.getSixteenthThreeStampAtPosition?.(startTimeIndex, opts.rowIndex);
    if (existingStamp) {
      const pitch = opts.getPitchForRow(opts.rowIndex);
      if (!pitch) {
        return { handled: true, activePreviewPitches: [] };
      }

      const noteAtStamp = store.state.placedNotes.find(note =>
        !note.isDrum &&
        note.row === opts.rowIndex &&
        opts.colIndex >= note.startColumnIndex &&
        opts.colIndex <= note.endColumnIndex
      );

      const shape = noteAtStamp ? noteAtStamp.shape : 'oval';
      rhythmPlaybackService.playThreeRhythmPattern?.(existingStamp.sixteenthThreeStampId, pitch, existingStamp.color, shape, existingStamp);
      return { handled: true, activePreviewPitches: [] };
    }

    // No existing stamp - place new stamp.
    const selectedStamp = SixteenthThreeStampsToolbar.getSelectedSixteenthThreeStamp();
    if (!selectedStamp) {
      return { handled: true, activePreviewPitches: [] };
    }

    const selectedNote = store.state.selectedNote;
    if (!selectedNote) {
      return { handled: true, activePreviewPitches: [] };
    }

    const { color, shape } = selectedNote;
    const placement = placeSixteenthThreeStamp(selectedStamp.id, startTimeIndex, opts.rowIndex, color);
    if (!placement) {
      return { handled: true, activePreviewPitches: [] };
    }

    const pitch = opts.getPitchForRow(opts.rowIndex);
    if (pitch) {
      rhythmPlaybackService.playThreeRhythmPattern?.(selectedStamp.id, pitch, color, shape, placement);
      store.recordState();
      return { handled: true, activePreviewPitches: [] };
    }

    store.recordState();
    return { handled: true, activePreviewPitches: [] };
  }

  handleMouseMove(opts: {
    rowIndex: number;
    canvasEl: HTMLElement | null;
    getPitchForRow: (rowIndex: number) => string | null;
  }): boolean {
    if (!this.draggedStampShape) {
      return false;
    }

    const rowOffset = opts.rowIndex - this.draggedStampShape.placement.row;
    store.updateSixteenthThreeStampShapeOffset(
      this.draggedStampShape.placement.id,
      this.draggedStampShape.shapeKey,
      rowOffset
    );

    if (opts.rowIndex !== this.draggedStampShape.startRow) {
      const pitch = opts.getPitchForRow(opts.rowIndex);
      if (pitch) {
        const color = this.draggedStampShape.placement.color || store.state.selectedNote?.color;
        if (color) {
          audioPreviewService.playTransient(pitch, color, 100);
        }
      }
      this.draggedStampShape.startRow = opts.rowIndex;
    }

    if (opts.canvasEl) {
      opts.canvasEl.style.cursor = 'ns-resize';
    }

    return true;
  }

  updateHoverCursor(opts: { actualX: number; canvasY: number; canvasEl: HTMLElement | null }): void {
    if (store.state.selectedTool !== 'sixteenthThreeStamp') {
      return;
    }

    if (this.draggedStampShape) {
      return;
    }

    const canvasEl = opts.canvasEl;
    if (!canvasEl) {
      return;
    }

    const allStamps = store.getAllSixteenthThreeStampPlacements();
    const fullOptions = { ...store.state };
    const hitResult = hitTestAnySixteenthThreeStampShape(opts.actualX, opts.canvasY, allStamps, fullOptions);
    if (hitResult || isOverSixteenthThreeStamp(opts.actualX, opts.canvasY, allStamps, fullOptions)) {
      canvasEl.style.cursor = 'grab';
    } else {
      canvasEl.style.cursor = 'default';
    }
  }

  handleMouseUp(): boolean {
    if (!this.draggedStampShape) {
      return false;
    }

    this.draggedStampShape = null;
    store.recordState();

    const canvas = document.getElementById('notation-grid') as HTMLElement | null;
    if (canvas) {
      canvas.style.cursor = 'default';
    }

    return true;
  }
}

function isOverSixteenthThreeStamp(
  mouseX: number,
  mouseY: number,
  placements: SixteenthThreeStampPlacement[],
  options: { cellHeight: number; columnWidths?: number[] }
): boolean {
  const state = store.state;

  for (const placement of placements) {
    // Convert time-space → canvas-space → pixels
    const startCanvasCol = timeToCanvas(placement.startTimeIndex, state);
    const endCanvasCol = startCanvasCol + 1.5; // 1.5 microbeats
    const startX = getColumnX(startCanvasCol, options as any);
    const endX = getColumnX(endCanvasCol, options as any);
    const rowCenterY = getRowY(placement.row, options as any);
    const y = rowCenterY - (options.cellHeight / 2);

    if (mouseX >= startX && mouseX <= endX && mouseY >= y && mouseY <= y + options.cellHeight) {
      return true;
    }
  }

  return false;
}
