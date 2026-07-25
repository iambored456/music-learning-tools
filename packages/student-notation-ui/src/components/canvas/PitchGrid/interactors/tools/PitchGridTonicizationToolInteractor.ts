import store from '@state/initStore.ts';
import { getMacrobeatInfo, getPlacedTonicSigns } from '@state/selectors.ts';
import { fullRowData as masterRowData } from '@state/pitchData.ts';
import pitchGridViewportService from '@services/pitchGridViewportService.ts';
import { drawTonicShape } from '../../renderers/notes.ts';
import { drawHorizontalLines } from '../../renderers/gridLines.ts';
import { getColumnX, getVisibleRowRange } from '../../renderers/rendererUtils.ts';
import { getLogicalCanvasHeight, getLogicalCanvasWidth } from '@utils/canvasDimensions.ts';
import tonicInsertionPreviewService from './tonicInsertionPreviewService.ts';
import type { CanvasSpaceColumn } from '@mlt/types';

type MeasureSnapPoint = { drawColumn: number; preMacrobeatIndex: number };

const TONIC_COLUMN_COUNT = 2;

function drawInsertedTonicColumn(
  hoverCtx: CanvasRenderingContext2D,
  insertionX: number,
  insertionWidth: number
): void {
  const previewHeight = getLogicalCanvasHeight(hoverCtx.canvas);
  const viewportInfo = pitchGridViewportService.getViewportInfo();
  const { startRow, endRow } = getVisibleRowRange();
  const previewRange = { start: insertionX, end: insertionX + insertionWidth };
  const renderOptions = {
    ...store.state,
    viewportHeight: viewportInfo.containerHeight,
    zoomLevel: viewportInfo.zoomLevel,
    previewTonicRanges: [previewRange]
  };

  hoverCtx.save();
  hoverCtx.beginPath();
  hoverCtx.rect(insertionX, 0, insertionWidth, previewHeight);
  hoverCtx.clip();
  drawHorizontalLines(hoverCtx, renderOptions, startRow, endRow);
  hoverCtx.restore();

  hoverCtx.save();
  hoverCtx.strokeStyle = '#adb5bd';
  hoverCtx.lineWidth = 2;
  hoverCtx.setLineDash([]);
  [insertionX, insertionX + insertionWidth].forEach(x => {
    hoverCtx.beginPath();
    hoverCtx.moveTo(x, 0);
    hoverCtx.lineTo(x, previewHeight);
    hoverCtx.stroke();
  });
  hoverCtx.restore();
}

function findMeasureSnapPoint(columnIndex: number): MeasureSnapPoint | null {
  const { macrobeatGroupings, macrobeatBoundaryStyles, columnWidths } = store.state;
  const musicalColumns = columnWidths.length;

  if (columnIndex < 0 || columnIndex >= musicalColumns) {
    return null;
  }

  let hoveredMbIndex = -1;
  for (let i = 0; i < macrobeatGroupings.length; i++) {
    const { startColumn, endColumn } = getMacrobeatInfo(store.state, i);
    if (columnIndex >= startColumn && columnIndex <= endColumn) {
      hoveredMbIndex = i;
      break;
    }
  }
  if (hoveredMbIndex === -1) {
    return null;
  }

  let measureStartIndex = 0;
  for (let i = hoveredMbIndex - 1; i >= 0; i--) {
    if (macrobeatBoundaryStyles[i] === 'solid') {
      measureStartIndex = i + 1;
      break;
    }
  }
  const targetPreMacrobeatIndex = measureStartIndex - 1;

  // TONIC RULE: Only allow tonic at solid boundaries (measure starts) or before the first column.
  const isSolidBoundary = (mbIndex: number): boolean => {
    if (mbIndex <= 0) {
      return true; // allow very first column
    }
    const style = macrobeatBoundaryStyles[mbIndex - 1];
    return style === 'solid';
  };

  if (!isSolidBoundary(measureStartIndex)) {
    return null;
  }

  // Preview should align with the actual tonic placement column: start of the target measure.
  // getMacrobeatInfo already includes any existing tonic columns, so reuse it.
  const measureStartColumn = getMacrobeatInfo(store.state, measureStartIndex).startColumn;
  const drawColumn = measureStartColumn;

  return { drawColumn, preMacrobeatIndex: targetPreMacrobeatIndex };
}

function getPitchClass(note: string): string {
  return note.replace(/\d+$/, '');
}

export class PitchGridTonicizationToolInteractor {
  private lastHoveredTonicPoint: MeasureSnapPoint | null = null;
  private lastHoveredOctaveRows: number[] = [];
  private lastHoverContext: CanvasRenderingContext2D | null = null;

  resetHoverState(): void {
    if (this.lastHoverContext) {
      this.lastHoverContext.clearRect(
        0,
        0,
        getLogicalCanvasWidth(this.lastHoverContext.canvas),
        getLogicalCanvasHeight(this.lastHoverContext.canvas)
      );
    }
    this.lastHoveredTonicPoint = null;
    this.lastHoveredOctaveRows = [];
    this.lastHoverContext = null;
    tonicInsertionPreviewService.clearAlignedGridPreviews();
  }

  handleMouseMove(opts: {
    colIndex: number;
    rowIndex: number;
    hoverCtx: CanvasRenderingContext2D;
    sourceCanvas: HTMLCanvasElement;
    getPitchForRow: (rowIndex: number) => string | null;
  }): boolean {
    if (store.state.selectedTool !== 'tonicization') {
      if (this.lastHoveredTonicPoint || this.lastHoveredOctaveRows.length > 0) {
        this.resetHoverState();
      }
      return false;
    }

    const snapPoint = findMeasureSnapPoint(opts.colIndex);
    if (!snapPoint) {
      this.resetHoverState();
      return true;
    }

    const placedTonics = getPlacedTonicSigns(store.state);
    const measureHasTonic = placedTonics.some(ts => ts.preMacrobeatIndex === snapPoint.preMacrobeatIndex);
    if (measureHasTonic) {
      this.resetHoverState();
      return true;
    }

    const basePitch = opts.getPitchForRow(opts.rowIndex);
    if (!basePitch) {
      this.resetHoverState();
      return true;
    }

    // Search ALL octaves in master pitch data (place tonics on all octaves, even outside current range)
    const pitchClass = getPitchClass(basePitch);
    const octaveRows = masterRowData
      .map((rowData, masterIndex) => ({ rowData, masterIndex }))
      .filter(({ rowData }) => rowData.toneNote && getPitchClass(rowData.toneNote) === pitchClass)
      .map(({ masterIndex }) => masterIndex);

    this.lastHoveredTonicPoint = snapPoint;
    this.lastHoveredOctaveRows = octaveRows;
    this.lastHoverContext = opts.hoverCtx;

    const fullOptions = { ...store.state, zoomLevel: pitchGridViewportService.getViewportInfo().zoomLevel };
    const insertionX = getColumnX(snapPoint.drawColumn, fullOptions);
    const insertionEndX = getColumnX(snapPoint.drawColumn + TONIC_COLUMN_COUNT, fullOptions);
    const insertionWidth = Math.max(0, insertionEndX - insertionX);

    tonicInsertionPreviewService.renderPitchSnapshot(opts.hoverCtx, opts.sourceCanvas, insertionX, insertionWidth);
    drawInsertedTonicColumn(opts.hoverCtx, insertionX, insertionWidth);
    tonicInsertionPreviewService.renderAlignedGridPreviews(insertionX, insertionWidth);

    // Draw ghost preview only for tonics in the visible range
    const visibleOctaveRows = octaveRows.filter(rowIdx =>
      rowIdx >= 0 && rowIdx < store.state.fullRowData.length
    );

    opts.hoverCtx.globalAlpha = 0.5;
    visibleOctaveRows.forEach(rowIdx => {
      const ghostTonic = {
        row: rowIdx,
        globalRow: rowIdx,
        columnIndex: snapPoint.drawColumn as CanvasSpaceColumn,
        tonicNumber: store.state.selectedToolTonicNumber,
        preMacrobeatIndex: snapPoint.preMacrobeatIndex
      };
      drawTonicShape(opts.hoverCtx, fullOptions, ghostTonic as any);
    });
    opts.hoverCtx.globalAlpha = 1.0;

    return true;
  }

  handleMouseDown(): boolean {
    if (store.state.selectedTool !== 'tonicization') {
      return false;
    }

    if (!this.lastHoveredTonicPoint || this.lastHoveredOctaveRows.length === 0) {
      return true;
    }

    const tonicPoint = this.lastHoveredTonicPoint;
    const placedTonics = getPlacedTonicSigns(store.state);
    const measureHasTonic = placedTonics.some(ts => ts.preMacrobeatIndex === tonicPoint.preMacrobeatIndex);

    if (measureHasTonic) {
      this.resetHoverState();
      return true;
    }

    const newTonicGroup = this.lastHoveredOctaveRows.map(rowIdx => ({
      row: rowIdx,
      tonicNumber: store.state.selectedToolTonicNumber,
      preMacrobeatIndex: tonicPoint.preMacrobeatIndex,
      columnIndex: tonicPoint.drawColumn as CanvasSpaceColumn
    }));
    store.addTonicSignGroup(newTonicGroup);
    this.resetHoverState();

    return true;
  }
}
