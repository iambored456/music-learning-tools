/**
 * Sixteenth Stamp Actions
 *
 * Framework-agnostic sixteenth stamp manipulation actions for the store.
 * All dependencies (selectors, utilities) are injected via callbacks.
 */

import type {
  Store,
  SixteenthStampPlacement,
  CanvasSpaceColumn,
  SixteenthStampPlaybackData
} from '@mlt/types';
import type { ColumnMap } from '../../services/columnMapService.js';

/**
 * Callbacks for sixteenth stamp actions
 */
export interface SixteenthStampActionCallbacks {
  /** Convert time index to canvas column for canvas-space hit/erase operations */
  timeToCanvas?: (timeIndex: number, map: ColumnMap) => number;
  /** Get column map from state */
  getColumnMap?: (state: Store['state']) => ColumnMap;
  /** Logger function */
  log?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
}

/**
 * Generate a unique ID for sixteenth stamp placements
 */
function generateSixteenthStampPlacementId(): string {
  return `sixteenth-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create sixteenth stamp action methods bound to a store instance
 */
export function createSixteenthStampActions(callbacks: SixteenthStampActionCallbacks = {}) {
  const {
    timeToCanvas,
    getColumnMap,
    log = () => {}
  } = callbacks;

  return {
    /**
     * Adds a stamp placement to the state
     * @param startTimeIndex Time-space microbeat index (excludes tonic columns)
     * @returns The placement if successful
     */
    addSixteenthStampPlacement(
      this: Store,
      sixteenthStampId: number,
      startTimeIndex: number,
      row: number,
      color = '#4a90e2'
    ): SixteenthStampPlacement {
      const endTimeIndex = startTimeIndex + 2;

      // Check for collision with existing stamps (2-microbeat collision detection)
      const existingStamp = this.state.sixteenthStampPlacements.find(placement =>
        placement.row === row &&
        placement.startTimeIndex < endTimeIndex &&
        placement.startTimeIndex + 2 > startTimeIndex
      );

      if (existingStamp) {
        // Remove existing colliding stamp
        this.removeSixteenthStampPlacement(existingStamp.id);
      }

      // Check for collision with three-sixteenth stamps (time-space)
      if (this.state.sixteenthThreeStampPlacements) {
        const collidingThreeStamps = this.state.sixteenthThreeStampPlacements.filter(placement => {
          if (placement.row !== row) return false;
          const threeStampEndTime = placement.startTimeIndex + 1.5;
          return !(threeStampEndTime <= startTimeIndex || endTimeIndex <= placement.startTimeIndex);
        });
        collidingThreeStamps.forEach(stamp => {
          this.removeSixteenthThreeStampPlacement(stamp.id);
        });
      }

      // Check for collision with triplet stamps (time-space)
      if (this.state.tripletStampPlacements) {
        const collidingTriplets = this.state.tripletStampPlacements.filter(placement => {
          if (placement.row !== row) return false;
          const tripletEndTime = placement.startTimeIndex + (placement.span * 2);
          return !(tripletEndTime <= startTimeIndex || endTimeIndex <= placement.startTimeIndex);
        });
        collidingTriplets.forEach(stamp => {
          this.removeTripletStampPlacement(stamp.id);
        });
      }

      // Row indices are stored as global (full gamut) indices.
      const globalRow = row;

      const placement: SixteenthStampPlacement = {
        id: generateSixteenthStampPlacementId(),
        sixteenthStampId,
        startTimeIndex,
        row,
        globalRow,
        color,
        timestamp: Date.now(),
        shapeOffsets: {}
      };

      this.state.sixteenthStampPlacements.push(placement);
      this.emit('sixteenthStampPlacementsChanged');

      log('debug', `Added sixteenth stamp ${sixteenthStampId} at time ${startTimeIndex},${row}`, {
        sixteenthStampId,
        startTimeIndex,
        row,
        placementId: placement.id
      });

      return placement;
    },

    /**
     * Removes a stamp placement by ID
     */
    removeSixteenthStampPlacement(this: Store, placementId: string): boolean {
      const index = this.state.sixteenthStampPlacements.findIndex(p => p.id === placementId);
      if (index === -1) return false;

      const removed = this.state.sixteenthStampPlacements.splice(index, 1)[0];
      if (!removed) return false;

      this.emit('sixteenthStampPlacementsChanged');

      log('debug', `Removed sixteenth stamp ${removed.sixteenthStampId} at time ${removed.startTimeIndex},${removed.row}`, {
        placementId,
        sixteenthStampId: removed.sixteenthStampId,
        startTimeIndex: removed.startTimeIndex,
        row: removed.row
      });

      return true;
    },

    /**
     * Removes stamps that intersect with an eraser area
     * @param eraseStartCol Canvas-space column index
     * @param eraseEndCol Canvas-space column index
     */
    eraseSixteenthStampsInArea(
      this: Store,
      eraseStartCol: CanvasSpaceColumn,
      eraseEndCol: CanvasSpaceColumn,
      eraseStartRow: number,
      eraseEndRow: number
    ): boolean {
      const toRemove: string[] = [];
      const map = getColumnMap?.(this.state);

      for (const placement of this.state.sixteenthStampPlacements) {
        // Check for overlap between stamp's 2×1 area and eraser's area
        const startCanvasCol = map && timeToCanvas
          ? timeToCanvas(placement.startTimeIndex, map)
          : placement.startTimeIndex;
        const endCanvasCol = startCanvasCol + 2;
        const horizontalOverlap = startCanvasCol <= eraseEndCol && endCanvasCol >= eraseStartCol;
        const verticalOverlap = placement.row >= eraseStartRow && placement.row <= eraseEndRow;

        if (horizontalOverlap && verticalOverlap) {
          toRemove.push(placement.id);
        }
      }

      let removed = false;
      toRemove.forEach(id => {
        if (this.removeSixteenthStampPlacement(id)) {
          removed = true;
        }
      });

      return removed;
    },

    /**
     * Gets all stamp placements
     */
    getAllSixteenthStampPlacements(this: Store): SixteenthStampPlacement[] {
      return [...this.state.sixteenthStampPlacements];
    },

    /**
     * Gets stamp placement at specific time-space position
     * @param timeIndex Time-space microbeat index
     */
    getSixteenthStampAt(this: Store, timeIndex: number, row: number): SixteenthStampPlacement | null {
      return this.state.sixteenthStampPlacements.find(placement =>
        placement.row === row &&
        timeIndex >= placement.startTimeIndex &&
        timeIndex < placement.startTimeIndex + 2
      ) || null;
    },

    /**
     * Clears all stamp placements
     */
    clearAllSixteenthStamps(this: Store): void {
      const hadStamps = this.state.sixteenthStampPlacements.length > 0;
      this.state.sixteenthStampPlacements = [];

      if (hadStamps) {
        this.emit('sixteenthStampPlacementsChanged');
        log('info', 'Cleared all sixteenth stamp placements');
      }
    },

    /**
     * Gets stamp placements for playback scheduling
     */
    getSixteenthStampPlaybackData(this: Store): SixteenthStampPlaybackData[] {
      return this.state.sixteenthStampPlacements.map(placement => {
        const rowData = this.state.fullRowData[placement.row];
        return {
          sixteenthStampId: placement.sixteenthStampId,
          startTimeIndex: placement.startTimeIndex,
          row: placement.row,
          pitch: rowData?.toneNote || '',
          color: placement.color,
          placement  // Include full placement object with shapeOffsets
        };
      }).filter(data => data.pitch); // Only include stamps with valid pitches
    },

    /**
     * Updates the pitch offset for an individual shape within a stamp
     */
    updateSixteenthStampShapeOffset(
      this: Store,
      placementId: string,
      shapeKey: string,
      rowOffset: number
    ): void {
      const placement = this.state.sixteenthStampPlacements.find(p => p.id === placementId);
      if (!placement) {
        log('warn', '[SIXTEENTH STAMP SHAPE OFFSET] Placement not found', { placementId });
        return;
      }

      // Initialize shapeOffsets if it doesn't exist
      if (!placement.shapeOffsets) {
        placement.shapeOffsets = {};
      }

      log('debug', '[SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset', {
        placementId,
        shapeKey,
        oldOffset: placement.shapeOffsets[shapeKey] || 0,
        newOffset: rowOffset,
        baseRow: placement.row,
        targetRow: placement.row + rowOffset
      });

      placement.shapeOffsets[shapeKey] = rowOffset;
      this.emit('sixteenthStampPlacementsChanged');
    },

    /**
     * Gets the effective row for a specific shape within a stamp
     */
    getSixteenthStampShapeRow(this: Store, placement: SixteenthStampPlacement, shapeKey: string): number {
      const offset = (placement.shapeOffsets?.[shapeKey]) || 0;
      return placement.row + offset;
    }
  };
}
