// js/rhythm/sixteenthStampPlacements.ts
import { getSixteenthStampById } from './sixteenthStamps.js';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import type { CanvasSpaceColumn, SixteenthStampPlaybackData, SixteenthStampPlacement } from '@app-types/state.js';

logger.moduleLoaded('SixteenthStampPlacements', 'stamps');

// Note: Stamp placements are now stored in the main state store instead of a local Map
// This provides persistence, undo/redo support, and proper state management

/**
 * Places a stamp at the specified grid position
 */
export function placeSixteenthStamp(sixteenthStampId: number, startColumn: number, row: number, color = '#4a90e2'): SixteenthStampPlacement | null {
  const stamp = getSixteenthStampById(sixteenthStampId);
  if (!stamp) {
    logger.warn('SixteenthStampPlacements', `Invalid sixteenth stamp ID: ${sixteenthStampId}`, { sixteenthStampId }, 'stamps');
    return null;
  }

  // Use store methods for placement with collision detection and state management
  return store.addSixteenthStampPlacement(sixteenthStampId, startColumn as CanvasSpaceColumn, row, color);
}

// Note: Collision detection and removal functions are now handled by the store actions

/**
 * Removes stamps that intersect with an eraser area (similar to circle note erasing)
 */
export function removeSixteenthStampsInEraserArea(eraseStartCol: number, eraseEndCol: number, eraseStartRow: number, eraseEndRow: number): boolean {
  // Use store method for erasing stamps
  return store.eraseSixteenthStampsInArea(eraseStartCol as CanvasSpaceColumn, eraseEndCol as CanvasSpaceColumn, eraseStartRow, eraseEndRow);
}

/**
 * Gets all stamp placements
 */
export function getAllSixteenthStampPlacements(): SixteenthStampPlacement[] {
  return store.getAllSixteenthStampPlacements();
}

/**
 * Gets stamp placement at specific position
 */
export function getSixteenthStampAt(column: number, row: number): SixteenthStampPlacement | null {
  return store.getSixteenthStampAt(column as CanvasSpaceColumn, row);
}

/**
 * Clears all stamp placements
 */
export function clearAllSixteenthStamps(): void {
  store.clearAllSixteenthStamps();
}

/**
 * Gets stamp placements for playback scheduling
 */
export function getSixteenthStampPlaybackData(): SixteenthStampPlaybackData[] {
  return store.getSixteenthStampPlaybackData();
}




