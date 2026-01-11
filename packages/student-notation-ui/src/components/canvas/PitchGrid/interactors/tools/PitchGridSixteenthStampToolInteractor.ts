import store from '@state/initStore.ts';
import audioPreviewService from '@services/audioPreviewService.ts';
import rhythmPlaybackService from '@services/rhythmPlaybackService.ts';
import { placeSixteenthStamp } from '@/rhythm/sixteenthStampPlacements.js';
import SixteenthStampsToolbar from '@components/rhythm/stampToolbars/sixteenthStampsToolbar.js';
import { hitTestAnySixteenthStampShape } from '@utils/sixteenthStampHitTest.ts';
import { getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.js';
import type { SixteenthStampPlacement } from '../../../../../../types/state.js';

interface DraggedStampShape {
  type: 'diamond' | 'oval';
  slot: number;
  shapeKey: string;
  placement: SixteenthStampPlacement;
  startRow: number;
  startMouseY: number;
}

export class PitchGridSixteenthStampToolInteractor {
  private draggedStampShape: DraggedStampShape | null = null;

  isDraggingShape(): boolean {
    return this.draggedStampShape !== null;
  }

  tryStartShapeDrag(opts: { actualX: number; canvasY: number }): boolean {
    const allStamps = store.getAllSixteenthStampPlacements();
    const fullOptions = { ...store.state };
    const hitResult = hitTestAnySixteenthStampShape(opts.actualX, opts.canvasY, allStamps, fullOptions);
    if (!hitResult) {
      return false;
    }

    this.draggedStampShape = {
      ...hitResult,
      startRow: store.getSixteenthStampShapeRow(hitResult.placement, hitResult.shapeKey),
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
    getTimeAlignedCanvasColumn: (canvasCol: number) => number | null;
  }): { handled: boolean; activePreviewPitches?: string[] } {
    // First, check if clicking on an individual shape within an existing stamp.
    if (this.tryStartShapeDrag({ actualX: opts.actualX, canvasY: opts.canvasY })) {
      return { handled: true };
    }

    if (store.state.selectedTool !== 'sixteenthStamp') {
      return { handled: false };
    }

    // No shape hit - check if clicking on an existing stamp (to replay the rhythm pattern).
    const existingStamp = rhythmPlaybackService.getSixteenthStampAtPosition(opts.colIndex, opts.rowIndex);
    if (existingStamp) {
      const pitch = opts.getPitchForRow(opts.rowIndex);
      if (!pitch) {
        return { handled: true };
      }

      const noteAtStamp = store.state.placedNotes.find(note =>
        !note.isDrum &&
        note.row === opts.rowIndex &&
        opts.colIndex >= note.startColumnIndex &&
        opts.colIndex <= note.endColumnIndex
      );

      const shape = noteAtStamp ? noteAtStamp.shape : 'oval';
      rhythmPlaybackService.playRhythmPattern(existingStamp.sixteenthStampId, pitch, existingStamp.color, shape, existingStamp);
      return { handled: true, activePreviewPitches: [pitch] };
    }

    // No existing stamp - place new stamp.
    const selectedStamp = SixteenthStampsToolbar.getSelectedSixteenthStamp();
    if (!selectedStamp) {
      return { handled: true };
    }

    const alignedCol = opts.getTimeAlignedCanvasColumn(opts.colIndex);
    if (alignedCol === null) {
      return { handled: true };
    }

    const selectedNote = store.state.selectedNote;
    if (!selectedNote) {
      return { handled: true };
    }

    const { color, shape } = selectedNote;
    placeSixteenthStamp(selectedStamp.id, alignedCol, opts.rowIndex, color);

    const pitch = opts.getPitchForRow(opts.rowIndex);
    if (pitch) {
      rhythmPlaybackService.playRhythmPattern(selectedStamp.id, pitch, color, shape);
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
    if (!this.draggedStampShape) {
      return false;
    }

    const rowOffset = opts.rowIndex - this.draggedStampShape.placement.row;
    store.updateSixteenthStampShapeOffset(
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
    if (store.state.selectedTool !== 'sixteenthStamp') {
      return;
    }

    if (this.draggedStampShape) {
      return;
    }

    const canvasEl = opts.canvasEl;
    if (!canvasEl) {
      return;
    }

    const allStamps = store.getAllSixteenthStampPlacements();
    const fullOptions = { ...store.state };
    const hitResult = hitTestAnySixteenthStampShape(opts.actualX, opts.canvasY, allStamps, fullOptions);
    if (hitResult || isOverSixteenthStamp(opts.actualX, opts.canvasY, allStamps, fullOptions)) {
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

function isOverSixteenthStamp(
  mouseX: number,
  mouseY: number,
  placements: SixteenthStampPlacement[],
  options: { cellHeight: number; columnWidths?: number[] }
): boolean {
  const columnWidths = options.columnWidths || [];

  for (const placement of placements) {
    const startColumn = placement.startColumn as number;
    const endColumn = Math.min(placement.endColumn as number, columnWidths.length);
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




