/**
 * Grid Lines Renderer
 *
 * Pure rendering functions for horizontal and vertical grid lines.
 * All dependencies are passed explicitly as parameters.
 */

import type { PitchRowData, MacrobeatGrouping, MacrobeatBoundaryStyle, TonicSign } from '@mlt/types';
import type { CoordinateUtils } from '../types.js';
import { getPitchClass, getLineStyleFromPitchClass } from './coordinateUtils.js';

// ============================================================================
// Types
// ============================================================================

export interface HorizontalLinesConfig {
  fullRowData: PitchRowData[];
  cellHeight: number;
  viewportHeight: number;
  viewportWidth: number;
  colorMode: 'color' | 'bw';
}

export interface VerticalLinesConfig {
  columnWidths: number[];
  cellWidth: number;
  viewportHeight: number;
  macrobeatGroupings: MacrobeatGrouping[];
  macrobeatBoundaryStyles: MacrobeatBoundaryStyle[];
  placedTonicSigns: TonicSign[];
}

export interface TimeBasedVerticalLinesConfig {
  viewportWidth: number;
  viewportHeight: number;
  beatIntervalMs: number;
  measureIntervalMs?: number;
  visibleTimeRange: { startMs: number; endMs: number };
  nowLineX?: number;
}

// ============================================================================
// Anacrusis Colors (CSS variable fallback)
// ============================================================================

const DEFAULT_ANACRUSIS_COLORS = {
  stroke: '#c7cfd8',
  background: 'rgba(207, 214, 222, 0.32)',
};

let cachedAnacrusisColors: typeof DEFAULT_ANACRUSIS_COLORS | null = null;

function getAnacrusisColors(): typeof DEFAULT_ANACRUSIS_COLORS {
  if (cachedAnacrusisColors) return cachedAnacrusisColors;
  if (typeof window === 'undefined') return DEFAULT_ANACRUSIS_COLORS;

  try {
    const styles = window.getComputedStyle(document.documentElement);
    cachedAnacrusisColors = {
      stroke: styles.getPropertyValue('--c-anacrusis-border').trim() || DEFAULT_ANACRUSIS_COLORS.stroke,
      background: styles.getPropertyValue('--c-anacrusis-bg').trim() || DEFAULT_ANACRUSIS_COLORS.background,
    };
  } catch {
    cachedAnacrusisColors = DEFAULT_ANACRUSIS_COLORS;
  }

  return cachedAnacrusisColors;
}

// ============================================================================
// Horizontal Lines (Pitch Lines)
// ============================================================================

/**
 * Draw horizontal grid lines for visible rows.
 */
export function drawHorizontalLines(
  ctx: CanvasRenderingContext2D,
  config: HorizontalLinesConfig,
  coords: CoordinateUtils,
  startRow: number,
  endRow: number,
  startX: number = 0,
  endX?: number
): void {
  const { fullRowData, viewportHeight, viewportWidth, cellHeight } = config;
  const finalEndX = endX ?? viewportWidth;

  // Pitch classes to skip (for cleaner visual appearance)
  const pitchClassesToSkip = ['B', 'A', 'F', 'E♭/D♯', 'D♭/C♯'];

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const row = fullRowData[rowIndex];
    if (!row) continue;

    // Skip boundary padding rows
    if (row.isBoundary) continue;

    const y = coords.getRowY(rowIndex);

    // Skip if outside viewport (with small buffer)
    if (y < -10 || y > viewportHeight + 10) continue;

    const pitchClass = getPitchClass(row.pitch);

    // Skip certain pitch classes for cleaner appearance
    if (pitchClassesToSkip.includes(pitchClass)) continue;

    const style = getLineStyleFromPitchClass(pitchClass);

    if (pitchClass === 'G') {
      // G-line: Draw filled rectangle
      ctx.save();
      ctx.fillStyle = style.color;
      ctx.fillRect(startX, y - cellHeight / 2, finalEndX - startX, cellHeight);
      ctx.restore();
    } else {
      // All other lines: Draw stroke
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(finalEndX, y);
      ctx.lineWidth = style.lineWidth;
      ctx.strokeStyle = style.color;
      ctx.setLineDash(style.dash);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/**
 * Draw simple horizontal lines for singing/highway modes.
 * These modes don't need the complex anacrusis/tonic column handling.
 */
export function drawSimpleHorizontalLines(
  ctx: CanvasRenderingContext2D,
  config: HorizontalLinesConfig,
  coords: CoordinateUtils,
  startRow: number,
  endRow: number
): void {
  drawHorizontalLines(ctx, config, coords, startRow, endRow, 0, config.viewportWidth);
}

// ============================================================================
// Vertical Lines (Beat/Measure Lines) - Notation Mode
// ============================================================================

/**
 * Draw vertical grid lines for column-based layout (notation/playback modes).
 */
export function drawVerticalLines(
  ctx: CanvasRenderingContext2D,
  config: VerticalLinesConfig,
  coords: CoordinateUtils,
  macrobeatBoundaries: number[]
): void {
  const { columnWidths, viewportHeight, macrobeatBoundaryStyles, placedTonicSigns } = config;
  const totalColumns = columnWidths.length;

  for (let canvasCol = 0; canvasCol <= totalColumns; canvasCol++) {
    const isGridStartOrEnd = canvasCol === 0 || canvasCol === totalColumns;
    const isTonicColumnStart = isTonicColumn(canvasCol, placedTonicSigns);
    const isTonicColumnEnd = placedTonicSigns.some(ts => canvasCol === ts.columnIndex + 2);
    const isMacrobeatEnd = macrobeatBoundaries.includes(canvasCol);
    const shouldDraw = shouldDrawVerticalLineAtColumn(canvasCol, placedTonicSigns);

    if (!shouldDraw) continue;

    let style: { lineWidth: number; strokeStyle: string; dash: number[] } | null = null;

    if (isGridStartOrEnd || isTonicColumnStart || isTonicColumnEnd) {
      style = { lineWidth: 2, strokeStyle: '#adb5bd', dash: [] };
    } else if (isMacrobeatEnd) {
      const mbIndex = macrobeatBoundaries.indexOf(canvasCol);
      const boundaryStyle = macrobeatBoundaryStyles[mbIndex] ?? 'dashed';

      if (boundaryStyle === 'anacrusis') {
        const { stroke } = getAnacrusisColors();
        style = { lineWidth: 1, strokeStyle: stroke, dash: [4, 4] };
      } else {
        style = {
          lineWidth: 1,
          strokeStyle: '#adb5bd',
          dash: boundaryStyle === 'solid' ? [] : [5, 5],
        };
      }
    }

    if (!style) continue;

    const x = coords.getColumnX(canvasCol);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewportHeight);
    ctx.lineWidth = style.lineWidth;
    ctx.strokeStyle = style.strokeStyle;
    ctx.setLineDash(style.dash);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

// ============================================================================
// Vertical Lines (Beat/Measure Lines) - Time-Based Mode
// ============================================================================

/**
 * Draw vertical grid lines for time-based layout (singing/highway modes).
 */
export function drawTimeBasedVerticalLines(
  ctx: CanvasRenderingContext2D,
  config: TimeBasedVerticalLinesConfig,
  coords: CoordinateUtils
): void {
  const { viewportHeight, beatIntervalMs, measureIntervalMs, visibleTimeRange, nowLineX } = config;

  // Calculate beat positions within visible time range
  const firstBeat = Math.floor(visibleTimeRange.startMs / beatIntervalMs) * beatIntervalMs;
  const lastBeat = Math.ceil(visibleTimeRange.endMs / beatIntervalMs) * beatIntervalMs;

  for (let timeMs = firstBeat; timeMs <= lastBeat; timeMs += beatIntervalMs) {
    const x = coords.getTimeX?.(timeMs);
    if (x === undefined) continue;

    // Determine if this is a measure boundary
    const isMeasure = measureIntervalMs ? (timeMs % measureIntervalMs === 0) : false;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewportHeight);
    ctx.lineWidth = isMeasure ? 2 : 1;
    ctx.strokeStyle = isMeasure ? '#adb5bd' : '#dee2e6';
    ctx.setLineDash(isMeasure ? [] : [5, 5]);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Draw "now line" if specified (highway mode)
  if (nowLineX !== undefined) {
    ctx.beginPath();
    ctx.moveTo(nowLineX, 0);
    ctx.lineTo(nowLineX, viewportHeight);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00ff00';
    ctx.setLineDash([]);
    ctx.stroke();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a column is the start of a tonic column.
 */
function isTonicColumn(columnIndex: number, placedTonicSigns: TonicSign[]): boolean {
  return placedTonicSigns.some(ts => ts.columnIndex === columnIndex);
}

/**
 * Check if a vertical line should be drawn at this column.
 * Skip drawing in the middle of tonic columns (columnIndex + 1).
 */
function shouldDrawVerticalLineAtColumn(columnIndex: number, placedTonicSigns: TonicSign[]): boolean {
  // Skip the middle column of tonic signs (they span 2 columns)
  return !placedTonicSigns.some(ts => ts.columnIndex + 1 === columnIndex);
}
