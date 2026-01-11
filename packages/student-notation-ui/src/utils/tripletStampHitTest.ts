// Hit testing utility for detecting individual shapes within triplet groups
/**
 * COORDINATE SYSTEM NOTE:
 * - placement.startTimeIndex is a time-based microbeat index (ignores tonic columns)
 * - Must convert: time index → canvas-space column
 */

import { getTripletStampById, tripletCenterPercents } from '@/rhythm/tripletStamps.ts';
import { getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.js';
import { timeToCanvas } from '@services/columnMapService.ts';
import store from '@state/initStore.ts';
import type { TripletStampPlacement as StateTripletStampPlacement } from '../../types/state.js';

export type TripletStampPlacement = StateTripletStampPlacement;

export interface TripletStampRenderOptions {
  cellWidth: number;
  cellHeight: number;
  columnWidths?: number[];
  [key: string]: unknown;
}

export interface TripletStampHitResult {
  type: 'tripletStamp';
  slot: number;
  shapeKey: string;
  cx: number;
  cy: number;
  placement: TripletStampPlacement;
}

/**
 * Finds the individual shape (notehead) under mouse position within a triplet group.
 */
export function hitTestTripletStampShape(
  mouseX: number,
  mouseY: number,
  placement: TripletStampPlacement,
  options: TripletStampRenderOptions
): TripletStampHitResult | null {
  const stamp = getTripletStampById(placement.tripletStampId);
  if (!stamp) {
    return null;
  }

  // COORDINATE SYSTEM NOTE:
  // Convert cell index → time index → visual column → canvas-space column
  // (Same conversion as tripletStampRenderer.ts to ensure consistency)
  const timeSpan = placement.span * 2;
  const startColumn = timeToCanvas(placement.startTimeIndex, store.state);
  const endColumn = startColumn + timeSpan;

  // Calculate triplet group bounds
  const groupX = getColumnX(startColumn, options);
  const groupEndX = getColumnX(endColumn, options);
  const groupWidth = groupEndX - groupX;
  const groupHeight = options.cellHeight;

  // Test each active slot in the triplet
  for (const slot of stamp.hits) {
    const shapeKey = `triplet_${slot}`;
    const rowOffset = (placement.shapeOffsets?.[shapeKey]) || 0;
    const shapeRow = placement.row + rowOffset;
    const shapeCenterY = getRowY(shapeRow, options);

    // Calculate notehead position (matching tripletStampRenderer.ts)
    const centerPercent = tripletCenterPercents[slot];
    if (centerPercent === undefined) {
      continue;
    }
    const cx = groupX + (groupWidth * centerPercent / 100);

    const distance = Math.sqrt(
      Math.pow(mouseX - cx, 2) + Math.pow(mouseY - shapeCenterY, 2)
    );

    // Hit radius - generous vertical hit area for easier dragging
    const hitRadius = Math.min(groupWidth * 0.15, groupHeight * 1.0);

    if (distance < hitRadius) {
      return {
        type: 'tripletStamp',
        slot,
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
 * Tests if mouse is over any triplet shape in the given placements array.
 */
export function hitTestAnyTripletStampShape(
  mouseX: number,
  mouseY: number,
  placements: TripletStampPlacement[],
  options: TripletStampRenderOptions
): TripletStampHitResult | null {
  for (const placement of placements) {
    const hitResult = hitTestTripletStampShape(mouseX, mouseY, placement, options);
    if (hitResult) {
      return hitResult;
    }
  }

  return null;
}


