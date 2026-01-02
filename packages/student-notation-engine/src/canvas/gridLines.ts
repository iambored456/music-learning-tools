/**
 * Grid Lines Renderer
 *
 * Framework-agnostic grid line rendering for the pitch grid.
 * All dependencies are injected via callbacks - no store or service imports.
 */

import type { MacrobeatGrouping, PitchRowData, TonicSign } from '@mlt/types';
import type { CoordinateUtils, CoordinateOptions } from './coordinateUtils.js';

/**
 * Macrobeat info for a specific beat
 */
export interface MacrobeatInfo {
  startColumn: number;
  endColumn: number;
  grouping: 2 | 3;
}

/**
 * Options for grid line rendering
 */
export interface GridLineRenderOptions extends CoordinateOptions {
  /** Full row data for pitch classes */
  fullRowData: PitchRowData[];
  /** Macrobeat groupings */
  macrobeatGroupings: MacrobeatGrouping[];
  /** Macrobeat boundary styles */
  macrobeatBoundaryStyles: string[];
  /** Whether piece has anacrusis (pickup measure) */
  hasAnacrusis: boolean;
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
}

/**
 * Callbacks for grid line rendering
 */
export interface GridLineRenderCallbacks {
  /** Coordinate utilities */
  coords: CoordinateUtils;
  /** Get macrobeat info by index */
  getMacrobeatInfo?: (index: number) => MacrobeatInfo | null;
  /** Get placed tonic signs */
  getPlacedTonicSigns?: () => TonicSign[];
  /** Get tonic span column indices */
  getTonicSpanColumnIndices?: (tonicSigns: TonicSign[]) => Set<number>;
  /** Get anacrusis background colors from CSS */
  getAnacrusisColors?: () => { background: string; border: string };
}

/**
 * Create grid line renderer with injected callbacks
 */
export function createGridLineRenderer(callbacks: GridLineRenderCallbacks) {
  const { coords } = callbacks;

  /**
   * Draw horizontal grid lines
   */
  function drawHorizontalLines(
    ctx: CanvasRenderingContext2D,
    options: GridLineRenderOptions
  ): void {
    const { fullRowData, canvasWidth, cellHeight } = options;
    const { startRow, endRow } = coords.getVisibleRowRange();

    for (let i = startRow; i <= endRow; i++) {
      const row = fullRowData[i];
      if (!row) continue;

      const y = coords.getRowY(i, options);
      const pc = coords.getPitchClass(row.toneNote);
      const style = coords.getLineStyleFromPitchClass(pc);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth;
      ctx.setLineDash(style.dash);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw filled rectangle for G lines
      if (pc === 'G') {
        const halfUnit = cellHeight / 2;
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, y - halfUnit, canvasWidth, halfUnit);
      }
    }
  }

  /**
   * Draw vertical grid lines (beat lines)
   */
  function drawVerticalLines(
    ctx: CanvasRenderingContext2D,
    options: GridLineRenderOptions
  ): void {
    const {
      columnWidths,
      macrobeatBoundaryStyles,
      hasAnacrusis,
      canvasHeight
    } = options;

    const placedTonicSigns = callbacks.getPlacedTonicSigns?.() ?? [];
    const tonicSpanColumns = callbacks.getTonicSpanColumnIndices?.(placedTonicSigns) ?? new Set();
    const anacrusisColors = callbacks.getAnacrusisColors?.() ?? {
      background: 'rgba(173, 181, 189, 0.15)',
      border: 'rgba(173, 181, 189, 0.3)'
    };

    // Track anacrusis region
    let inAnacrusis = hasAnacrusis;
    let anacrusisStartX = 0;
    let macrobeatIndex = 0;

    // Draw beat lines
    let x = 0;
    for (let i = 0; i <= columnWidths.length; i++) {
      const lineX = coords.getColumnX(i, options);

      // Check if this is a macrobeat boundary
      const macrobeatInfo = callbacks.getMacrobeatInfo?.(macrobeatIndex);
      const isMacrobeatBoundary = macrobeatInfo && macrobeatInfo.startColumn === i;

      if (isMacrobeatBoundary) {
        const boundaryStyle = macrobeatBoundaryStyles[macrobeatIndex] ?? 'solid';

        // Draw anacrusis background
        if (inAnacrusis && boundaryStyle === 'solid') {
          ctx.fillStyle = anacrusisColors.background;
          ctx.fillRect(anacrusisStartX, 0, lineX - anacrusisStartX, canvasHeight);
          inAnacrusis = false;
        }

        // Draw boundary line
        ctx.beginPath();
        ctx.moveTo(lineX, 0);
        ctx.lineTo(lineX, canvasHeight);

        if (boundaryStyle === 'anacrusis') {
          ctx.strokeStyle = anacrusisColors.border;
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
        } else if (boundaryStyle === 'dashed') {
          ctx.strokeStyle = '#adb5bd';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = '#adb5bd';
          ctx.setLineDash([]);
          ctx.lineWidth = 2;
        }

        ctx.stroke();
        ctx.setLineDash([]);

        macrobeatIndex++;
      } else if (i > 0 && !tonicSpanColumns.has(i - 1)) {
        // Regular beat line (not at macrobeat boundary, not in tonic column)
        ctx.beginPath();
        ctx.moveTo(lineX, 0);
        ctx.lineTo(lineX, canvasHeight);
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw tonic column highlighting
      if (tonicSpanColumns.has(i)) {
        const colWidth = (columnWidths[i] ?? 1) * options.cellWidth;
        ctx.fillStyle = 'rgba(255, 193, 7, 0.1)';
        ctx.fillRect(lineX, 0, colWidth, canvasHeight);
      }

      x = lineX;
    }
  }

  return {
    drawHorizontalLines,
    drawVerticalLines
  };
}

export type GridLineRenderer = ReturnType<typeof createGridLineRenderer>;
