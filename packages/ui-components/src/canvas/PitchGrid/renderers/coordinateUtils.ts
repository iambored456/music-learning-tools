/**
 * Coordinate Utilities
 *
 * Pure functions for converting between pitch/time and canvas coordinates.
 * All dependencies are passed explicitly as parameters - no global store access.
 */

import type { PitchRowData, ModulationMarker } from '@mlt/types';
import type { CoordinateUtils, PitchGridViewport, LineStyle } from '../types.js';

// ============================================================================
// Configuration Types
// ============================================================================

export interface CoordinateConfig {
  /** Base cell width in pixels */
  cellWidth: number;
  /** Base cell height in pixels */
  cellHeight: number;
  /** Width multipliers for each canvas-space column */
  columnWidths: number[];
  /** Current viewport configuration */
  viewport: PitchGridViewport;
  /** Modulation markers (optional, for notation mode) */
  tempoModulationMarkers?: ModulationMarker[];
  /** Base microbeat pixel width (optional) */
  baseMicrobeatPx?: number;
}

export interface TimeBasedCoordinateConfig {
  /** Base cell width in pixels */
  cellWidth: number;
  /** Base cell height in pixels */
  cellHeight: number;
  /** Current viewport configuration */
  viewport: PitchGridViewport;
  /** Scroll speed in pixels per second */
  pixelsPerSecond: number;
  /** X position of the "now line" (for highway mode) */
  nowLineX?: number;
  /** Current time in ms (for highway mode) */
  currentTimeMs?: number;
  /** Optional per-row vertical offsets, measured in equal-tempered semitone steps. */
  rowPositionOffsets?: readonly number[];
}

// ============================================================================
// Coordinate Factory Functions
// ============================================================================

/**
 * Create coordinate utilities for column-based layout (notation/playback modes).
 */
export function createColumnCoordinates(config: CoordinateConfig): CoordinateUtils {
  const { cellHeight, columnWidths, viewport } = config;
  const halfUnit = cellHeight / 2;

  // Build cumulative column positions for fast lookup
  const columnPositions = buildColumnPositions(columnWidths, config.cellWidth);

  return {
    getRowY(rowIndex: number): number {
      const relativeRowIndex = rowIndex - viewport.startRow;
      // Row centers are at half-cell intervals, offset by half a cell
      return (relativeRowIndex + 1) * halfUnit;
    },

    getRowFromY(canvasY: number): number {
      const relativeRowIndex = (canvasY / halfUnit) - 1;
      return Math.round(relativeRowIndex) + viewport.startRow;
    },

    getColumnX(columnIndex: number): number {
      if (columnIndex < 0) return 0;
      if (columnIndex >= columnPositions.length) {
        return columnPositions[columnPositions.length - 1] ?? 0;
      }
      return columnPositions[columnIndex] ?? 0;
    },

    getColumnFromX(canvasX: number): number {
      // Binary search for the column
      let left = 0;
      let right = columnPositions.length - 1;

      while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if ((columnPositions[mid] ?? 0) <= canvasX) {
          left = mid + 1;
        } else {
          right = mid;
        }
      }

      return Math.max(0, left - 1);
    },
  };
}

/**
 * Create coordinate utilities for time-based layout (singing/highway modes).
 */
export function createTimeCoordinates(config: TimeBasedCoordinateConfig): CoordinateUtils {
  const {
    cellHeight,
    viewport,
    pixelsPerSecond,
    nowLineX = 100,
    currentTimeMs = 0,
    rowPositionOffsets,
  } = config;
  const halfUnit = cellHeight / 2;

  function getOffsetAt(rowIndex: number): number {
    if (!rowPositionOffsets || rowPositionOffsets.length === 0) return 0;
    const clampedIndex = Math.min(rowPositionOffsets.length - 1, Math.max(0, rowIndex));
    const lowerIndex = Math.floor(clampedIndex);
    const upperIndex = Math.min(rowPositionOffsets.length - 1, lowerIndex + 1);
    const fraction = clampedIndex - lowerIndex;
    const lowerOffset = rowPositionOffsets[lowerIndex] ?? 0;
    const upperOffset = rowPositionOffsets[upperIndex] ?? lowerOffset;
    return lowerOffset + ((upperOffset - lowerOffset) * fraction);
  }

  function getPositionedRow(rowIndex: number): number {
    return rowIndex + getOffsetAt(rowIndex);
  }

  return {
    getRowY(rowIndex: number): number {
      const relativeRowIndex = getPositionedRow(rowIndex) - viewport.startRow;
      // Row centers are at half-cell intervals, offset by half a cell
      return (relativeRowIndex + 1) * halfUnit;
    },

    getRowFromY(canvasY: number): number {
      const targetPosition = ((canvasY / halfUnit) - 1) + viewport.startRow;
      if (!rowPositionOffsets || rowPositionOffsets.length === 0) {
        return Math.round(targetPosition);
      }

      let low = 0;
      let high = rowPositionOffsets.length - 1;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (getPositionedRow(mid) < targetPosition) low = mid + 1;
        else high = mid;
      }

      const upperIndex = low;
      const lowerIndex = Math.max(0, upperIndex - 1);
      const lowerPosition = getPositionedRow(lowerIndex);
      const upperPosition = getPositionedRow(upperIndex);
      if (upperPosition <= lowerPosition) return lowerIndex;
      const fraction = (targetPosition - lowerPosition) / (upperPosition - lowerPosition);
      return lowerIndex + Math.min(1, Math.max(0, fraction));
    },

    getColumnX(_columnIndex: number): number {
      // Not used in time-based modes
      return 0;
    },

    getColumnFromX(_canvasX: number): number {
      // Not used in time-based modes
      return 0;
    },

    getTimeX(timeMs: number): number {
      // In highway mode: notes flow right-to-left toward nowLineX
      // At currentTimeMs, the position is nowLineX
      const timeDelta = timeMs - currentTimeMs;
      return nowLineX + (timeDelta / 1000) * pixelsPerSecond;
    },

    getTimeFromX(canvasX: number): number {
      const timeDelta = ((canvasX - nowLineX) / pixelsPerSecond) * 1000;
      return currentTimeMs + timeDelta;
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build cumulative column X positions from column widths.
 */
function buildColumnPositions(columnWidths: number[], cellWidth: number): number[] {
  const positions: number[] = [0];
  let x = 0;

  for (let i = 0; i < columnWidths.length; i++) {
    const width = (columnWidths[i] ?? 1) * cellWidth;
    x += width;
    positions.push(x);
  }

  return positions;
}

/**
 * Get visible row range with padding for smooth edge behavior.
 */
export function getVisibleRowRangeWithPadding(
  viewport: PitchGridViewport,
  fullRowData: PitchRowData[]
): { startRow: number; endRow: number; paddedStartRow: number; paddedEndRow: number } {
  const { startRow, endRow } = viewport;
  const maxRowIndex = Math.max(0, fullRowData.length - 1);

  return {
    startRow,
    endRow,
    paddedStartRow: Math.max(0, startRow - 1),
    paddedEndRow: Math.min(maxRowIndex, endRow + 1),
  };
}

/**
 * Check if a row is visible (within viewport plus padding).
 */
export function isRowVisible(
  globalRow: number,
  viewport: PitchGridViewport,
  cellHeight: number,
  coords: CoordinateUtils
): boolean {
  const y = coords.getRowY(globalRow);
  const padding = cellHeight;
  return y >= -padding && y <= (viewport.containerHeight + padding);
}

// ============================================================================
// Line Style Utilities
// ============================================================================

/**
 * Get pitch class from a pitch string (e.g., "C4" -> "C", "B♭/A♯4" -> "B♭/A♯").
 */
export function getPitchClass(pitchWithOctave: string): string {
  let pc = (pitchWithOctave || '').replace(/\d/g, '').trim();
  pc = pc.replace(/b/g, 'b-').replace(/#/g, 'b_');
  return pc;
}

/**
 * Get line style for a pitch class.
 * Used for horizontal grid lines.
 */
const REFERENCE_CELL_HEIGHT = 12;
const BASE_DEFAULT_LINE_WIDTH = 1;
const BASE_E_LINE_WIDTH = 1;
const BASE_DASH_LENGTH = 5;
const BASE_C_LINE_WIDTH = 3.33;
const G_ROW_FILL_ALPHA = 0.28;

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

export function getLineStyleFromPitchClass(
  pitchClass: string,
  cellHeight: number = REFERENCE_CELL_HEIGHT
): LineStyle {
  const defaultLineWidth = scaleLineMetric(cellHeight, BASE_DEFAULT_LINE_WIDTH, 0.75, 1.6);
  const cLineWidth = scaleLineMetric(cellHeight, BASE_C_LINE_WIDTH, 2.4, 4.2);
  const eLineWidth = scaleLineMetric(cellHeight, BASE_E_LINE_WIDTH, 0.75, 1.35);
  const dashUnit = scaleLineMetric(cellHeight, BASE_DASH_LENGTH, 3.5, 8);

  switch (pitchClass) {
    case 'C':
      return { lineWidth: cLineWidth, dash: [], color: '#adb5bd' };
    case 'E':
      return { lineWidth: eLineWidth, dash: [dashUnit, dashUnit], color: '#adb5bd' };
    case 'G':
      return { lineWidth: defaultLineWidth, dash: [], color: `rgba(173, 181, 189, ${G_ROW_FILL_ALPHA})` };
    case 'B':
    case 'A':
    case 'F':
    case 'Eb/Db':
    case 'Db/C#':
      return { lineWidth: defaultLineWidth, dash: [], color: '#ced4da' };
    default:
      return { lineWidth: defaultLineWidth, dash: [], color: '#ced4da' };
  }
}

// ============================================================================
// MIDI Conversion Utilities
// ============================================================================

/**
 * Convert MIDI note number to row index in fullRowData.
 * fullRowData is ordered C8 (index 0) to A0 (index 87).
 */
export function midiToRowIndex(midi: number, fullRowData: PitchRowData[]): number {
  // MIDI 108 = C8 (index 0), MIDI 21 = A0 (index 87)
  // Each semitone down increases the index by 1
  const c8Midi = 108;
  const rowIndex = c8Midi - Math.round(midi);

  if (rowIndex < 0 || rowIndex >= fullRowData.length) {
    return -1;
  }

  return rowIndex;
}

/**
 * Convert row index to MIDI note number.
 */
export function rowIndexToMidi(rowIndex: number, fullRowData: PitchRowData[]): number {
  if (rowIndex < 0 || rowIndex >= fullRowData.length) {
    return -1;
  }

  // MIDI 108 = C8 (index 0)
  const c8Midi = 108;
  return c8Midi - rowIndex;
}

/**
 * Convert frequency to MIDI note number.
 */
export function frequencyToMidi(frequency: number): number {
  return 12 * Math.log2(frequency / 440) + 69;
}

/**
 * Convert MIDI note number to frequency.
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
