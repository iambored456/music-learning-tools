/**
 * Triplet Stamp Actions
 *
 * Framework-agnostic triplet stamp manipulation actions for the store.
 * All dependencies (column mapping, services) are injected via callbacks.
 *
 * COORDINATE SYSTEM NOTE:
 * Triplets use TIME INDICES where 1 index = 1 microbeat (time-space column).
 * Time indices exclude tonic columns.
 */

import type {
  Store,
  TripletStampPlacement,
  CanvasSpaceColumn,
  SixteenthStampPlacement,
  TripletStampPlaybackData
} from '@mlt/types';
import type { ColumnMap } from '../../services/columnMapService.js';

/**
 * Callbacks for triplet stamp actions
 */
export interface TripletStampActionCallbacks {
  /** Convert canvas column to time index */
  canvasToTime?: (canvasIndex: number, map: ColumnMap) => number | null;
  /** Convert time index to canvas column */
  timeToCanvas?: (timeIndex: number, map: ColumnMap) => number;
  /** Get column map from state */
  getColumnMap?: (state: Store['state']) => ColumnMap;
  /** Logger function */
  log?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
}

/**
 * Generate a unique ID for triplet stamp placements
 */
function generateTripletStampPlacementId(): string {
  return `triplet-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create triplet stamp action methods bound to a store instance
 */
export function createTripletStampActions(callbacks: TripletStampActionCallbacks = {}) {
  const {
    canvasToTime,
    timeToCanvas,
    getColumnMap,
    log = () => {}
  } = callbacks;

  return {
    /**
     * Adds a triplet placement to the state
     * @param placement - The triplet placement object
     * @returns The placed triplet or null if invalid
     */
    addTripletStampPlacement(
      this: Store,
      placement: Omit<TripletStampPlacement, 'id'>
    ): TripletStampPlacement {
      // Ensure tripletStampPlacements array exists
      if (!this.state.tripletStampPlacements) {
        this.state.tripletStampPlacements = [];
      }

      // Check for collision with existing triplets
      const newEndTime = placement.startTimeIndex + (placement.span * 2);
      const existingTriplet = this.state.tripletStampPlacements.find(existing => {
        if (existing.row !== placement.row) return false;
        const existingEndTime = existing.startTimeIndex + (existing.span * 2);
        return !(existingEndTime <= placement.startTimeIndex || newEndTime <= existing.startTimeIndex);
      });

      if (existingTriplet) {
        // Remove existing colliding triplet
        this.removeTripletStampPlacement(existingTriplet.id);
      }

      // Check for collision with existing stamp placements
      if (this.state.sixteenthStampPlacements && canvasToTime && getColumnMap) {
        const map = getColumnMap(this.state);
        const collidingStamps = this.state.sixteenthStampPlacements.filter(stamp => {
          if (stamp.row !== placement.row) return false;

          const stampStartTime = canvasToTime(stamp.startColumn, map);
          if (stampStartTime === null) return true;
          const stampEndTime = stampStartTime + 2;
          return !(stampEndTime <= placement.startTimeIndex || stampStartTime >= newEndTime);
        });

        // Remove colliding stamps
        collidingStamps.forEach(stamp => {
          if (this.removeSixteenthStampPlacement) {
            this.removeSixteenthStampPlacement(stamp.id);
          }
        });
      }

      const finalPlacement: TripletStampPlacement = {
        id: generateTripletStampPlacementId(),
        ...placement,
        shapeOffsets: placement.shapeOffsets || {}
      };

      this.state.tripletStampPlacements.push(finalPlacement);
      this.emit('tripletStampPlacementsChanged');

      // Force grid refresh
      this.emit('rhythmStructureChanged');

      log('debug', `Added triplet stamp ${placement.tripletStampId} at time ${placement.startTimeIndex}, row ${placement.row}`, {
        tripletStampId: placement.tripletStampId,
        startTimeIndex: placement.startTimeIndex,
        span: placement.span,
        row: placement.row,
        placementId: finalPlacement.id
      });

      return finalPlacement;
    },

    /**
     * Removes a triplet placement by ID
     * @param placementId - The placement ID to remove
     * @returns True if a triplet was removed
     */
    removeTripletStampPlacement(this: Store, placementId: string): boolean {
      if (!this.state.tripletStampPlacements) return false;

      const index = this.state.tripletStampPlacements.findIndex(p => p.id === placementId);
      if (index === -1) return false;

      const removed = this.state.tripletStampPlacements.splice(index, 1)[0];
      if (!removed) return false;

      this.emit('tripletStampPlacementsChanged');

      log('debug', `Removed triplet stamp ${removed.tripletStampId} at time ${removed.startTimeIndex}, row ${removed.row}`, {
        placementId,
        tripletStampId: removed.tripletStampId,
        startTimeIndex: removed.startTimeIndex,
        span: removed.span,
        row: removed.row
      });

      return true;
    },

    /**
     * Removes triplets that intersect with an eraser area
     * @param eraseStartCol - Start column of eraser (canvas-space microbeat column)
     * @param eraseEndCol - End column of eraser (canvas-space microbeat column)
     * @param eraseStartRow - Start row of eraser
     * @param eraseEndRow - End row of eraser
     * @returns True if any triplets were removed
     */
    eraseTripletStampsInArea(
      this: Store,
      eraseStartCol: CanvasSpaceColumn,
      eraseEndCol: CanvasSpaceColumn,
      eraseStartRow: number,
      eraseEndRow: number
    ): boolean {
      if (!this.state.tripletStampPlacements || !timeToCanvas || !getColumnMap) return false;

      const map = getColumnMap(this.state);
      const toRemove: string[] = [];

      for (const placement of this.state.tripletStampPlacements) {
        // Check if triplet is in the eraser's row range
        if (placement.row >= eraseStartRow && placement.row <= eraseEndRow) {
          const timeSpan = placement.span * 2;
          const startCanvasCol = timeToCanvas(placement.startTimeIndex, map);
          const endCanvasCol = startCanvasCol + timeSpan - 1;

          if (!(endCanvasCol < eraseStartCol || startCanvasCol > eraseEndCol)) {
            toRemove.push(placement.id);
          }
        }
      }

      let removed = false;
      toRemove.forEach(id => {
        if (this.removeTripletStampPlacement(id)) {
          removed = true;
        }
      });

      return removed;
    },

    /**
     * Gets all triplet placements
     * @returns Array of all placed triplets
     */
    getAllTripletStampPlacements(this: Store): TripletStampPlacement[] {
      return [...(this.state.tripletStampPlacements || [])];
    },

    /**
     * Gets triplet placement at specific position
     * @param timeIndex - Grid time index (microbeat)
     * @param row - Grid row index
     * @returns The triplet at this position or null
     */
    getTripletStampAt(this: Store, timeIndex: number, row: number): TripletStampPlacement | null {
      if (!this.state.tripletStampPlacements) return null;

      return this.state.tripletStampPlacements.find(placement =>
        placement.row === row &&
        timeIndex >= placement.startTimeIndex &&
        timeIndex < placement.startTimeIndex + (placement.span * 2)
      ) || null;
    },

    /**
     * Clears all triplet placements
     */
    clearAllTripletStamps(this: Store): void {
      if (!this.state.tripletStampPlacements) return;

      const hadTriplets = this.state.tripletStampPlacements.length > 0;
      this.state.tripletStampPlacements = [];

      if (hadTriplets) {
        this.emit('tripletStampPlacementsChanged');
        log('info', 'Cleared all triplet stamp placements');
      }
    },

    /**
     * Gets triplet placements for playback scheduling
     * @returns Array of playback data for triplets
     */
    getTripletStampPlaybackData(this: Store): TripletStampPlaybackData[] {
      if (!this.state.tripletStampPlacements) return [];

      return this.state.tripletStampPlacements.map(placement => {
        const rowData = this.state.fullRowData[placement.row];
        return {
          startTimeIndex: placement.startTimeIndex,
          tripletStampId: placement.tripletStampId,
          row: placement.row,
          pitch: rowData?.toneNote ?? '',
          color: placement.color,
          span: placement.span,
          placement  // Include full placement object with shapeOffsets
        };
      }).filter(data => data.pitch); // Only include triplets with valid pitches
    },

    /**
     * Updates the pitch offset for an individual shape within a triplet group
     * @param placementId - The triplet placement ID
     * @param shapeKey - The shape identifier (e.g., "triplet_0", "triplet_1", "triplet_2")
     * @param rowOffset - The pitch offset in rows (can be negative)
     */
    updateTripletStampShapeOffset(
      this: Store,
      placementId: string,
      shapeKey: string,
      rowOffset: number
    ): void {
      const placement = this.state.tripletStampPlacements?.find(p => p.id === placementId);
      if (!placement) {
        log('warn', '[TRIPLET STAMP SHAPE OFFSET] Placement not found', { placementId });
        return;
      }

      if (!placement.shapeOffsets) {
        placement.shapeOffsets = {};
      }

      log('debug', '[TRIPLET STAMP SHAPE OFFSET] Updating shape offset', {
        placementId,
        shapeKey,
        oldOffset: placement.shapeOffsets[shapeKey] || 0,
        newOffset: rowOffset,
        baseRow: placement.row,
        targetRow: placement.row + rowOffset
      });

      placement.shapeOffsets[shapeKey] = rowOffset;
      this.emit('tripletStampPlacementsChanged');
    },

    /**
     * Gets the effective row for a specific shape within a triplet group
     * @param placement - The triplet placement object
     * @param shapeKey - The shape identifier
     * @returns The effective row index
     */
    getTripletStampShapeRow(this: Store, placement: TripletStampPlacement, shapeKey: string): number {
      const rowOffset = (placement.shapeOffsets?.[shapeKey]) || 0;
      return placement.row + rowOffset;
    }
  };
}
