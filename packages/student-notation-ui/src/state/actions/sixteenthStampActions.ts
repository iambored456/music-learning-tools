// js/state/actions/sixteenthStampActions.ts
import logger from '@utils/logger.ts';
import { isWithinTonicSpan, type TonicSign } from '@utils/tonicColumnUtils.ts';
import { getPlacedTonicSigns } from '@state/selectors.ts';
import type { Store, SixteenthStampPlacement, CanvasSpaceColumn } from '../../../types/state.js';

logger.moduleLoaded('SixteenthStampActions', 'stamps');

function generateSixteenthStampPlacementId(): string {
  return `sixteenth-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const sixteenthStampActions = {
  /**
     * Adds a stamp placement to the state
     * @param startColumn Canvas-space column index (0 = first musical beat)
     * @returns The placement if successful, null if blocked by tonic column
     */
  addSixteenthStampPlacement(this: Store, sixteenthStampId: number, startColumn: CanvasSpaceColumn, row: number, color = '#4a90e2'): SixteenthStampPlacement | null {
    const endColumn = (startColumn + 2) as CanvasSpaceColumn; // Stamps span 2 microbeats (endColumn is exclusive)

    // Check for collision with tonic columns (stamps span 2 microbeats)
    const placedTonicSigns = getPlacedTonicSigns(this.state) as TonicSign[];
    if (isWithinTonicSpan(startColumn, placedTonicSigns) ||
        isWithinTonicSpan(startColumn + 1, placedTonicSigns)) {
      logger.debug('SixteenthStampActions', `Cannot place sixteenth stamp - overlaps tonic column`, {
        sixteenthStampId, startColumn, row
      }, 'stamps');
      return null;
    }

    // Check for collision with existing stamps (2-microbeat collision detection)
    const existingStamp = this.state.sixteenthStampPlacements.find(placement =>
      placement.row === row &&
            placement.startColumn < endColumn &&
            placement.endColumn > startColumn
    );

    if (existingStamp) {
      // Remove existing colliding stamp
      sixteenthStampActions.removeSixteenthStampPlacement.call(this, existingStamp.id);
    }

    // Row indices are stored as global (full gamut) indices.
    const globalRow = row;

    const placement: SixteenthStampPlacement = {
      id: generateSixteenthStampPlacementId(),
      sixteenthStampId,
      startColumn,
      endColumn,
      row,
      globalRow,
      color,
      timestamp: Date.now()
    };

    this.state.sixteenthStampPlacements.push(placement);
    this.emit('sixteenthStampPlacementsChanged');

    logger.debug('SixteenthStampActions', `Added sixteenth stamp ${sixteenthStampId} at canvas-space ${startColumn}-${endColumn},${row}`, {
      sixteenthStampId,
      startColumn,
      endColumn,
      row,
      placementId: placement.id
    }, 'stamps');

    return placement;
  },

  /**
     * Removes a stamp placement by ID
     */
  removeSixteenthStampPlacement(this: Store, placementId: string): boolean {
    const index = this.state.sixteenthStampPlacements.findIndex(p => p.id === placementId);
    if (index === -1) {return false;}

    const removed = this.state.sixteenthStampPlacements.splice(index, 1)[0];
    if (!removed) {return false;}

    this.emit('sixteenthStampPlacementsChanged');

    logger.debug('SixteenthStampActions', `Removed sixteenth stamp ${removed.sixteenthStampId} at ${removed.startColumn}-${removed.endColumn},${removed.row}`, {
      placementId,
      sixteenthStampId: removed.sixteenthStampId,
      startColumn: removed.startColumn,
      endColumn: removed.endColumn,
      row: removed.row
    }, 'stamps');

    return true;
  },

  /**
     * Removes stamps that intersect with an eraser area
     * @param eraseStartCol Canvas-space column index
     * @param eraseEndCol Canvas-space column index
     */
  eraseSixteenthStampsInArea(this: Store, eraseStartCol: CanvasSpaceColumn, eraseEndCol: CanvasSpaceColumn, eraseStartRow: number, eraseEndRow: number): boolean {
    const toRemove = [];

    for (const placement of this.state.sixteenthStampPlacements) {
      // Check for overlap between stamp's 2×1 area and eraser's area
      const horizontalOverlap = placement.startColumn <= eraseEndCol && placement.endColumn >= eraseStartCol;
      const verticalOverlap = placement.row >= eraseStartRow && placement.row <= eraseEndRow;

      if (horizontalOverlap && verticalOverlap) {
        toRemove.push(placement.id);
      }
    }

    let removed = false;
    toRemove.forEach(id => {
      if (sixteenthStampActions.removeSixteenthStampPlacement.call(this, id)) {
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
     * Gets stamp placement at specific position
     * @param column Canvas-space column index (0 = first musical beat)
     */
  getSixteenthStampAt(this: Store, column: CanvasSpaceColumn, row: number): SixteenthStampPlacement | null {
    return this.state.sixteenthStampPlacements.find(placement =>
      placement.row === row &&
            column >= placement.startColumn &&
            column < placement.endColumn
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
      logger.info('SixteenthStampActions', 'Cleared all sixteenth stamp placements', null, 'stamps');
    }
  },

  /**
     * Gets stamp placements for playback scheduling
     */
  getSixteenthStampPlaybackData(this: Store): unknown[] {
    return this.state.sixteenthStampPlacements.map(placement => {
      const rowData = this.state.fullRowData[placement.row];
      return {
        sixteenthStampId: placement.sixteenthStampId,
        column: placement.startColumn,
        startColumn: placement.startColumn,
        endColumn: placement.endColumn,
        row: placement.row,
        pitch: rowData?.toneNote,
        color: placement.color,
        placement  // Include full placement object with shapeOffsets
      };
    }).filter(data => data.pitch); // Only include stamps with valid pitches
  },

  /**
     * Updates the pitch offset for an individual shape within a stamp
     */
  updateSixteenthStampShapeOffset(this: Store, placementId: string, shapeKey: string, rowOffset: number): void {
    const placement = this.state.sixteenthStampPlacements.find(p => p.id === placementId);
    if (!placement) {
      logger.warn('SixteenthStampActions', '[SIXTEENTH STAMP SHAPE OFFSET] Placement not found', { placementId }, 'stamps');
      return;
    }

    // Initialize shapeOffsets if it doesn't exist
    if (!placement.shapeOffsets) {
      placement.shapeOffsets = {};
    }

    logger.debug('SixteenthStampActions', '[SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset', {
      placementId,
      shapeKey,
      oldOffset: placement.shapeOffsets[shapeKey] || 0,
      newOffset: rowOffset,
      baseRow: placement.row,
      targetRow: placement.row + rowOffset
    }, 'stamps');

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




