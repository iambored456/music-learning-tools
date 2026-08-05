// js/components/Canvas/PitchGrid/renderers/sixteenthStampRenderer.ts
import { getSixteenthStampById } from '../../../../rhythm/sixteenthStamps.ts';
import { diamondPath } from '@components/rhythm/glyphs/sixteenthGlyphs.ts';
import { defaultSixteenthStampRenderer } from '../../../../utils/sixteenthStampRenderer.ts';
import { getRowY, getColumnX } from './rendererUtils.ts';
import { drawNoteLabelText, type PitchRendererOptions } from './notes.ts';
import {
  drawStampShapeDelayEllipse,
  drawStampShapeDelayPath,
  getStampShapeVibratoYOffset
} from './stampShapeEffects.ts';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import { getLogicalCanvasWidth } from '@utils/canvasDimensions.ts';
import { timeToCanvas } from '../../../../services/columnMapService.ts';
import { getAnimationEffectsManager as getRuntimeAnimationEffectsManager } from '@services/runtimeGlobals.ts';
import { buildSixteenthStampShapeNoteId } from '@utils/stampPlaybackNoteId.ts';
import type { AnimatableNote, CanvasSpaceColumn, ModulationMarker, PlacedNote, SixteenthStampPlacement } from '@mlt/types';
import type { SixteenthStampShape, SixteenthStampShapeEffects } from '../../../../utils/sixteenthStampRenderer.ts';

interface SixteenthStampRenderOptions {
  columnWidths: number[];
  musicalColumnWidths?: number[];
  cellWidth: number;
  cellHeight: number;
  baseMicrobeatPx?: number;
  tempoModulationMarkers?: ModulationMarker[];
  tempo?: number;
}

logger.moduleLoaded('SixteenthStampRenderer', 'stamps');

interface AnimationEffectsManager {
  shouldFillNote(note: { color: string; uuid?: string }): boolean;
  getFillLevel(note: { color: string; uuid?: string }): number;
}

const getAnimationEffectsManager = (): AnimationEffectsManager | undefined => {
  return getRuntimeAnimationEffectsManager() as AnimationEffectsManager | undefined;
};

function createStampDegreeNote(
  placement: SixteenthStampPlacement,
  shapeKey: string,
  rowOffset: number,
  startColumn: number,
  color: string,
  shape: PlacedNote['shape'] = 'diamond'
): PlacedNote {
  const row = placement.row + rowOffset;
  const globalRow = (placement.globalRow ?? placement.row) + rowOffset;
  const columnIndex = Math.max(0, Math.floor(startColumn)) as CanvasSpaceColumn;

  return {
    uuid: buildSixteenthStampShapeNoteId(placement.id, shapeKey),
    row,
    globalRow,
    startColumnIndex: columnIndex,
    endColumnIndex: columnIndex,
    shape,
    color
  };
}

function createStampShapeEffectNote(
  placement: SixteenthStampPlacement,
  shapeKey: string
): AnimatableNote {
  return {
    uuid: buildSixteenthStampShapeNoteId(placement.id, shapeKey),
    color: placement.color
  };
}

function createSixteenthStampShapeEffects(
  ctx: CanvasRenderingContext2D,
  placement: SixteenthStampPlacement,
  options: SixteenthStampRenderOptions
): SixteenthStampShapeEffects {
  const effectOptions = {
    cellWidth: options.cellWidth,
    cellHeight: options.cellHeight,
    tempo: options.tempo ?? store.state.tempo
  };

  return {
    getYOffset: (shapeKey) => {
      return getStampShapeVibratoYOffset(createStampShapeEffectNote(placement, shapeKey), effectOptions);
    },
    drawEllipseDelayGhosts: (shapeKey, cx, cy, rx, ry) => {
      drawStampShapeDelayEllipse(ctx, createStampShapeEffectNote(placement, shapeKey), effectOptions, cx, cy, rx, ry);
    },
    drawPathDelayGhosts: (shapeKey, cx, cy, width, height) => {
      drawStampShapeDelayPath(
        ctx,
        createStampShapeEffectNote(placement, shapeKey),
        effectOptions,
        cx,
        cy,
        width,
        height,
        (pathCx, pathCy, pathWidth, pathHeight) => new Path2D(diamondPath(pathCx, pathCy, pathWidth, pathHeight))
      );
    }
  };
}

function renderSixteenthStampDegreeLabels(
  ctx: CanvasRenderingContext2D,
  stamp: SixteenthStampShape,
  placement: SixteenthStampPlacement,
  startColumn: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  options: SixteenthStampRenderOptions
): void {
  if (!store.state.showPitchLabels && store.state.degreeDisplayMode === 'off') {
    return;
  }

  const scaleX = (width / 100) * 0.8;
  const scaleY = (height / 100) * 0.8;
  const diamondW = 30 * scaleX;
  const ovalRx = 30 * scaleX;
  const ovalRy = 60 * scaleY;
  const slotCenters = [0.125, 0.375, 0.625, 0.875].map(ratio => x + ratio * width);
  const centerY = y + height / 2;
  const degreeOptions = { ...store.state, ...options } as PitchRendererOptions;

  stamp.ovals.forEach(ovalStart => {
    const shapeKey = `oval_${ovalStart}`;
    const rowOffset = placement.shapeOffsets?.[shapeKey] || 0;
    const ovalY = getRowY(placement.row + rowOffset, options);
    const cx = ovalStart === 0 ? x + 0.25 * width : x + 0.75 * width;
    const noteColumn = startColumn + (ovalStart === 0 ? 0 : 1);
    const note = createStampDegreeNote(placement, shapeKey, rowOffset, noteColumn, color, 'oval');
    const labelY = ovalY + getStampShapeVibratoYOffset(note, options);

    ctx.save();
    const labelRadius = Math.max(1, Math.min(ovalRx, ovalRy) * 0.82);
    drawNoteLabelText(ctx, note, degreeOptions, cx, labelY, labelRadius, labelRadius);
    ctx.restore();
  });

  stamp.diamonds.forEach(slot => {
    const cx = slotCenters[slot];
    if (cx === undefined) {
      return;
    }

    const shapeKey = `diamond_${slot}`;
    const rowOffset = placement.shapeOffsets?.[shapeKey] || 0;
    const diamondY = getRowY(placement.row + rowOffset, options);
    const noteColumn = startColumn + Math.floor(slot / 2);
    const note = createStampDegreeNote(placement, shapeKey, rowOffset, noteColumn, color);
    const labelY = diamondY + getStampShapeVibratoYOffset(note, options);

    ctx.save();
    const labelRadius = Math.max(1, diamondW * 0.66);
    drawNoteLabelText(ctx, note, degreeOptions, cx, labelY, labelRadius, labelRadius);
    ctx.restore();
  });
}

function getShapeFillLevels(placement: SixteenthStampPlacement, stamp: SixteenthStampShape): Record<string, number> | null {
  const manager = getAnimationEffectsManager();
  if (!manager) {
    return null;
  }

  const shapeFillLevels: Record<string, number> = {};

  stamp.ovals.forEach((slot) => {
    const shapeKey = `oval_${slot}`;
    const noteId = buildSixteenthStampShapeNoteId(placement.id, shapeKey);
    const note = { uuid: noteId, color: placement.color };
    if (manager.shouldFillNote(note)) {
      shapeFillLevels[shapeKey] = manager.getFillLevel(note);
    }
  });

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

  const { startTimeIndex, row, color } = placement;
  const state = store.state;

  const startColumn = timeToCanvas(startTimeIndex, state);
  const stampX = getColumnX(startColumn, options);
  const rowCenterY = getRowY(row, options);
  const stampY = rowCenterY - (options.cellHeight / 2);

  // Stamps visually occupy two canvas columns. Do not convert the end time through
  // the column map, because inserted tonic columns have no time and would stretch
  // stamps that end at a tonic boundary.
  const effectiveEndColumn = startColumn + 2;

  const stampEndX = getColumnX(effectiveEndColumn, options);
  const stampWidth = stampEndX - stampX;

  const stampHeight = options.cellHeight;

  const canvasWidth = getLogicalCanvasWidth(ctx.canvas);
  if (stampX + stampWidth < 0 || stampX > canvasWidth) {return;}

  const getRowYWithOptions = (rowIndex: number) => getRowY(rowIndex, options);
  const shapeFillLevels = getShapeFillLevels(placement, stamp);
  const shapeEffects = createSixteenthStampShapeEffects(ctx, placement, options);

  defaultSixteenthStampRenderer.renderToCanvas(
    ctx,
    stamp,
    stampX,
    stampY,
    stampWidth,
    stampHeight,
    color,
    placement,
    getRowYWithOptions,
    shapeFillLevels,
    shapeEffects
  );

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = color;
  ctx.fillRect(stampX + 1, stampY + 1, stampWidth - 2, stampHeight - 2);
  ctx.restore();

  renderSixteenthStampDegreeLabels(
    ctx,
    stamp,
    placement,
    startColumn,
    stampX,
    stampY,
    stampWidth,
    stampHeight,
    color,
    options
  );

  logger.debug('SixteenthStampRenderer', `Rendered stamp ${placement.sixteenthStampId} at time ${startTimeIndex}, row ${row}`, {
    sixteenthStampId: placement.sixteenthStampId,
    startTimeIndex,
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

  const effectiveEndColumn = column + 2;

  const stampEndX = getColumnX(effectiveEndColumn, options);
  const stampWidth = stampEndX - stampX;

  const stampHeight = options.cellHeight;

  ctx.save();
  ctx.globalAlpha = 0.6;
  defaultSixteenthStampRenderer.renderToCanvas(ctx, stamp, stampX, stampY, stampWidth, stampHeight, options.previewColor || '#4a90e2');
  ctx.restore();
}




