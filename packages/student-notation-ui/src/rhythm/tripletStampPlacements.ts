// js/rhythm/tripletStampPlacements.ts
import { getTripletStampById, GROUP_WIDTH_CELLS } from './tripletStamps.js';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import { type TonicSign } from '@utils/tonicColumnUtils.ts';
import { getPlacedTonicSigns } from '@state/selectors.ts';
import { canvasToTime, timeToCanvas } from '../services/columnMapService.ts';
import type { TripletStampPlaybackData, TripletStampPlacement } from '@app-types/state.js';

logger.moduleLoaded('TripletStampPlacements', 'triplets');

/**
 * Places a triplet group at the specified grid position
 */
export function placeTripletStampGroup(tripletStampId: number, startTimeIndex: number, row: number, color = '#4a90e2'): TripletStampPlacement | null {
  const stamp = getTripletStampById(tripletStampId);
  if (!stamp) {
    logger.warn('TripletStampPlacements', `Invalid triplet stamp ID: ${tripletStampId}`, { tripletStampId }, 'triplets');
    return null;
  }

  const span = GROUP_WIDTH_CELLS[stamp.span] ?? 1;

  // Check for collisions with existing rhythm elements
  if (!canPlaceTripletAt(startTimeIndex, span, row)) {
    logger.debug('TripletStampPlacements', `Cannot place triplet at time ${startTimeIndex}, row ${row} - collision detected`, {
      tripletStampId, startTimeIndex, row, span
    }, 'triplets');
    return null;
  }

  // Row indices are stored as global (full gamut) indices.
  const globalRow = row;

  // Create the triplet placement
  const placement = {
    id: `triplet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tripletStampId,
    startTimeIndex,
    span,
    row,
    globalRow,
    color,
    timestamp: Date.now()
  };

  // Add to state store
  return store.addTripletStampPlacement(placement);
}

/**
 * Checks if a triplet group can be placed at the specified position
 */
export function canPlaceTripletAt(startTimeIndex: number, span: number, row: number): boolean {
  const state = store.state;
  const placedTonicSigns = getPlacedTonicSigns(state) as TonicSign[];

  // Check for collisions with tonic columns
  // Triplets have a fixed TIME duration (span * 2 microbeats) but we need to check
  // if any tonic column falls within the CANVAS range they would occupy.
  //
  // Key insight: A triplet at time 6-10 occupies canvas columns based on its TIME span,
  // not the inflated canvas range that includes tonic offsets.
  // We check: is there any tonic with canvas column in [startCanvas, startCanvas + timeSpan)?

  const timeSpan = span * 2; // How many time columns (microbeats) this triplet occupies

  // Get the canvas-space start column
  const startCanvasCol = timeToCanvas(startTimeIndex, state);

  // The triplet occupies `timeSpan` worth of PLAYABLE columns starting at startCanvasCol
  // We need to check if any tonic falls within the next `timeSpan` canvas columns
  // But we also need to account for any tonics that might be IN that range

  // Check if any tonic column index falls within our required canvas range
  // For a triplet needing `timeSpan` playable columns starting at startCanvasCol,
  // we check columns startCanvasCol to startCanvasCol + timeSpan - 1 (inclusive)
  // But we must also check if ANY tonic in between would push our end beyond where we want
  for (const tonicSign of placedTonicSigns) {
    const tonicStart = tonicSign.columnIndex;
    const tonicEnd = tonicSign.columnIndex + 1; // Tonic occupies 2 columns

    // A tonic blocks placement if it starts within our required time span from startCanvasCol
    // Since we need `timeSpan` playable columns, any tonic at canvas [startCanvasCol, startCanvasCol + timeSpan)
    // would cause the triplet to visually stretch over it
    if (tonicStart >= startCanvasCol && tonicStart < startCanvasCol + timeSpan) {
      return false;
    }

    // Also check if we're trying to start ON a tonic
    if (startCanvasCol >= tonicStart && startCanvasCol <= tonicEnd) {
      return false;
    }
  }

  // Check for collisions with existing stamp placements
  if (state.sixteenthStampPlacements) {
    for (const placement of state.sixteenthStampPlacements) {
      if (placement.row === row) {
        // Check if this stamp overlaps with our triplet time span
        const stampStartTime = canvasToTime(placement.startColumn, state);
        if (stampStartTime === null) {
          return false;
        }
        const stampEndTime = stampStartTime + 2;
        const tripletEndTime = startTimeIndex + timeSpan;

        if (!(stampEndTime <= startTimeIndex || stampStartTime >= tripletEndTime)) {
          return false;
        }
      }
    }
  }

  // Check for collisions with existing triplet placements
  if (state.tripletStampPlacements) {
    for (const placement of state.tripletStampPlacements) {
      if (placement.row === row) {
        // Check if triplet groups overlap in time
        const existingEndTime = placement.startTimeIndex + (placement.span * 2);
        const newEndTime = startTimeIndex + timeSpan;

        if (!(newEndTime <= placement.startTimeIndex || startTimeIndex >= existingEndTime)) {
          return false; // Overlapping
        }
      }
    }
  }

  return true;
}

/**
 * Removes triplet groups that intersect with an eraser area
 */
export function eraseTripletStampGroups(eraseStartCol: number, eraseEndCol: number, eraseStartRow: number, eraseEndRow: number): boolean {
  const state = store.state;
  if (!state.tripletStampPlacements) {return false;}

  const toRemove = [];

  for (const placement of state.tripletStampPlacements) {
    // Check if triplet is in the eraser's row range
    if (placement.row >= eraseStartRow && placement.row <= eraseEndRow) {
      const timeSpan = placement.span * 2;
      const startCanvasCol = timeToCanvas(placement.startTimeIndex, state);
      const endCanvasCol = startCanvasCol + timeSpan - 1;

      if (!(endCanvasCol < eraseStartCol || startCanvasCol > eraseEndCol)) {
        toRemove.push(placement.id);
      }
    }
  }

  if (toRemove.length > 0) {
    toRemove.forEach(id => store.removeTripletStampPlacement(id));
    logger.debug('TripletStampPlacements', `Erased ${toRemove.length} triplet groups`, {
      removedIds: toRemove,
      eraseArea: { eraseStartCol, eraseEndCol, eraseStartRow, eraseEndRow }
    }, 'triplets');
    return true;
  }

  return false;
}

/**
 * Gets all triplet placements for playback scheduling
 */
export function getTripletStampPlaybackData(): TripletStampPlaybackData[] {
  return store.getTripletStampPlaybackData();
}

/**
 * Clears all triplet placements
 */
export function clearAllTripletStamps(): void {
  store.clearAllTripletStamps();
  logger.info('TripletStampPlacements', 'Cleared all triplet stamp placements', null, 'triplets');
}




