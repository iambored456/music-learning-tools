/**
 * Canvas Coordinate Utilities
 *
 * Framework-agnostic coordinate transformation functions for the pitch grid.
 * All dependencies are injected via callbacks - no store or service imports.
 *
 * COORDINATE SYSTEM NOTE:
 * All functions work with CANVAS-SPACE coordinates (0 = first musical beat).
 * - getColumnX(): Converts canvas-space index → pixel position
 * - getColumnFromX(): Converts pixel position → canvas-space index
 * - columnWidths represents canvas-space columns only (no legends)
 */

import type { ModulationMarker } from '@mlt/types';

/**
 * Viewport information for visible row range
 */
export interface ViewportInfo {
  /** First visible global row index */
  startRank: number;
  /** Last visible global row index (exclusive) */
  endRank: number;
}

/**
 * Options for coordinate calculations
 */
export interface CoordinateOptions {
  /** Canvas-space column widths (musical columns only, no legends) */
  columnWidths: number[];
  /** Base cell width in pixels */
  cellWidth: number;
  /** Base cell height in pixels */
  cellHeight: number;
  /** Modulation markers for tempo changes */
  modulationMarkers?: ModulationMarker[];
  /** Base microbeat pixel width */
  baseMicrobeatPx?: number;
}

/**
 * Callbacks for coordinate calculations
 */
export interface CoordinateCallbacks {
  /** Get viewport info (visible row range) */
  getViewportInfo: () => ViewportInfo;
  /** Convert column index to X pixel (handles modulation) */
  columnToPixelX?: (columnIndex: number, options: CoordinateOptions) => number;
  /** Convert X pixel to column index (handles modulation) */
  pixelXToColumn?: (pixelX: number, options: CoordinateOptions) => number;
}

/**
 * Create coordinate utility functions with injected callbacks
 */
export function createCoordinateUtils(callbacks: CoordinateCallbacks) {
  // Cache for viewport info to avoid recalculating on every row
  let cachedViewportInfo: ViewportInfo | null = null;
  let lastViewportFrame: number | null = null;

  /**
   * Gets cached viewport info to avoid recalculating on every row
   */
  function getCachedViewportInfo(): ViewportInfo {
    const currentFrame = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Invalidate cache if it's from a different frame (1ms threshold)
    if (!cachedViewportInfo || !lastViewportFrame || (currentFrame - lastViewportFrame) > 1) {
      cachedViewportInfo = callbacks.getViewportInfo();
      lastViewportFrame = currentFrame;
    }

    return cachedViewportInfo;
  }

  /**
   * Invalidate the viewport cache (call when viewport changes)
   */
  function invalidateViewportCache(): void {
    cachedViewportInfo = null;
    lastViewportFrame = null;
  }

  /**
   * Gets X position for a canvas-space column index
   * @param index Canvas-space column (0 = first musical beat)
   * @param options Render options with columnWidths
   * @returns X position on musical canvas in pixels
   */
  function getColumnX(index: number, options: CoordinateOptions): number {
    // Use injected callback if available (handles modulation)
    if (callbacks.columnToPixelX) {
      return callbacks.columnToPixelX(index, options);
    }

    // Fallback: simple cumulative width calculation
    const { columnWidths, cellWidth } = options;
    let x = 0;
    for (let i = 0; i < index && i < columnWidths.length; i++) {
      x += (columnWidths[i] ?? 1) * cellWidth;
    }
    return x;
  }

  /**
   * Gets Y position for a global row index
   *
   * COORDINATE SYSTEM:
   *   - Canvas Y=0 is at the TOP of the pitch viewport
   *   - The first visible row's TOP EDGE (not center) is at Y=0
   *   - Each row has height = cellHeight (vertical spacing between row centers = halfUnit)
   *
   * @param rowIndex Global row index (index into fullRowData)
   * @param options Render options containing cellHeight
   * @returns Y position of row CENTER on canvas in pixels
   */
  function getRowY(rowIndex: number, options: CoordinateOptions): number {
    const viewportInfo = getCachedViewportInfo();
    const relativeRowIndex = rowIndex - viewportInfo.startRank;
    const halfUnit = options.cellHeight / 2;
    // Row centers are positioned at halfUnit intervals starting from Y=halfUnit
    const yPosition = (relativeRowIndex + 1) * halfUnit;
    return yPosition;
  }

  /**
   * Converts canvas X to canvas-space column index
   * @param canvasX X position on musical canvas
   * @param options Render options
   * @returns Canvas-space column index (0 = first musical beat)
   */
  function getColumnFromX(canvasX: number, options: CoordinateOptions): number {
    // Use injected callback if available (handles modulation)
    if (callbacks.pixelXToColumn) {
      return callbacks.pixelXToColumn(canvasX, options);
    }

    // Fallback: binary search through cumulative widths
    const { columnWidths, cellWidth } = options;
    let x = 0;
    for (let i = 0; i < columnWidths.length; i++) {
      const colWidth = (columnWidths[i] ?? 1) * cellWidth;
      if (canvasX < x + colWidth) {
        return i;
      }
      x += colWidth;
    }
    return columnWidths.length - 1;
  }

  /**
   * Converts canvas Y position to global row index
   * @param canvasY Y position on canvas in pixels
   * @param options Render options containing cellHeight
   * @returns Global row index (fractional for sub-row precision)
   */
  function getRowFromY(canvasY: number, options: CoordinateOptions): number {
    const viewportInfo = getCachedViewportInfo();
    const halfUnit = options.cellHeight / 2;
    // Inverse of getRowY():
    // y = (relative + 1) * halfUnit  =>  relative = (y / halfUnit) - 1
    const relativeRowIndex = (canvasY / halfUnit) - 1;
    return relativeRowIndex + viewportInfo.startRank;
  }

  /**
   * Get the visible row range
   */
  function getVisibleRowRange(): { startRow: number; endRow: number } {
    const viewportInfo = getCachedViewportInfo();
    const { startRank, endRank } = viewportInfo;
    // Convert to inclusive index
    const endRow = Math.max(startRank, endRank - 1);
    return { startRow: startRank, endRow };
  }

  /**
   * Get pitch class from pitch string (e.g., "C4" -> "C")
   */
  function getPitchClass(pitchWithOctave: string): string {
    let pc = (pitchWithOctave || '').replace(/\d/g, '').trim();
    pc = pc.replace(/b/g, 'b-').replace(/#/g, 'b_');
    return pc;
  }

  /**
   * Get line style based on pitch class
   */
  function getLineStyleFromPitchClass(pc: string): { lineWidth: number; dash: number[]; color: string } {
    switch (pc) {
      case 'C': return { lineWidth: 3.33, dash: [], color: '#adb5bd' };
      case 'E': return { lineWidth: 1, dash: [5, 5], color: '#adb5bd' };
      case 'G': return { lineWidth: 1, dash: [], color: '#dee2e6' };
      case 'B':
      case 'A':
      case 'F':
      case 'Eb/Db':
      case 'Db/C#':
        return { lineWidth: 1, dash: [], color: '#ced4da' };
      default: return { lineWidth: 1, dash: [], color: '#ced4da' };
    }
  }

  return {
    getColumnX,
    getRowY,
    getColumnFromX,
    getRowFromY,
    getVisibleRowRange,
    getPitchClass,
    getLineStyleFromPitchClass,
    invalidateViewportCache,
    getCachedViewportInfo
  };
}

export type CoordinateUtils = ReturnType<typeof createCoordinateUtils>;
