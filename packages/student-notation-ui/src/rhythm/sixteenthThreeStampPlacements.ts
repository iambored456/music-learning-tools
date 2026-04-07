// js/rhythm/sixteenthThreeStampPlacements.ts
import { getSixteenthThreeStampById } from './sixteenthThreeStamps.ts';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import type { SixteenthThreeStampPlaybackData, SixteenthThreeStampPlacement } from '@mlt/types';

logger.moduleLoaded('SixteenthThreeStampPlacements', 'stamps');

/**
 * Places a three-sixteenth stamp at the specified time-space position
 */
export function placeSixteenthThreeStamp(sixteenthThreeStampId: number, startTimeIndex: number, row: number, color = '#4a90e2'): SixteenthThreeStampPlacement | null {
  const stamp = getSixteenthThreeStampById(sixteenthThreeStampId);
  if (!stamp) {
    logger.warn('SixteenthThreeStampPlacements', `Invalid three-sixteenth stamp ID: ${sixteenthThreeStampId}`, { sixteenthThreeStampId }, 'stamps');
    return null;
  }

  return store.addSixteenthThreeStampPlacement(sixteenthThreeStampId, startTimeIndex, row, color);
}

/**
 * Removes stamps that intersect with an eraser area.
 * Accepts canvas-space columns (the store action handles conversion internally).
 */
export function removeSixteenthThreeStampsInEraserArea(eraseStartCol: number, eraseEndCol: number, eraseStartRow: number, eraseEndRow: number): boolean {
  return store.eraseSixteenthThreeStampsInArea(eraseStartCol, eraseEndCol, eraseStartRow, eraseEndRow);
}

/**
 * Gets all three-sixteenth stamp placements
 */
export function getAllSixteenthThreeStampPlacements(): SixteenthThreeStampPlacement[] {
  return store.getAllSixteenthThreeStampPlacements();
}

/**
 * Gets stamp placement at specific time-space position
 */
export function getSixteenthThreeStampAt(timeIndex: number, row: number): SixteenthThreeStampPlacement | null {
  return store.getSixteenthThreeStampAt(timeIndex, row);
}

/**
 * Clears all three-sixteenth stamp placements
 */
export function clearAllSixteenthThreeStamps(): void {
  store.clearAllSixteenthThreeStamps();
}

/**
 * Gets stamp placements for playback scheduling
 */
export function getSixteenthThreeStampPlaybackData(): SixteenthThreeStampPlaybackData[] {
  return store.getSixteenthThreeStampPlaybackData();
}
