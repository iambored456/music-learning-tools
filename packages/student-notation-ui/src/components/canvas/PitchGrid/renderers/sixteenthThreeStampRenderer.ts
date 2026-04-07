// js/components/Canvas/PitchGrid/renderers/sixteenthThreeStampRenderer.ts
import { getSixteenthThreeStampById } from '../../../../rhythm/sixteenthThreeStamps.ts';
import { defaultSixteenthThreeStampRenderer } from '../../../../utils/sixteenthThreeStampRenderer.ts';
import { getRowY, getColumnX } from './rendererUtils.ts';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import { getLogicalCanvasWidth } from '@utils/canvasDimensions.ts';
import { timeToCanvas } from '../../../../services/columnMapService.ts';
import { getAnimationEffectsManager as getRuntimeAnimationEffectsManager } from '@services/runtimeGlobals.ts';
import { buildSixteenthStampShapeNoteId } from '@utils/stampPlaybackNoteId.ts';
import type { ModulationMarker, SixteenthThreeStampPlacement } from '@mlt/types';
import type { SixteenthThreeStampShape } from '../../../../utils/sixteenthThreeStampRenderer.ts';

/** Constant span: 1.5 microbeats */
const THREE_STAMP_TIME_SPAN = 1.5;

interface SixteenthThreeStampRenderOptions {
  columnWidths: number[];
  musicalColumnWidths?: number[];
  cellWidth: number;
  cellHeight: number;
  baseMicrobeatPx?: number;
  tempoModulationMarkers?: ModulationMarker[];
}

logger.moduleLoaded('SixteenthThreeStampRenderer', 'stamps');

interface AnimationEffectsManager {
  shouldFillNote(note: { color: string; uuid?: string }): boolean;
  getFillLevel(note: { color: string; uuid?: string }): number;
}

const getAnimationEffectsManager = (): AnimationEffectsManager | undefined => {
  return getRuntimeAnimationEffectsManager() as AnimationEffectsManager | undefined;
};

function getShapeFillLevels(placement: SixteenthThreeStampPlacement, stamp: SixteenthThreeStampShape): Record<string, number> | null {
  const manager = getAnimationEffectsManager();
  if (!manager) {
    return null;
  }

  const shapeFillLevels: Record<string, number> = {};

  stamp.diamonds.forEach((slot) => {
    const shapeKey = `diamond_${slot}`;
    const noteId = buildSixteenthStampShapeNoteId(placement.id, shapeKey);
    const note = { uuid: noteId, color: placement.color };
    if (manager.shouldFillNote(note)) {
      shapeFillLevels[shapeKey] = manager.getFillLevel(note);
    }
  });

  return Object.keys(shapeFillLevels).length > 0 ? shapeFillLevels : null;
}

export function renderSixteenthThreeStamps(ctx: CanvasRenderingContext2D, options: SixteenthThreeStampRenderOptions): void {
  const stamps: SixteenthThreeStampPlacement[] =
    store.getAllSixteenthThreeStampPlacements?.() ??
    store.state?.sixteenthThreeStampPlacements ??
    [];

  if (stamps.length === 0) {return;}

  logger.debug('SixteenthThreeStampRenderer', `Rendering ${stamps.length} three-sixteenth stamps`, { count: stamps.length }, 'stamps');

  stamps.forEach(placement => {
    renderSixteenthThreeStamp(ctx, placement, options);
  });
}

function renderSixteenthThreeStamp(ctx: CanvasRenderingContext2D, placement: SixteenthThreeStampPlacement, options: SixteenthThreeStampRenderOptions): void {
  const stamp: SixteenthThreeStampShape | undefined = getSixteenthThreeStampById(placement.sixteenthThreeStampId);
  if (!stamp) {return;}

  const { row, color } = placement;
  const state = store.state;

  // Convert time-space → canvas-space → pixels (same pattern as triplet renderer)
  const startCanvasCol = timeToCanvas(placement.startTimeIndex, state);
  const endCanvasCol = startCanvasCol + THREE_STAMP_TIME_SPAN;

  const stampX = getColumnX(startCanvasCol, options);
  const stampEndX = getColumnX(endCanvasCol, options);
  const stampWidth = stampEndX - stampX;

  const rowCenterY = getRowY(row, options);
  const stampY = rowCenterY - (options.cellHeight / 2);
  const stampHeight = options.cellHeight;

  const canvasWidth = getLogicalCanvasWidth(ctx.canvas);
  if (stampX + stampWidth < 0 || stampX > canvasWidth) {return;}

  const getRowYWithOptions = (rowIndex: number) => getRowY(rowIndex, options);
  const shapeFillLevels = getShapeFillLevels(placement, stamp);

  defaultSixteenthThreeStampRenderer.renderToCanvas(
    ctx,
    stamp,
    stampX,
    stampY,
    stampWidth,
    stampHeight,
    color,
    placement,
    getRowYWithOptions,
    shapeFillLevels
  );

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = color;
  ctx.fillRect(stampX + 1, stampY + 1, stampWidth - 2, stampHeight - 2);
  ctx.restore();

  logger.debug('SixteenthThreeStampRenderer', `Rendered three-sixteenth stamp ${placement.sixteenthThreeStampId} at time ${placement.startTimeIndex}, row ${row}`, {
    sixteenthThreeStampId: placement.sixteenthThreeStampId,
    startTimeIndex: placement.startTimeIndex,
    startCanvasCol,
    endCanvasCol,
    row,
    stampX,
    stampY,
    hasOffsets: !!placement.shapeOffsets
  }, 'stamps');
}

export function renderSixteenthThreeStampPreview(
  ctx: CanvasRenderingContext2D,
  column: number,
  row: number,
  stamp: SixteenthThreeStampShape | null,
  options: SixteenthThreeStampRenderOptions & { previewColor?: string }
): void {
  if (!stamp) {return;}

  const state = store.state;

  // column here is a canvas-space column from the mouse position
  // Convert to time-space then back to get proper span
  const startCanvasCol = column;
  const endCanvasCol = startCanvasCol + THREE_STAMP_TIME_SPAN;

  const stampX = getColumnX(startCanvasCol, options);
  const stampEndX = getColumnX(endCanvasCol, options);
  const stampWidth = stampEndX - stampX;

  const rowCenterY = getRowY(row, options);
  const stampY = rowCenterY - (options.cellHeight / 2);
  const stampHeight = options.cellHeight;

  ctx.save();
  ctx.globalAlpha = 0.6;
  defaultSixteenthThreeStampRenderer.renderToCanvas(ctx, stamp, stampX, stampY, stampWidth, stampHeight, options.previewColor || '#4a90e2');
  ctx.restore();
}
