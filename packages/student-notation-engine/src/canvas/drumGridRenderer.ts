/**
 * Drum Grid Renderer
 *
 * Framework-agnostic drum grid canvas rendering.
 * All dependencies are injected via callbacks - no store or service imports.
 */

import type {
  PlacedNote,
  TonicSign,
  MacrobeatGrouping,
  MacrobeatBoundaryStyle,
  ModulationMarker,
} from '@mlt/types';

import type { CoordinateUtils, CoordinateOptions } from './coordinateUtils.js';
import type { MacrobeatInfo } from './gridLines.js';

/**
 * Drum track definitions
 */
export const DRUM_TRACKS = ['H', 'M', 'L'] as const;
export type DrumTrack = typeof DRUM_TRACKS[number];

/**
 * Drum note with drum-specific fields
 */
export interface DrumNote extends PlacedNote {
  isDrum?: boolean;
  drumTrack?: string | number | null;
}

/**
 * Options for rendering the drum grid
 */
export interface DrumGridRenderOptions extends CoordinateOptions {
  /** Placed drum notes */
  placedNotes: DrumNote[];
  /** Placed tonic signs */
  placedTonicSigns: TonicSign[];
  /** Musical column widths (canvas-space) */
  musicalColumnWidths?: number[];
  /** Macrobeat groupings */
  macrobeatGroupings: MacrobeatGrouping[];
  /** Macrobeat boundary styles */
  macrobeatBoundaryStyles: MacrobeatBoundaryStyle[];
  /** Modulation markers */
  tempoModulationMarkers?: ModulationMarker[];
  /** Base microbeat pixel width */
  baseMicrobeatPx: number;
  /** Whether piece has anacrusis */
  hasAnacrusis?: boolean;
  /** Base drum row height */
  baseDrumRowHeight?: number;
  /** Drum height scale factor */
  drumHeightScaleFactor?: number;
}

/**
 * Callbacks for drum grid rendering
 */
export interface DrumGridRenderCallbacks {
  /** Coordinate utilities */
  coords: CoordinateUtils;
  /** Get macrobeat info by index */
  getMacrobeatInfo?: (index: number) => MacrobeatInfo | null;
  /** Get anacrusis colors from CSS */
  getAnacrusisColors?: () => { stroke: string; background: string };
  /** Get animation scale for drum hit */
  getAnimationScale?: (columnIndex: number, drumTrack: string) => number;
  /** Render modulation markers (optional) */
  renderModulationMarkers?: (
    ctx: CanvasRenderingContext2D,
    options: DrumGridRenderOptions
  ) => void;
}

/**
 * Range for light/dark segments
 */
interface Range {
  start: number;
  end: number;
}

/**
 * Segment with light/dark styling
 */
interface Segment {
  from: number;
  to: number;
  light: boolean;
}

/**
 * Merge overlapping ranges
 */
function mergeRanges(ranges: Range[]): Range[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const r of sorted) {
    if (merged.length === 0) {
      merged.push({ ...r });
      continue;
    }
    const last = merged[merged.length - 1]!;
    if (r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

/**
 * Build segments from light ranges
 */
function buildSegments(startX: number, endX: number, lightRanges: Range[]): Segment[] {
  const points = new Set<number>([startX, endX]);
  lightRanges.forEach(r => {
    const clampedStart = Math.max(startX, Math.min(endX, r.start));
    const clampedEnd = Math.max(startX, Math.min(endX, r.end));
    if (clampedEnd > clampedStart) {
      points.add(clampedStart);
      points.add(clampedEnd);
    }
  });

  const sortedPoints = Array.from(points).sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const from = sortedPoints[i]!;
    const to = sortedPoints[i + 1]!;
    const mid = (from + to) / 2;
    const light = lightRanges.some(r => mid >= r.start && mid < r.end);
    if (to > from) {
      segments.push({ from, to, light });
    }
  }

  return segments;
}

/**
 * Check if column is within a tonic sign span
 */
function isTonicColumn(columnIndex: number, tonicSigns: TonicSign[]): boolean {
  return tonicSigns.some(ts =>
    columnIndex === ts.columnIndex || columnIndex === ts.columnIndex + 1
  );
}

/**
 * Check if vertical line should be drawn at column
 */
function shouldDrawVerticalLine(columnIndex: number, tonicSigns: TonicSign[]): boolean {
  // Don't draw inside tonic sign (column+1)
  return !tonicSigns.some(ts => columnIndex === ts.columnIndex + 1);
}

/**
 * Draw a drum shape (triangle, diamond, or pentagon)
 */
export function drawDrumShape(
  ctx: CanvasRenderingContext2D,
  drumRow: number,
  x: number,
  y: number,
  width: number,
  height: number,
  scale = 1.0
): void {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const size = Math.min(width, height) * 0.4 * scale;
  ctx.beginPath();

  if (drumRow === 0) {
    // Triangle for H (high)
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx - size, cy + size);
    ctx.lineTo(cx + size, cy + size);
    ctx.closePath();
  } else if (drumRow === 1) {
    // Diamond for M (mid)
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size, cy);
    ctx.closePath();
  } else {
    // Pentagon for L (low)
    const sides = 5;
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI / sides) * i - Math.PI / 2;
      const sx = cx + size * Math.cos(angle);
      const sy = cy + size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(sx, sy);
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.closePath();
  }
  ctx.fill();
}

/**
 * Create drum grid renderer with injected callbacks
 */
export function createDrumGridRenderer(callbacks: DrumGridRenderCallbacks) {
  const { coords } = callbacks;

  const DEFAULT_ANACRUSIS_COLORS = {
    stroke: '#c7cfd8',
    background: 'rgba(207, 214, 222, 0.32)'
  };

  /**
   * Build light ranges for anacrusis and tonic columns
   */
  function buildLightRanges(
    options: DrumGridRenderOptions,
    anacrusisEndColumn: number | null
  ): Range[] {
    const ranges: Range[] = [];

    // Anacrusis range
    if (anacrusisEndColumn !== null && anacrusisEndColumn > 0) {
      ranges.push({
        start: coords.getColumnX(0, options),
        end: coords.getColumnX(anacrusisEndColumn, options)
      });
    }

    // Tonic sign ranges
    options.placedTonicSigns.forEach(ts => {
      const start = coords.getColumnX(ts.columnIndex, options);
      const end = coords.getColumnX(ts.columnIndex + 2, options);
      ranges.push({ start, end });
    });

    return mergeRanges(ranges);
  }

  /**
   * Get anacrusis end column from macrobeat info
   */
  function getAnacrusisEndColumn(options: DrumGridRenderOptions): number | null {
    if (!options.hasAnacrusis || !callbacks.getMacrobeatInfo) return null;

    const solidBoundaryIndex = options.macrobeatBoundaryStyles.findIndex(
      style => style === 'solid'
    );
    if (solidBoundaryIndex < 0) return null;

    const mbInfo = callbacks.getMacrobeatInfo(solidBoundaryIndex);
    if (!mbInfo) return null;

    return mbInfo.endColumn + 1;
  }

  /**
   * Draw vertical grid lines
   */
  function drawVerticalLines(
    ctx: CanvasRenderingContext2D,
    options: DrumGridRenderOptions,
    canvasHeight: number
  ): void {
    const {
      columnWidths,
      musicalColumnWidths,
      macrobeatGroupings,
      macrobeatBoundaryStyles,
      placedTonicSigns
    } = options;

    const musicalColumns = (musicalColumnWidths && musicalColumnWidths.length > 0)
      ? musicalColumnWidths
      : columnWidths;
    const totalColumns = musicalColumns.length;

    // Build macrobeat boundary positions
    const macrobeatBoundaries: number[] = [];
    for (let i = 0; i < macrobeatGroupings.length; i++) {
      const mbInfo = callbacks.getMacrobeatInfo?.(i);
      if (mbInfo) {
        macrobeatBoundaries.push(mbInfo.endColumn + 1);
      }
    }

    const anacrusisColors = callbacks.getAnacrusisColors?.() ?? DEFAULT_ANACRUSIS_COLORS;

    for (let canvasCol = 0; canvasCol <= totalColumns; canvasCol++) {
      const isGridStartOrEnd = canvasCol === 0 || canvasCol === totalColumns;
      const isTonicColumnStart = isTonicColumn(canvasCol, placedTonicSigns);
      const isTonicColumnEnd = placedTonicSigns.some(ts => canvasCol === ts.columnIndex + 2);
      const isMacrobeatEnd = macrobeatBoundaries.includes(canvasCol);
      const shouldDraw = shouldDrawVerticalLine(canvasCol, placedTonicSigns);

      if (!shouldDraw) continue;

      let style: { lineWidth: number; strokeStyle: string; dash: number[] } | null = null;
      if (isGridStartOrEnd || isTonicColumnStart || isTonicColumnEnd) {
        style = { lineWidth: 2, strokeStyle: '#adb5bd', dash: [] };
      } else if (isMacrobeatEnd) {
        const mbIndex = macrobeatBoundaries.indexOf(canvasCol);
        const boundaryStyle = macrobeatBoundaryStyles[mbIndex];
        if (boundaryStyle === 'anacrusis') {
          style = { lineWidth: 1, strokeStyle: anacrusisColors.stroke, dash: [4, 4] };
        } else {
          style = {
            lineWidth: 1,
            strokeStyle: '#adb5bd',
            dash: boundaryStyle === 'solid' ? [] : [5, 5]
          };
        }
      }

      if (!style) continue;

      const x = coords.getColumnX(canvasCol, options);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.lineWidth = style.lineWidth;
      ctx.strokeStyle = style.strokeStyle;
      ctx.setLineDash(style.dash);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  /**
   * Draw horizontal grid lines
   */
  function drawHorizontalLines(
    ctx: CanvasRenderingContext2D,
    options: DrumGridRenderOptions,
    drumRowHeight: number,
    canvasWidth: number
  ): void {
    const anacrusisEndColumn = getAnacrusisEndColumn(options);
    const lightRanges = buildLightRanges(options, anacrusisEndColumn);
    const segments = buildSegments(0, canvasWidth, lightRanges);
    const anacrusisColors = callbacks.getAnacrusisColors?.() ?? DEFAULT_ANACRUSIS_COLORS;

    // Draw 4 horizontal lines (top/bottom of 3 rows)
    for (let i = 0; i < 4; i++) {
      const y = i * drumRowHeight;
      segments.forEach(seg => {
        if (seg.to <= seg.from) return;
        ctx.beginPath();
        ctx.moveTo(seg.from, y);
        ctx.lineTo(seg.to, y);
        ctx.strokeStyle = seg.light ? anacrusisColors.stroke : '#ced4da';
        ctx.lineWidth = 1;
        ctx.globalAlpha = seg.light ? 0.6 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }
  }

  /**
   * Draw drum notes
   */
  function drawDrumNotes(
    ctx: CanvasRenderingContext2D,
    options: DrumGridRenderOptions,
    drumRowHeight: number
  ): void {
    const { placedNotes, columnWidths, cellWidth, placedTonicSigns, tempoModulationMarkers } = options;
    const totalColumns = columnWidths.length + 4; // +4 for legend columns

    for (let canvasCol = 0; canvasCol < totalColumns; canvasCol++) {
      // Skip tonic span columns
      if (isTonicColumn(canvasCol, placedTonicSigns)) continue;

      const x = coords.getColumnX(canvasCol, options);
      let currentCellWidth: number;

      if (tempoModulationMarkers && tempoModulationMarkers.length > 0) {
        const nextX = coords.getColumnX(canvasCol + 1, options);
        currentCellWidth = nextX - x;
      } else {
        const widthMultiplier = columnWidths[canvasCol] ?? 0;
        currentCellWidth = widthMultiplier * cellWidth;
      }

      for (let row = 0; row < 3; row++) {
        const y = row * drumRowHeight;
        const drumTrack = DRUM_TRACKS[row]!;

        // Find drum hit at this position
        const drumHit = placedNotes.find(note =>
          note.isDrum &&
          (typeof note.drumTrack === 'number' ? String(note.drumTrack) : note.drumTrack) === drumTrack &&
          note.startColumnIndex === canvasCol
        );

        if (drumHit) {
          ctx.fillStyle = drumHit.color;
          const animationScale = callbacks.getAnimationScale?.(canvasCol, drumTrack) ?? 1.0;
          drawDrumShape(ctx, row, x, y, currentCellWidth, drumRowHeight, animationScale);
        } else {
          // Draw empty cell dot
          ctx.fillStyle = '#ced4da';
          ctx.beginPath();
          ctx.arc(x + currentCellWidth / 2, y + drumRowHeight / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  return {
    drawVerticalLines,
    drawHorizontalLines,
    drawDrumNotes,
    drawDrumShape,
    buildLightRanges,
    getAnacrusisEndColumn
  };
}

export type DrumGridRenderer = ReturnType<typeof createDrumGridRenderer>;

/**
 * Render the drum grid to a canvas context
 *
 * Main entry point for drum grid rendering.
 */
export function renderDrumGrid(
  ctx: CanvasRenderingContext2D,
  options: DrumGridRenderOptions,
  callbacks: DrumGridRenderCallbacks
): void {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Calculate drum row height
  const baseDrumRowHeight = options.baseDrumRowHeight ?? 30;
  const drumHeightScaleFactor = options.drumHeightScaleFactor ?? 1.5;
  const drumRowHeight = Math.max(baseDrumRowHeight, drumHeightScaleFactor * options.cellHeight);

  // Create renderer
  const renderer = createDrumGridRenderer(callbacks);

  // Draw layers
  renderer.drawHorizontalLines(ctx, options, drumRowHeight, canvasWidth);
  renderer.drawVerticalLines(ctx, options, canvasHeight);
  renderer.drawDrumNotes(ctx, options, drumRowHeight);

  // Render modulation markers if callback provided
  if (callbacks.renderModulationMarkers && options.tempoModulationMarkers?.length) {
    callbacks.renderModulationMarkers(ctx, options);
  }
}
