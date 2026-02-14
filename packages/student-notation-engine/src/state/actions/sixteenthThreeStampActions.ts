/**
 * Three-Sixteenth Stamp Actions
 *
 * Framework-agnostic three-sixteenth stamp manipulation actions for the store.
 * These stamps use 3 evenly-spaced positions within a 1.5-microbeat cell.
 *
 * COORDINATE SYSTEM NOTE:
 * Three-sixteenth stamps use TIME INDICES (like triplets), where 1 index = 1 microbeat.
 * The spatial span is 1.5 microbeats.
 * Time indices exclude tonic columns.
 */

import type {
  Store,
  SixteenthThreeStampPlacement,
  SixteenthThreeStampPlaybackData
} from '@mlt/types';
import type { ColumnMap } from '../../services/columnMapService.js';

/** Constant span for three-sixteenth stamps: 1.5 microbeats */
const THREE_STAMP_SPAN = 1.5;

/**
 * Callbacks for three-sixteenth stamp actions
 */
export interface SixteenthThreeStampActionCallbacks {
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
 * Generate a unique ID for three-sixteenth stamp placements
 */
function generateSixteenthThreeStampPlacementId(): string {
  return `sixteenth-three-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create three-sixteenth stamp action methods bound to a store instance
 */
export function createSixteenthThreeStampActions(callbacks: SixteenthThreeStampActionCallbacks = {}) {
  const {
    canvasToTime,
    timeToCanvas,
    getColumnMap,
    log = () => {}
  } = callbacks;

  return {
    /**
     * Adds a three-sixteenth stamp placement to the state
     * @param startTimeIndex Time-space index (like triplets)
     * @returns The placement if successful
     */
    addSixteenthThreeStampPlacement(
      this: Store,
      sixteenthThreeStampId: number,
      startTimeIndex: number,
      row: number,
      color = '#4a90e2'
    ): SixteenthThreeStampPlacement {
      const endTimeIndex = startTimeIndex + THREE_STAMP_SPAN;

      // Check for collision with existing three-sixteenth stamps (both in time-space)
      const existingThreeStamp = this.state.sixteenthThreeStampPlacements.find(placement =>
        placement.row === row &&
        !(placement.startTimeIndex + THREE_STAMP_SPAN <= startTimeIndex || endTimeIndex <= placement.startTimeIndex)
      );

      if (existingThreeStamp) {
        this.removeSixteenthThreeStampPlacement(existingThreeStamp.id);
      }

      // Check for collision with four-sixteenth stamps (convert canvas-space to time-space)
      if (this.state.sixteenthStampPlacements && canvasToTime && getColumnMap) {
        const map = getColumnMap(this.state);
        const collidingStamps = this.state.sixteenthStampPlacements.filter(stamp => {
          if (stamp.row !== row) return false;
          const stampStartTime = canvasToTime(stamp.startColumn, map);
          if (stampStartTime === null) return true;
          const stampEndTime = stampStartTime + 2; // four-sixteenth stamps span 2 microbeats
          return !(stampEndTime <= startTimeIndex || stampStartTime >= endTimeIndex);
        });

        collidingStamps.forEach(stamp => {
          if (this.removeSixteenthStampPlacement) {
            this.removeSixteenthStampPlacement(stamp.id);
          }
        });
      }

      // Check for collision with triplet stamps (both in time-space)
      if (this.state.tripletStampPlacements) {
        const collidingTriplets = this.state.tripletStampPlacements.filter(triplet => {
          if (triplet.row !== row) return false;
          const tripletEndTime = triplet.startTimeIndex + (triplet.span * 2);
          return !(tripletEndTime <= startTimeIndex || endTimeIndex <= triplet.startTimeIndex);
        });

        collidingTriplets.forEach(triplet => {
          if (this.removeTripletStampPlacement) {
            this.removeTripletStampPlacement(triplet.id);
          }
        });
      }

      const globalRow = row;

      const placement: SixteenthThreeStampPlacement = {
        id: generateSixteenthThreeStampPlacementId(),
        sixteenthThreeStampId,
        startTimeIndex,
        row,
        globalRow,
        color,
        timestamp: Date.now(),
        shapeOffsets: {}
      };

      this.state.sixteenthThreeStampPlacements.push(placement);
      this.emit('sixteenthThreeStampPlacementsChanged');

      log('debug', `Added three-sixteenth stamp ${sixteenthThreeStampId} at time ${startTimeIndex}, row ${row}`, {
        sixteenthThreeStampId,
        startTimeIndex,
        row,
        placementId: placement.id
      });

      return placement;
    },

    /**
     * Removes a three-sixteenth stamp placement by ID
     */
    removeSixteenthThreeStampPlacement(this: Store, placementId: string): boolean {
      const index = this.state.sixteenthThreeStampPlacements.findIndex(p => p.id === placementId);
      if (index === -1) return false;

      const removed = this.state.sixteenthThreeStampPlacements.splice(index, 1)[0];
      if (!removed) return false;

      this.emit('sixteenthThreeStampPlacementsChanged');

      log('debug', `Removed three-sixteenth stamp ${removed.sixteenthThreeStampId} at time ${removed.startTimeIndex}, row ${removed.row}`, {
        placementId,
        sixteenthThreeStampId: removed.sixteenthThreeStampId,
        startTimeIndex: removed.startTimeIndex,
        row: removed.row
      });

      return true;
    },

    /**
     * Removes three-sixteenth stamps that intersect with an eraser area.
     * Accepts canvas-space columns (like triplet eraser) and converts placements
     * to canvas-space internally for comparison.
     */
    eraseSixteenthThreeStampsInArea(
      this: Store,
      eraseStartCol: number,
      eraseEndCol: number,
      eraseStartRow: number,
      eraseEndRow: number
    ): boolean {
      if (!timeToCanvas || !getColumnMap) return false;

      const map = getColumnMap(this.state);
      const toRemove: string[] = [];

      for (const placement of this.state.sixteenthThreeStampPlacements) {
        if (placement.row >= eraseStartRow && placement.row <= eraseEndRow) {
          const startCanvasCol = timeToCanvas(placement.startTimeIndex, map);
          // THREE_STAMP_SPAN is 1.5 microbeats = 3 time indices = 3 canvas columns
          const endCanvasCol = startCanvasCol + 3 - 1;

          if (!(endCanvasCol < eraseStartCol || startCanvasCol > eraseEndCol)) {
            toRemove.push(placement.id);
          }
        }
      }

      let removed = false;
      toRemove.forEach(id => {
        if (this.removeSixteenthThreeStampPlacement(id)) {
          removed = true;
        }
      });

      return removed;
    },

    /**
     * Gets all three-sixteenth stamp placements
     */
    getAllSixteenthThreeStampPlacements(this: Store): SixteenthThreeStampPlacement[] {
      return [...this.state.sixteenthThreeStampPlacements];
    },

    /**
     * Gets three-sixteenth stamp placement at specific time-space position
     */
    getSixteenthThreeStampAt(this: Store, timeIndex: number, row: number): SixteenthThreeStampPlacement | null {
      return this.state.sixteenthThreeStampPlacements.find(placement =>
        placement.row === row &&
        timeIndex >= placement.startTimeIndex &&
        timeIndex < placement.startTimeIndex + THREE_STAMP_SPAN
      ) || null;
    },

    /**
     * Clears all three-sixteenth stamp placements
     */
    clearAllSixteenthThreeStamps(this: Store): void {
      const hadStamps = this.state.sixteenthThreeStampPlacements.length > 0;
      this.state.sixteenthThreeStampPlacements = [];

      if (hadStamps) {
        this.emit('sixteenthThreeStampPlacementsChanged');
        log('info', 'Cleared all three-sixteenth stamp placements');
      }
    },

    /**
     * Gets three-sixteenth stamp placements for playback scheduling
     */
    getSixteenthThreeStampPlaybackData(this: Store): SixteenthThreeStampPlaybackData[] {
      return this.state.sixteenthThreeStampPlacements.map(placement => {
        const rowData = this.state.fullRowData[placement.row];
        return {
          sixteenthThreeStampId: placement.sixteenthThreeStampId,
          startTimeIndex: placement.startTimeIndex,
          row: placement.row,
          pitch: rowData?.toneNote || '',
          color: placement.color,
          placement
        };
      }).filter(data => data.pitch);
    },

    /**
     * Updates the pitch offset for an individual shape within a three-sixteenth stamp
     */
    updateSixteenthThreeStampShapeOffset(
      this: Store,
      placementId: string,
      shapeKey: string,
      rowOffset: number
    ): void {
      const placement = this.state.sixteenthThreeStampPlacements.find(p => p.id === placementId);
      if (!placement) {
        log('warn', '[THREE-SIXTEENTH STAMP SHAPE OFFSET] Placement not found', { placementId });
        return;
      }

      if (!placement.shapeOffsets) {
        placement.shapeOffsets = {};
      }

      log('debug', '[THREE-SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset', {
        placementId,
        shapeKey,
        oldOffset: placement.shapeOffsets[shapeKey] || 0,
        newOffset: rowOffset,
        baseRow: placement.row,
        targetRow: placement.row + rowOffset
      });

      placement.shapeOffsets[shapeKey] = rowOffset;
      this.emit('sixteenthThreeStampPlacementsChanged');
    },

    /**
     * Gets the effective row for a specific shape within a three-sixteenth stamp
     */
    getSixteenthThreeStampShapeRow(this: Store, placement: SixteenthThreeStampPlacement, shapeKey: string): number {
      const offset = (placement.shapeOffsets?.[shapeKey]) || 0;
      return placement.row + offset;
    }
  };
}
