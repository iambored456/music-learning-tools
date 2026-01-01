/**
 * @mlt/pitch-viewport
 *
 * Shared viewport math utilities for pitch grids.
 * Pure functions only - no DOM dependencies.
 */

import type { PitchRowData } from '@mlt/types';

// ============================================================================
// Core Types
// ============================================================================

export interface PitchRange {
  topIndex: number;
  bottomIndex: number;
}

export type ZoomDirection = 'in' | 'out';

export interface ViewportMathOptions {
  totalRanks: number;
  minSpan?: number;
  zoomStep?: number;
}

export interface ZoomToFitOptions {
  baseUnit: number;
  paddingRows?: number;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_MIN_VIEWPORT_ROWS = 9;
export const DEFAULT_ZOOM_STEP_ROWS = 2;
export const MAX_ADAPTIVE_ZOOM_STEP_ROWS = 5;

// ============================================================================
// Helpers
// ============================================================================

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeBaseUnit(baseUnit: number): number {
  if (!Number.isFinite(baseUnit)) {
    return 1;
  }
  return Math.max(1, baseUnit);
}

// ============================================================================
// Range Math
// ============================================================================

/**
 * Returns a simple, ratio-based zoom step so wide ranges zoom faster and tight ranges zoom slower.
 */
export function getAdaptiveZoomStep(
  span: number,
  totalRanks: number,
  { maxStep = MAX_ADAPTIVE_ZOOM_STEP_ROWS }: { maxStep?: number } = {}
): number {
  const normalizedTotal = Math.max(1, Math.round(totalRanks));
  const normalizedSpan = Math.max(1, Math.round(span));
  const ratio = normalizedSpan / normalizedTotal;

  let step = 1;
  if (ratio >= 0.85) {
    step = 5;
  } else if (ratio >= 0.65) {
    step = 4;
  } else if (ratio >= 0.45) {
    step = 3;
  } else if (ratio >= 0.25) {
    step = 2;
  } else {
    step = 1;
  }

  const normalizedMax = Math.max(1, Math.round(maxStep));
  return Math.max(1, Math.min(normalizedMax, step));
}

function rangeFromCenter(center: number, span: number, totalRanks: number): PitchRange {
  const maxIndex = Math.max(0, totalRanks - 1);
  const normalizedSpan = Math.max(1, Math.round(span));
  const half = (normalizedSpan - 1) / 2;
  let topIndex = Math.round(center - half);
  let bottomIndex = topIndex + normalizedSpan - 1;

  if (topIndex < 0) {
    bottomIndex += -topIndex;
    topIndex = 0;
  }
  if (bottomIndex > maxIndex) {
    const overshoot = bottomIndex - maxIndex;
    topIndex -= overshoot;
    bottomIndex = maxIndex;
  }
  topIndex = clampInt(topIndex, 0, maxIndex);
  bottomIndex = clampInt(bottomIndex, topIndex, maxIndex);
  return { topIndex, bottomIndex };
}

export function getSpan(range: PitchRange): number {
  return (range.bottomIndex - range.topIndex) + 1;
}

export function clampToGamut(range: Partial<PitchRange>, totalRanks: number): PitchRange {
  const maxIndex = Math.max(0, totalRanks - 1);
  const topIndex = clampInt(range.topIndex ?? 0, 0, maxIndex);
  const bottomIndex = clampInt(range.bottomIndex ?? maxIndex, 0, maxIndex);
  if (bottomIndex < topIndex) {
    return { topIndex: bottomIndex, bottomIndex: topIndex };
  }
  return { topIndex, bottomIndex };
}

/**
 * Ensures the range is valid and has at least `minSpan` rows by expanding around its center.
 */
export function normalizeRange(
  range: Partial<PitchRange>,
  totalRanks: number,
  minSpan: number = DEFAULT_MIN_VIEWPORT_ROWS
): PitchRange {
  const clamped = clampToGamut(range, totalRanks);
  const normalizedMinSpan = Math.max(1, Math.round(minSpan));
  const span = getSpan(clamped);
  if (span >= normalizedMinSpan) {
    return clamped;
  }

  const center = (clamped.topIndex + clamped.bottomIndex) / 2;
  return rangeFromCenter(center, normalizedMinSpan, totalRanks);
}

export function getNormalizedRange(
  range: PitchRange | undefined,
  totalRanks: number,
  minSpan: number = DEFAULT_MIN_VIEWPORT_ROWS
): PitchRange {
  const maxIndex = Math.max(0, totalRanks - 1);
  const current = range || { topIndex: 0, bottomIndex: maxIndex };
  return normalizeRange(current, totalRanks, minSpan);
}

/**
 * Sets the top endpoint while keeping the bottom fixed (wheel semantics).
 */
export function setTopEndpoint(
  current: PitchRange,
  requestedTop: number,
  totalRanks: number,
  minSpan: number = DEFAULT_MIN_VIEWPORT_ROWS
): PitchRange {
  const maxIndex = Math.max(0, totalRanks - 1);
  const bottomIndex = clampInt(current.bottomIndex, 0, maxIndex);
  const normalizedMinSpan = Math.max(1, Math.round(minSpan));
  const maxTop = Math.max(0, bottomIndex - (normalizedMinSpan - 1));
  const topIndex = clampInt(requestedTop, 0, maxTop);
  return { topIndex, bottomIndex };
}

/**
 * Sets the bottom endpoint while keeping the top fixed (wheel semantics).
 */
export function setBottomEndpoint(
  current: PitchRange,
  requestedBottom: number,
  totalRanks: number,
  minSpan: number = DEFAULT_MIN_VIEWPORT_ROWS
): PitchRange {
  const maxIndex = Math.max(0, totalRanks - 1);
  const topIndex = clampInt(current.topIndex, 0, maxIndex);
  const normalizedMinSpan = Math.max(1, Math.round(minSpan));
  const minBottom = Math.min(maxIndex, topIndex + (normalizedMinSpan - 1));
  const bottomIndex = clampInt(requestedBottom, minBottom, maxIndex);
  return { topIndex, bottomIndex };
}

/**
 * Computes the constrained top index without mutating state.
 */
export function computeConstrainedTopIndex(
  currentBottomIndex: number,
  requestedTop: number,
  totalRanks: number,
  minSpan: number = DEFAULT_MIN_VIEWPORT_ROWS
): number {
  const maxIndex = Math.max(0, totalRanks - 1);
  const bottomIndex = clampInt(currentBottomIndex, 0, maxIndex);
  const normalizedMinSpan = Math.max(1, Math.round(minSpan));
  const maxTop = Math.max(0, bottomIndex - (normalizedMinSpan - 1));
  return clampInt(requestedTop, 0, maxTop);
}

/**
 * Computes the constrained bottom index without mutating state.
 */
export function computeConstrainedBottomIndex(
  currentTopIndex: number,
  requestedBottom: number,
  totalRanks: number,
  minSpan: number = DEFAULT_MIN_VIEWPORT_ROWS
): number {
  const maxIndex = Math.max(0, totalRanks - 1);
  const topIndex = clampInt(currentTopIndex, 0, maxIndex);
  const normalizedMinSpan = Math.max(1, Math.round(minSpan));
  const minBottom = Math.min(maxIndex, topIndex + (normalizedMinSpan - 1));
  return clampInt(requestedBottom, minBottom, maxIndex);
}

/**
 * Pans the viewport range by `deltaRows`, keeping its span constant.
 */
export function shiftRangeBy(
  current: PitchRange,
  deltaRows: number,
  totalRanks: number
): PitchRange {
  const maxIndex = Math.max(0, totalRanks - 1);
  const span = Math.max(1, getSpan(current));
  const maxTop = Math.max(0, (maxIndex + 1) - span);

  const nextTop = clampInt(current.topIndex + deltaRows, 0, maxTop);
  const nextBottom = Math.min(maxIndex, nextTop + span - 1);
  return { topIndex: nextTop, bottomIndex: nextBottom };
}

/**
 * Zooms the range in/out by moving both endpoints.
 */
export function zoomRange(
  current: PitchRange,
  direction: ZoomDirection,
  { totalRanks, minSpan = DEFAULT_MIN_VIEWPORT_ROWS, zoomStep = DEFAULT_ZOOM_STEP_ROWS }: ViewportMathOptions
): PitchRange {
  const maxIndex = Math.max(0, totalRanks - 1);
  const normalizedMinSpan = Math.max(1, Math.round(minSpan));
  const step = Math.max(0, Math.round(zoomStep));
  const clamped = clampToGamut(current, totalRanks);

  if (step === 0) {
    return normalizeRange(clamped, totalRanks, normalizedMinSpan);
  }

  const span = getSpan(clamped);

  if (direction === 'in') {
    if (span <= normalizedMinSpan) {
      return normalizeRange(clamped, totalRanks, normalizedMinSpan);
    }

    const targetSpan = Math.max(normalizedMinSpan, span - (2 * step));
    const center = (clamped.topIndex + clamped.bottomIndex) / 2;
    return rangeFromCenter(center, targetSpan, totalRanks);
  }

  const expandedTop = clamped.topIndex - step;
  const expandedBottom = clamped.bottomIndex + step;

  const topIndex = clampInt(expandedTop, 0, maxIndex);
  const bottomIndex = clampInt(expandedBottom, 0, maxIndex);

  return normalizeRange({ topIndex, bottomIndex }, totalRanks, normalizedMinSpan);
}

// ============================================================================
// Viewport Fit/Interpolation
// ============================================================================

/**
 * Calculate the zoom level needed to fit a given number of rows in a container.
 */
export function calculateZoomToFitRowCount(
  containerHeight: number,
  rowCount: number,
  { baseUnit, paddingRows = 1 }: ZoomToFitOptions
): number {
  if (!containerHeight || containerHeight <= 0 || !rowCount || rowCount <= 0) {
    return 1.0;
  }

  const effectiveRows = Math.max(1, Math.round(rowCount) + Math.max(0, Math.round(paddingRows)));
  const normalizedBaseUnit = normalizeBaseUnit(baseUnit);
  return (2 * containerHeight) / (effectiveRows * normalizedBaseUnit);
}

/**
 * Calculate viewport bounds from a pitch range.
 */
export function calculateViewportBounds(
  pitchRange: PitchRange | undefined,
  totalRanks: number,
  cellHeight: number
): { startRank: number; endRank: number; scrollOffset: number } {
  const maxIndex = Math.max(0, totalRanks - 1);
  const halfUnit = cellHeight / 2;

  const normalized = normalizeRange(
    pitchRange || { topIndex: 0, bottomIndex: maxIndex },
    totalRanks,
    DEFAULT_MIN_VIEWPORT_ROWS
  );

  const startRank = Math.max(0, Math.min(maxIndex, normalized.topIndex ?? 0));
  const bottomIndex = Math.max(startRank, Math.min(maxIndex, normalized.bottomIndex ?? maxIndex));
  const endRank = Math.min(totalRanks, bottomIndex + 1);
  const scrollOffset = startRank * halfUnit;

  return { startRank, endRank, scrollOffset };
}

/**
 * Create an interpolated range for smooth animations.
 */
export function interpolateRange(
  startRange: PitchRange,
  targetRange: PitchRange,
  t: number,
  totalRanks: number
): PitchRange {
  const interpolatedTop = Math.round(
    startRange.topIndex + (targetRange.topIndex - startRange.topIndex) * t
  );
  const interpolatedBottom = Math.round(
    startRange.bottomIndex + (targetRange.bottomIndex - startRange.bottomIndex) * t
  );

  return normalizeRange(
    { topIndex: interpolatedTop, bottomIndex: interpolatedBottom },
    totalRanks,
    DEFAULT_MIN_VIEWPORT_ROWS
  );
}

/**
 * Cubic ease-in-out function for smooth animations.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============================================================================
// Viewport Windowing (cell-height-driven)
// ============================================================================

export interface ViewportWindow {
  startRow: number;
  endRow: number;
  cellHeight: number;
  visibleRows: number;
}

export interface ViewportWindowConfig {
  containerHeight: number;
  fullRowData: PitchRowData[];
  preferredCellHeight?: number;
  minCellHeight?: number;
  centerOnMidi?: number;
}

const DEFAULT_PREFERRED_CELL_HEIGHT = 40;
const DEFAULT_MIN_CELL_HEIGHT = 20;

/**
 * Calculate optimal viewport window that fills container height.
 */
export function calculateViewportWindow(config: ViewportWindowConfig): ViewportWindow {
  const {
    containerHeight,
    fullRowData,
    preferredCellHeight = DEFAULT_PREFERRED_CELL_HEIGHT,
    minCellHeight = DEFAULT_MIN_CELL_HEIGHT,
    centerOnMidi,
  } = config;

  const totalRows = fullRowData.length;

  if (totalRows === 0) {
    return { startRow: 0, endRow: 0, cellHeight: preferredCellHeight, visibleRows: 0 };
  }

  const normalizedMinCellHeight = Math.max(1, minCellHeight);
  const normalizedPreferredCellHeight = Math.max(normalizedMinCellHeight, preferredCellHeight);

  const maxVisibleRowsForCellHeight = (height: number): number => {
    if (containerHeight <= 0 || height <= 0) {
      return 0;
    }
    const halfUnit = height / 2;
    return Math.max(0, Math.floor(containerHeight / halfUnit) - 1);
  };

  const maxVisibleRowsAtPreferred = maxVisibleRowsForCellHeight(normalizedPreferredCellHeight);
  const maxVisibleRowsAtMinimum = maxVisibleRowsForCellHeight(normalizedMinCellHeight);

  if (totalRows <= maxVisibleRowsAtPreferred && maxVisibleRowsAtPreferred > 0) {
    const cellHeight = (2 * containerHeight) / (totalRows + 1);
    return {
      startRow: 0,
      endRow: totalRows - 1,
      cellHeight,
      visibleRows: totalRows,
    };
  }

  if (totalRows <= maxVisibleRowsAtMinimum && maxVisibleRowsAtMinimum > 0) {
    const cellHeight = (2 * containerHeight) / (totalRows + 1);
    return {
      startRow: 0,
      endRow: totalRows - 1,
      cellHeight,
      visibleRows: totalRows,
    };
  }

  const visibleRows = Math.max(1, maxVisibleRowsAtMinimum);
  let startRow = 0;
  let endRow = visibleRows - 1;

  if (centerOnMidi !== undefined && fullRowData[0]) {
    const firstRow = fullRowData[0];
    const maxMidi = firstRow.midi ?? 108;
    const centerRowIndex = maxMidi - Math.round(centerOnMidi);

    if (centerRowIndex >= 0 && centerRowIndex < totalRows) {
      const halfVisible = Math.floor(visibleRows / 2);
      startRow = Math.max(0, centerRowIndex - halfVisible);
      endRow = Math.min(totalRows - 1, startRow + visibleRows - 1);

      if (endRow === totalRows - 1) {
        startRow = Math.max(0, endRow - visibleRows + 1);
      }
    }
  }

  const cellHeight = (2 * containerHeight) / (visibleRows + 1);

  return {
    startRow,
    endRow,
    cellHeight,
    visibleRows,
  };
}

/**
 * Scroll viewport up by specified number of rows.
 */
export function scrollViewportUp(
  currentWindow: ViewportWindow,
  totalRows: number,
  scrollRows: number = 1
): ViewportWindow {
  const newStartRow = Math.max(0, currentWindow.startRow - scrollRows);
  const newEndRow = newStartRow + currentWindow.visibleRows - 1;

  return {
    ...currentWindow,
    startRow: newStartRow,
    endRow: newEndRow,
  };
}

/**
 * Scroll viewport down by specified number of rows.
 */
export function scrollViewportDown(
  currentWindow: ViewportWindow,
  totalRows: number,
  scrollRows: number = 1
): ViewportWindow {
  const maxStartRow = Math.max(0, totalRows - currentWindow.visibleRows);
  const newStartRow = Math.min(maxStartRow, currentWindow.startRow + scrollRows);
  const newEndRow = Math.min(totalRows - 1, newStartRow + currentWindow.visibleRows - 1);

  return {
    ...currentWindow,
    startRow: newStartRow,
    endRow: newEndRow,
  };
}
