// Hit testing utility for detecting individual shapes within three-sixteenth stamps
/**
 * COORDINATE SYSTEM NOTE:
 * - placement.startTimeIndex is a time-based index (like triplets, ignores tonic columns)
 * - Must convert: time index → canvas-space column → pixel position
 */

import { getSixteenthThreeStampById } from '@/rhythm/sixteenthThreeStamps.ts';
import { getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { timeToCanvas } from '@services/columnMapService.ts';
import store from '@state/initStore.ts';
import type { SixteenthThreeStampPlacement as StateSixteenthThreeStampPlacement } from '@mlt/types';

export type SixteenthThreeStampPlacement = StateSixteenthThreeStampPlacement;

/** Constant span: 1.5 microbeats */
const THREE_STAMP_TIME_SPAN = 1.5;

export interface SixteenthThreeStampRenderOptions {
  cellWidth: number;
  cellHeight: number;
  columnWidths?: number[];
  [key: string]: unknown;
}

export interface SixteenthThreeStampHitResult {
  type: 'diamond' | 'oval';
  slot: number;
  shapeKey: string;
  cx: number;
  cy: number;
  placement: SixteenthThreeStampPlacement;
}

/**
 * Finds the individual shape (diamond) under mouse position for a three-sixteenth stamp.
 * Slot centers are at 1/6, 3/6, 5/6 of the 1.5-microbeat cell.
 */
export function hitTestSixteenthThreeStampShape(
  mouseX: number,
  mouseY: number,
  placement: SixteenthThreeStampPlacement,
  options: SixteenthThreeStampRenderOptions
): SixteenthThreeStampHitResult | null {
  const stamp = getSixteenthThreeStampById(placement.sixteenthThreeStampId);
  if (!stamp) {
    return null;
  }

  // Convert time-space → canvas-space → pixels (same pattern as triplet hit test)
  const startCanvasCol = timeToCanvas(placement.startTimeIndex, store.state);
  const endCanvasCol = startCanvasCol + THREE_STAMP_TIME_SPAN;

  const stampX = getColumnX(startCanvasCol, options);
  const stampEndX = getColumnX(endCanvasCol, options);
  const stampWidth = stampEndX - stampX;
  const stampHeight = options.cellHeight;

  // Three evenly-spaced slot centers at 1/6, 3/6, 5/6
  const slotCenters = [1 / 6, 3 / 6, 5 / 6].map(
    ratio => stampX + ratio * stampWidth
  );

  for (const slot of stamp.diamonds) {
    const shapeKey = `diamond_${slot}`;
    const rowOffset = (placement.shapeOffsets?.[shapeKey]) || 0;
    const shapeRow = placement.row + rowOffset;
    const shapeCenterY = getRowY(shapeRow, options);

    const cx = slotCenters[slot];
    if (cx === undefined) {
      continue;
    }
    const distance = Math.sqrt(
      Math.pow(mouseX - cx, 2) + Math.pow(mouseY - shapeCenterY, 2)
    );

    const hitRadius = Math.min(stampWidth * 0.20, stampHeight * 1.0);

    if (distance < hitRadius) {
      return {
        type: 'diamond',
        slot: slot ?? 0,
        shapeKey,
        cx,
        cy: shapeCenterY,
        placement
      };
    }
  }

  return null;
}

/**
 * Tests if mouse is over any three-sixteenth stamp shape in the given placements array.
 */
export function hitTestAnySixteenthThreeStampShape(
  mouseX: number,
  mouseY: number,
  placements: SixteenthThreeStampPlacement[],
  options: SixteenthThreeStampRenderOptions
): SixteenthThreeStampHitResult | null {
  for (const placement of placements) {
    const hitResult = hitTestSixteenthThreeStampShape(mouseX, mouseY, placement, options);
    if (hitResult) {
      return hitResult;
    }
  }

  return null;
}
