// js/components/Canvas/PitchGrid/renderers/sixteenthStampRenderer.ts
import { getSixteenthStampById } from '../../../../rhythm/sixteenthStamps.js';
import { defaultSixteenthStampRenderer } from '../../../../utils/sixteenthStampRenderer.ts';
import { getRowY, getColumnX } from './rendererUtils.js';
import store from '@state/initStore.ts';
import logger from '../../../../utils/logger.js';
import { getLogicalCanvasWidth } from '@utils/canvasDimensions.ts';
import { canvasToTime, timeToCanvas } from '../../../../services/columnMapService.ts';
import type { ModulationMarker, SixteenthStampPlacement } from '@app-types/state.js';
import type { SixteenthStampShape } from '../../../../utils/sixteenthStampRenderer.ts';

interface SixteenthStampRenderOptions {
  columnWidths: number[];
  musicalColumnWidths?: number[];
  cellWidth: number;
  cellHeight: number;
  baseMicrobeatPx?: number;
  modulationMarkers?: ModulationMarker[];
}

logger.moduleLoaded('SixteenthStampRenderer', 'stamps');

export function renderSixteenthStamps(ctx: CanvasRenderingContext2D, options: SixteenthStampRenderOptions): void {
  const stamps: SixteenthStampPlacement[] =
    store.getAllSixteenthStampPlacements?.() ??
    store.state?.sixteenthStampPlacements ??
    [];

  if (stamps.length === 0) {return;}

  logger.debug('SixteenthStampRenderer', `Rendering ${stamps.length} stamps`, { count: stamps.length }, 'stamps');

  stamps.forEach(placement => {
    renderSixteenthStamp(ctx, placement, options);
  });
}

function renderSixteenthStamp(ctx: CanvasRenderingContext2D, placement: SixteenthStampPlacement, options: SixteenthStampRenderOptions): void {
  const stamp: SixteenthStampShape | undefined = getSixteenthStampById(placement.sixteenthStampId);
  if (!stamp) {return;}

  const { startColumn, row, color } = placement;
  const state = store.state;

  const stampX = getColumnX(startColumn, options);
  const rowCenterY = getRowY(row, options);
  const stampY = rowCenterY - (options.cellHeight / 2);

  // Calculate end column using time-space to handle tonic columns correctly
  // Stamps have a fixed duration of 2 time columns (microbeats)
  const startTimeCol = canvasToTime(startColumn, state);
  let effectiveEndColumn: number;

  if (startTimeCol !== null) {
    // Convert time span to canvas span (skipping any tonic columns)
    const endTimeCol = startTimeCol + 2;
    effectiveEndColumn = timeToCanvas(endTimeCol, state);
  } else {
    // Fallback for edge cases (stamp on tonic column - shouldn't happen with validation)
    effectiveEndColumn = startColumn + 2;
  }

  const stampEndX = getColumnX(effectiveEndColumn, options);
  const stampWidth = stampEndX - stampX;

  const stampHeight = options.cellHeight;

  const canvasWidth = getLogicalCanvasWidth(ctx.canvas);
  if (stampX + stampWidth < 0 || stampX > canvasWidth) {return;}

  const getRowYWithOptions = (rowIndex: number) => getRowY(rowIndex, options);

  defaultSixteenthStampRenderer.renderToCanvas(
    ctx,
    stamp,
    stampX,
    stampY,
    stampWidth,
    stampHeight,
    color,
    placement,
    getRowYWithOptions
  );

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = color;
  ctx.fillRect(stampX + 1, stampY + 1, stampWidth - 2, stampHeight - 2);
  ctx.restore();

  logger.debug('SixteenthStampRenderer', `Rendered stamp ${placement.sixteenthStampId} at ${startColumn}-${effectiveEndColumn},${row}`, {
    sixteenthStampId: placement.sixteenthStampId,
    startColumn,
    effectiveEndColumn,
    row,
    stampX,
    stampY,
    hasOffsets: !!placement.shapeOffsets
  }, 'stamps');
}

export function renderSixteenthStampPreview(
  ctx: CanvasRenderingContext2D,
  column: number,
  row: number,
  stamp: SixteenthStampShape | null,
  options: SixteenthStampRenderOptions & { previewColor?: string }
): void {
  if (!stamp) {return;}

  const state = store.state;
  const stampX = getColumnX(column, options);
  const rowCenterY = getRowY(row, options);
  const stampY = rowCenterY - (options.cellHeight / 2);

  // Calculate end column using time-space to handle tonic columns correctly
  // Preview stamps also have a fixed duration of 2 time columns (microbeats)
  const startTimeCol = canvasToTime(column, state);
  let effectiveEndColumn: number;

  if (startTimeCol !== null) {
    const endTimeCol = startTimeCol + 2;
    effectiveEndColumn = timeToCanvas(endTimeCol, state);
  } else {
    effectiveEndColumn = column + 2;
  }

  const stampEndX = getColumnX(effectiveEndColumn, options);
  const stampWidth = stampEndX - stampX;

  const stampHeight = options.cellHeight;

  ctx.save();
  ctx.globalAlpha = 0.6;
  defaultSixteenthStampRenderer.renderToCanvas(ctx, stamp, stampX, stampY, stampWidth, stampHeight, options.previewColor || '#4a90e2');
  ctx.restore();
}




