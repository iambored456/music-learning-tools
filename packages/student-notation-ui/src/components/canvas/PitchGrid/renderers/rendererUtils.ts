// js/components/Canvas/PitchGrid/renderers/rendererUtils.ts
import pitchGridViewportService from '../../../../services/pitchGridViewportService.ts';
import { createCoordinateMapping } from '../../../../rhythm/modulationMapping.js';
import pixelMapService from '../../../../services/pixelMapService.ts';
import store from '@state/initStore.ts';
import type { AppState, ModulationMarker } from '../../../../../types/state.js';

/**
 * COORDINATE SYSTEM NOTE:
 * All functions in this file work with CANVAS-SPACE coordinates (0 = first musical beat).
 * - getColumnX(): Converts canvas-space index → pixel position
 * - getColumnFromX(): Converts pixel position → canvas-space index
 * - columnWidths represents canvas-space columns only (no legends)
 */

type RendererOptions = Partial<AppState> & {
  columnWidths: number[];  // Canvas-space column widths (musical columns only, no legends)
  musicalColumnWidths?: number[];  // DEPRECATED: Will be removed, use columnWidths instead
  cellWidth: number;
  cellHeight: number;
  modulationMarkers?: ModulationMarker[];
  baseMicrobeatPx?: number;
};

type CoordinateMapping = ReturnType<typeof createCoordinateMapping>;

// Cache for coordinate mapping to avoid recalculating on every frame
let cachedCoordinateMapping: CoordinateMapping | null = null;
let lastMappingHash: string | null = null;

// Cache for viewport info to avoid recalculating on every row
let cachedViewportInfo: ReturnType<typeof pitchGridViewportService.getViewportInfo> | null = null;
let lastViewportFrame: number | null = null;

// Set up cache invalidation when modulation markers change
store.on('modulationMarkersChanged', () => {
  invalidateCoordinateMapping();
});

// Set up cache invalidation when viewport changes
store.on('scrollChanged', () => {
  cachedViewportInfo = null;
  lastViewportFrame = null;
});

store.on('zoomChanged', () => {
  cachedViewportInfo = null;
  lastViewportFrame = null;
});

store.on('pitchRangeChanged', () => {
  cachedViewportInfo = null;
  lastViewportFrame = null;
});

/**
 * Gets or creates a coordinate mapping for modulation markers
 * @param options Render options containing modulation markers
 * @returns Coordinate mapping object
 */
function getCoordinateMapping(options: RendererOptions): CoordinateMapping {
  const currentHash = JSON.stringify({
    markers: options.modulationMarkers || [],
    baseMicrobeatPx: options.baseMicrobeatPx ?? options.cellWidth ?? 40
  });

  if (cachedCoordinateMapping && currentHash === lastMappingHash) {
    return cachedCoordinateMapping;
  }

  const baseMicrobeatPx = options.baseMicrobeatPx ?? options.cellWidth ?? 40;
  cachedCoordinateMapping = createCoordinateMapping(options.modulationMarkers || [], baseMicrobeatPx, options as AppState);
  lastMappingHash = currentHash;

  return cachedCoordinateMapping;
}

/**
 * Gets cached viewport info to avoid recalculating on every row
 * @returns Viewport info object
 */
function getCachedViewportInfo(): ReturnType<typeof pitchGridViewportService.getViewportInfo> {
  const currentFrame = performance.now();

  // Invalidate cache if it's from a different frame (1ms threshold)
  if (!cachedViewportInfo || !lastViewportFrame || (currentFrame - lastViewportFrame) > 1) {
    cachedViewportInfo = pitchGridViewportService.getViewportInfo();
    lastViewportFrame = currentFrame;
  }

  return cachedViewportInfo;
}

/**
 * Gets X position for a canvas-space column index
 * @param index Canvas-space column (0 = first musical beat; musical canvas only, no legends)
 * @param options Render options with columnWidths (canvas-space)
 * @returns X position on musical canvas in pixels
 *
 * NOTE: This now delegates to pixelMapService for consistent column positioning
 * NOTE: Time-space conversions (excluding tonic columns) are handled by columnMapService.
 */
export function getColumnX(index: number, options: RendererOptions): number {
  // Get full state from store (options may only contain partial state)
  const state = store.state;
  const pixelOptions = {
    cellWidth: options.cellWidth,
    modulationMarkers: options.modulationMarkers,
    baseMicrobeatPx: options.baseMicrobeatPx,
    columnWidths: options.columnWidths,
    state: state
  };

  // Delegate to pixelMapService which handles caching and modulation
  return pixelMapService.columnToPixelX(index, pixelOptions, state);
}

/**
 * CANVAS Y-COORDINATE MAPPING
 * ===========================
 *
 * Converts a row index to its Y-position on the canvas.
 *
 * COORDINATE SYSTEM:
 *   - Canvas Y=0 is at the TOP of the pitch viewport (visible window into the pitch gamut)
 *   - The first visible row's TOP EDGE (not center) is at Y=0
 *   - Each row has height = cellHeight (vertical spacing between row centers = halfUnit)
 *
 * ROW INDEX TYPES:
 *   - This function expects a GLOBAL row index (index into the pitch gamut: fullRowData/masterRowData)
 *   - viewportInfo.startRank = pitchRange.topIndex (first visible global row)
 *   - The function converts global → relative position automatically
 *
 * VISUAL LAYOUT:
 *   Row 0 (first visible):  top=0, center=halfUnit, bottom=cellHeight
 *   Row 1:                  top=halfUnit, center=2*halfUnit, bottom=1.5*cellHeight
 *   ...and so on
 *
 * @param rowIndex - Global row index (0-104, index into fullRowData/masterRowData)
 * @param options - Render options containing cellHeight
 * @returns Y position of row CENTER on canvas in pixels (may be negative if above viewport)
 *
 * See src/utils/rowCoordinates.ts for full coordinate system documentation.
 */
export function getRowY(rowIndex: number, options: RendererOptions): number {
  const viewportInfo = getCachedViewportInfo();
  const relativeRowIndex = rowIndex - viewportInfo.startRank;
  const halfUnit = options.cellHeight / 2;
  // Row centers are positioned at halfUnit intervals starting from Y=halfUnit:
  // - The first visible row's TOP EDGE is at Y=0
  // - Row 0 center is at Y=halfUnit (full row is visible)
  // This avoids clipping the top half of the first visible row.
  const yPosition = (relativeRowIndex + 1) * halfUnit;

  return yPosition;
}

export function getPitchClass(pitchWithOctave: string): string {
  let pc = (pitchWithOctave || '').replace(/\d/g, '').trim();
  pc = pc.replace(/b/g, 'b-').replace(/#/g, 'b_');
  return pc;
}

export function getLineStyleFromPitchClass(pc: string): { lineWidth: number; dash: number[]; color: string } {
  switch (pc) {
    case 'C': return { lineWidth: 3.33, dash: [], color: '#adb5bd' };
    case 'E': return { lineWidth: 1, dash: [5, 5], color: '#adb5bd' }; // Use same pattern as vertical dashed lines
    case 'G': return { lineWidth: 1, dash: [], color: '#dee2e6' };
    case 'B':
    case 'A':
    case 'F':
    case 'Eb/Db':
    case 'Db/C#':
      return { lineWidth: 1, dash: [], color: '#ced4da' }; // Simple solid gray lines for conditional pitches
    default: return { lineWidth: 1, dash: [], color: '#ced4da' };
  }
}

export function getVisibleRowRange(): { startRow: number; endRow: number } {
  // Use getCachedViewportInfo() to ensure consistency with getRowY() which also uses cached info
  const viewportInfo = getCachedViewportInfo();
  const { startRank, endRank } = viewportInfo;
  // `startRank`/`endRank` are pitch-gamut indices (indices into `fullRowData`), not viewport-relative rows.
  // `pitchGridViewportService.getViewportInfo().endRank` is an exclusive upper bound (one past the last visible row).
  // Most renderers iterate with `<= endRow`, so convert to an inclusive index here.
  const endRow = Math.max(startRank, endRank - 1);
  return { startRow: startRank, endRow };
}

/**
 * Gets the current coordinate mapping for modulation (exposed for other renderers)
 * @param options Render options
 * @returns Coordinate mapping object
 */
export function getCurrentCoordinateMapping(options: RendererOptions): CoordinateMapping {
  return getCoordinateMapping(options);
}

/**
 * Invalidates the coordinate mapping cache (call when modulation markers change)
 */
export function invalidateCoordinateMapping(): void {
  cachedCoordinateMapping = null;
  lastMappingHash = null;
}

/**
 * Converts canvas X to canvas-space column index
 * @param canvasX X position on musical canvas
 * @param options Render options
 * @returns Canvas-space column index (0 = first musical beat)
 *
 * NOTE: This now delegates to pixelMapService for consistent column positioning
 * NOTE: Time-space conversions (excluding tonic columns) are handled by columnMapService.
 */
export function getColumnFromX(canvasX: number, options: RendererOptions): number {
  // Get full state from store (options may only contain partial state)
  const state = store.state;
  const pixelOptions = {
    cellWidth: options.cellWidth,
    modulationMarkers: options.modulationMarkers,
    baseMicrobeatPx: options.baseMicrobeatPx,
    columnWidths: options.columnWidths,
    state: state
  };

  // Delegate to pixelMapService which handles caching and modulation
  return pixelMapService.pixelXToColumn(canvasX, pixelOptions, state);
}

/**
 * INVERSE Y-COORDINATE MAPPING
 * ============================
 *
 * Converts a canvas Y position back to a global row index.
 * This is the inverse of getRowY().
 *
 * @param canvasY - Y position on canvas in pixels
 * @param options - Render options containing cellHeight
 * @returns Global row index (fractional for sub-row precision, e.g., 5.3 = between rows 5 and 6)
 *
 * USAGE:
 *   const globalRow = Math.round(getRowFromY(canvasY, options));
 *   const pitchData = fullRowData[globalRow];
 *
 * See src/utils/rowCoordinates.ts for full coordinate system documentation.
 */
export function getRowFromY(canvasY: number, options: RendererOptions): number {
  const viewportInfo = getCachedViewportInfo();
  const halfUnit = options.cellHeight / 2;
  // Inverse of getRowY():
  // y = (relative + 1) * halfUnit  =>  relative = (y / halfUnit) - 1
  const relativeRowIndex = (canvasY / halfUnit) - 1;
  const rowIndex = relativeRowIndex + viewportInfo.startRank;
  return rowIndex;
}
