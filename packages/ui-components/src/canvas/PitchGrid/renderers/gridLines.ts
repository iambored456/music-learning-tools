/**
 * Grid Lines Renderer
 *
 * Pure rendering functions for horizontal and vertical grid lines.
 * All dependencies are passed explicitly as parameters.
 */

import type { PitchRowData, MacrobeatGrouping, MacrobeatBoundaryStyle, TonicSign } from '@mlt/types';
import type { CoordinateUtils } from '../types.js';

// ============================================================================
// Types
// ============================================================================

export interface HorizontalLinesConfig {
  fullRowData: PitchRowData[];
  cellHeight: number;
  viewportHeight: number;
  viewportWidth: number;
  colorMode: 'color' | 'bw';
  /**
   * Reference pitch class for horizontal line styling.
   * 0 = legacy C-reference behavior.
   * Non-zero rotates the full pattern relative to tonic.
  */
  horizontalGridReferencePitchClass?: number | null;
  /** Optional color for the emphasized solid reference line. */
  horizontalGridReferenceLineColor?: string;
  /** Optional color for the ordinary solid pitch lines. */
  horizontalGridDefaultLineColor?: string;
  /** Optional pixel width for the ordinary solid pitch lines. */
  horizontalGridDefaultLineWidth?: number;
  /** Optional pixel width for the emphasized dashed pitch line. */
  horizontalGridDashedLineWidth?: number;
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
  /** Time offset for beat alignment (e.g., lead-in time) */
  beatTimeOffsetMs?: number;
  /** Optional independent time offset for measure boundaries (e.g., pickup bars) */
  measureTimeOffsetMs?: number;
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

const SKIPPED_INTERVALS_FROM_REFERENCE = new Set<number>([1, 3, 5, 9, 11]);
const EMPHASIZED_SOLID_INTERVAL = 0; // Legacy C line
const EMPHASIZED_DASHED_INTERVAL = 4; // Legacy E line
const FILLED_INTERVAL = 7; // Legacy G row
const FILLED_INTERVAL_BORDER_INTERVALS = new Set<number>([
  (FILLED_INTERVAL + 11) % 12,
  (FILLED_INTERVAL + 1) % 12,
]);

const REFERENCE_CELL_HEIGHT = 12;
const BASE_DEFAULT_LINE_WIDTH = 1;
const BASE_E_LINE_WIDTH = 1;
const BASE_DASH_LENGTH = 5;
const BASE_C_LINE_WIDTH = 3.33;
const G_ROW_FILL_COLOR = 'rgba(173, 181, 189, 0.28)';
let lastHorizontalGridMetricsSignature = '';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scaleLineMetric(
  cellHeight: number,
  baseMetric: number,
  minMetric: number,
  maxMetric: number
): number {
  const scaled = (cellHeight / REFERENCE_CELL_HEIGHT) * baseMetric;
  return clamp(scaled, minMetric, maxMetric);
}

function getScaledDashPattern(cellHeight: number): number[] {
  const dashUnit = scaleLineMetric(cellHeight, BASE_DASH_LENGTH, 3.5, 8);
  return [dashUnit, dashUnit];
}

function roundMetric(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function logHorizontalGridMetrics(ctx: CanvasRenderingContext2D, cellHeight: number): void {
  if (typeof window === 'undefined') return;

  const defaultLineWidth = scaleLineMetric(cellHeight, BASE_DEFAULT_LINE_WIDTH, 0.75, 1.6);
  const cLineWidth = scaleLineMetric(cellHeight, BASE_C_LINE_WIDTH, 2.4, 4.2);
  const eLineWidth = scaleLineMetric(cellHeight, BASE_E_LINE_WIDTH, 0.75, 1.35);
  const dashPattern = getScaledDashPattern(cellHeight);
  const deviceScale = typeof ctx.getTransform === 'function' ? ctx.getTransform().a : 1;
  const metrics = {
    legendCellHeightPx: roundMetric(cellHeight),
    cLineThicknessPx: roundMetric(cLineWidth),
    eDashThicknessPx: roundMetric(eLineWidth),
    eDashPatternPx: dashPattern.map((value) => roundMetric(value)),
    gSpaceFillHeightPx: roundMetric(cellHeight),
    defaultLineThicknessPx: roundMetric(defaultLineWidth),
    cToLegendRatio: roundMetric(cLineWidth / cellHeight, 3),
    eToLegendRatio: roundMetric(eLineWidth / cellHeight, 3),
    defaultToLegendRatio: roundMetric(defaultLineWidth / cellHeight, 3),
    deviceScale: roundMetric(deviceScale, 3),
    legacyStudentNotationCLinePx: 3.33,
    legacyStudentNotationELinePx: 1,
  };
  const signature = JSON.stringify(metrics);
  if (signature === lastHorizontalGridMetricsSignature) return;

  lastHorizontalGridMetricsSignature = signature;
  console.log('[PitchGrid] Horizontal line metrics', metrics);
}

function normalizePitchClass(value: number): number {
  const rounded = Math.round(value);
  return ((rounded % 12) + 12) % 12;
}

function parsePitchClassFromPitchString(pitchWithOctave: string): number | null {
  if (typeof pitchWithOctave !== 'string' || pitchWithOctave.length === 0) return null;
  const token = pitchWithOctave
    .replace(/[0-9]/g, '')
    .replace(/\u266D/g, 'b')
    .replace(/\u266F/g, '#')
    .trim()
    .split('/')[0]
    .trim();

  switch (token) {
    case 'C': return 0;
    case 'B#': return 0;
    case 'C#': return 1;
    case 'Db': return 1;
    case 'D': return 2;
    case 'D#': return 3;
    case 'Eb': return 3;
    case 'E': return 4;
    case 'Fb': return 4;
    case 'F': return 5;
    case 'E#': return 5;
    case 'F#': return 6;
    case 'Gb': return 6;
    case 'G': return 7;
    case 'G#': return 8;
    case 'Ab': return 8;
    case 'A': return 9;
    case 'A#': return 10;
    case 'Bb': return 10;
    case 'B': return 11;
    case 'Cb': return 11;
    default:
      return null;
  }
}

function resolveRowPitchClass(row: PitchRowData): number | null {
  if (typeof row.pitchClass === 'number' && Number.isFinite(row.pitchClass)) {
    return normalizePitchClass(row.pitchClass);
  }

  if (typeof row.midi === 'number' && Number.isFinite(row.midi)) {
    return normalizePitchClass(row.midi);
  }

  return parsePitchClassFromPitchString(row.pitch);
}

function getLineStyleFromInterval(
  intervalFromReference: number,
  cellHeight: number,
  referenceLineColor: string,
  defaultLineColor: string,
  defaultLineWidthOverride?: number,
  dashedLineWidthOverride?: number
): {
  lineWidth: number;
  dash: number[];
  color: string;
  fillRow: boolean;
} {
  const defaultLineWidth =
    typeof defaultLineWidthOverride === 'number' && Number.isFinite(defaultLineWidthOverride)
      ? defaultLineWidthOverride
      : scaleLineMetric(cellHeight, BASE_DEFAULT_LINE_WIDTH, 0.75, 1.6);
  const cLineWidth = scaleLineMetric(cellHeight, BASE_C_LINE_WIDTH, 2.4, 4.2);
  const eLineWidth =
    typeof dashedLineWidthOverride === 'number' && Number.isFinite(dashedLineWidthOverride)
      ? dashedLineWidthOverride
      : scaleLineMetric(cellHeight, BASE_E_LINE_WIDTH, 0.75, 1.35);

  if (intervalFromReference === EMPHASIZED_SOLID_INTERVAL) {
    return { lineWidth: cLineWidth, dash: [], color: referenceLineColor, fillRow: false };
  }

  if (intervalFromReference === EMPHASIZED_DASHED_INTERVAL) {
    return {
      lineWidth: eLineWidth,
      dash: getScaledDashPattern(cellHeight),
      color: '#adb5bd',
      fillRow: false,
    };
  }

  if (intervalFromReference === FILLED_INTERVAL) {
    return { lineWidth: defaultLineWidth, dash: [], color: G_ROW_FILL_COLOR, fillRow: true };
  }

  return { lineWidth: defaultLineWidth, dash: [], color: defaultLineColor, fillRow: false };
}

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
  const {
    fullRowData,
    viewportHeight,
    viewportWidth,
    cellHeight,
    horizontalGridReferencePitchClass,
    horizontalGridReferenceLineColor = '#adb5bd',
    horizontalGridDefaultLineColor = '#ced4da',
    horizontalGridDefaultLineWidth,
    horizontalGridDashedLineWidth,
  } = config;
  const finalEndX = endX ?? viewportWidth;
  const referencePitchClass = (
    typeof horizontalGridReferencePitchClass === 'number' && Number.isFinite(horizontalGridReferencePitchClass)
      ? normalizePitchClass(horizontalGridReferencePitchClass)
      : 0
  );

  logHorizontalGridMetrics(ctx, cellHeight);

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const row = fullRowData[rowIndex];
    if (!row) continue;

    // Skip boundary padding rows
    if (row.isBoundary) continue;

    const y = coords.getRowY(rowIndex);

    // Skip if outside viewport (with small buffer)
    if (y < -10 || y > viewportHeight + 10) continue;

    const pitchClass = resolveRowPitchClass(row);
    if (pitchClass === null) continue;

    const intervalFromReference = (pitchClass - referencePitchClass + 12) % 12;
    if (SKIPPED_INTERVALS_FROM_REFERENCE.has(intervalFromReference)) continue;
    if (FILLED_INTERVAL_BORDER_INTERVALS.has(intervalFromReference)) continue;

    const style = getLineStyleFromInterval(
      intervalFromReference,
      cellHeight,
      horizontalGridReferenceLineColor,
      horizontalGridDefaultLineColor,
      horizontalGridDefaultLineWidth,
      horizontalGridDashedLineWidth
    );

    if (style.fillRow) {
      // Fill row style (legacy "G" behavior), now rotated relative to reference pitch class.
      ctx.save();
      ctx.fillStyle = style.color;
      ctx.fillRect(startX, y - cellHeight / 2, finalEndX - startX, cellHeight);
      ctx.restore();
    } else {
      // Stroke line styles (legacy C/E/default behavior), now tonic-relative when configured.
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
  const {
    viewportHeight,
    beatIntervalMs,
    measureIntervalMs,
    visibleTimeRange,
    beatTimeOffsetMs = 0,
    measureTimeOffsetMs = beatTimeOffsetMs,
  } = config;

  const normalizedMeasureIntervalMs = (
    Number.isFinite(measureIntervalMs) && (measureIntervalMs as number) > 0
  )
    ? (measureIntervalMs as number)
    : null;
  const measureRemainderEpsilonMs = normalizedMeasureIntervalMs
    ? Math.max(0.5, normalizedMeasureIntervalMs * 1e-6)
    : 0;

  // Calculate beat positions within visible time range, accounting for time offset
  // Beats should align with: offset, offset + beatIntervalMs, offset + 2*beatIntervalMs, etc.
  const adjustedStart = visibleTimeRange.startMs - beatTimeOffsetMs;
  const adjustedEnd = visibleTimeRange.endMs - beatTimeOffsetMs;
  const firstBeatIndex = Math.floor(adjustedStart / beatIntervalMs);
  const lastBeatIndex = Math.ceil(adjustedEnd / beatIntervalMs);

  for (let beatIndex = firstBeatIndex; beatIndex <= lastBeatIndex; beatIndex++) {
    const timeMs = beatTimeOffsetMs + (beatIndex * beatIntervalMs);
    const x = coords.getTimeX?.(timeMs);
    if (x === undefined) continue;

    // Measure boundaries may be offset independently from beat lines for pickup bars.
    let isMeasure = false;
    if (normalizedMeasureIntervalMs !== null) {
      const elapsedSinceMeasureOffsetMs = timeMs - measureTimeOffsetMs;
      const remainderMs = elapsedSinceMeasureOffsetMs % normalizedMeasureIntervalMs;
      isMeasure = Math.abs(remainderMs) <= measureRemainderEpsilonMs
        || Math.abs(Math.abs(remainderMs) - normalizedMeasureIntervalMs) <= measureRemainderEpsilonMs;
    }

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewportHeight);
    ctx.lineWidth = isMeasure ? 2 : 1;
    ctx.strokeStyle = isMeasure ? '#adb5bd' : '#dee2e6';
    ctx.setLineDash(isMeasure ? [] : [5, 5]);
    ctx.stroke();
  }

  ctx.setLineDash([]);
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
