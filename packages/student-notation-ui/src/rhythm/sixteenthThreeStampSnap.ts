import { timeToCanvas } from '@services/columnMapService.ts';
import type { AppState } from '@mlt/types';

const THREE_STAMP_SPAN = 1.5;
const EPSILON = 1e-9;

export interface SixteenthThreeStampSnapTarget {
  startTimeIndex: number;
  startCanvasCol: number;
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function getSixteenthThreeStampStartTimes(macrobeatGroupings: number[]): number[] {
  const startTimes: number[] = [];
  const totalTime = macrobeatGroupings.reduce((sum, grouping) => sum + grouping, 0);
  let macrobeatStartTime = 0;

  for (const grouping of macrobeatGroupings) {
    // Use 1.5-microbeat snap starts within each macrobeat (0, 1.5, ...).
    // Allow starts that cross the macrobeat boundary, provided the full stamp
    // still fits within the total time span.
    for (let localStart = 0; localStart < grouping - EPSILON; localStart += THREE_STAMP_SPAN) {
      const startTime = roundToHalf(macrobeatStartTime + localStart);
      if (startTime + THREE_STAMP_SPAN <= totalTime + EPSILON) {
        startTimes.push(startTime);
      }
    }
    macrobeatStartTime += grouping;
  }

  return startTimes;
}

export function getNearestSixteenthThreeStampSnapTarget(
  pointerCanvasCol: number,
  state: AppState
): SixteenthThreeStampSnapTarget | null {
  const startTimes = getSixteenthThreeStampStartTimes(state.macrobeatGroupings);
  if (startTimes.length === 0) {
    return null;
  }

  let bestTarget: SixteenthThreeStampSnapTarget | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const startTimeIndex of startTimes) {
    const startCanvasCol = timeToCanvas(startTimeIndex, state);
    const distance = Math.abs(pointerCanvasCol - startCanvasCol);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestTarget = { startTimeIndex, startCanvasCol };
    }
  }

  return bestTarget;
}
