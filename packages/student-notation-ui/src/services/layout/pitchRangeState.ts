import { BASE_ABSTRACT_UNIT } from '@/core/constants.ts';
import { calculateZoomToFitRowCount as calculateZoomToFitRowCountShared } from '@mlt/pitch-viewport';
import type { PitchRange } from '@mlt/types';
import { DEFAULT_MIN_VIEWPORT_ROWS, getSpan, normalizeRange } from '@utils/pitchViewport.ts';

export interface PitchViewportCoverageMetrics {
  rowCount: number;
  cellHeight: number;
  halfUnit: number;
  coveredBottomEdgePx: number;
  coverageGapPx: number;
  underCoveragePx: number;
}

export function calculateZoomToFitRowCount(containerHeight: number, rowCount: number): number {
  return calculateZoomToFitRowCountShared(containerHeight, rowCount, {
    baseUnit: BASE_ABSTRACT_UNIT,
    paddingRows: 1
  });
}

export function rangeFromCenterAndSpan(
  center: number,
  span: number,
  totalRanks: number
): PitchRange {
  const maxIndex = Math.max(0, totalRanks - 1);
  const normalizedSpan = Math.max(
    DEFAULT_MIN_VIEWPORT_ROWS,
    Math.min(totalRanks, Math.round(span))
  );
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

  topIndex = Math.max(0, Math.min(maxIndex, topIndex));
  bottomIndex = Math.max(topIndex, Math.min(maxIndex, bottomIndex));

  return normalizeRange(
    { topIndex, bottomIndex },
    totalRanks,
    DEFAULT_MIN_VIEWPORT_ROWS
  );
}

export function quantizeWithHysteresis(
  rawValue: number,
  previousValue: number | null,
  hysteresisPx: number
): number {
  const rounded = Math.round(rawValue);
  if (previousValue === null || !Number.isFinite(previousValue)) {
    return rounded;
  }
  if (Math.abs(rawValue - previousValue) <= Math.max(0, hysteresisPx)) {
    return Math.round(previousValue);
  }
  return rounded;
}

export function getMinimumCellHeightForViewportCoverage(containerHeight: number, rowCount: number): number {
  if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
    return 1;
  }
  const normalizedRowCount = Math.max(1, Math.round(rowCount));
  const ideal = (2 * containerHeight) / (normalizedRowCount + 1);
  const lower = Math.max(1, Math.floor(ideal));
  const upper = Math.max(1, Math.ceil(ideal));
  const lowerGap = Math.abs(containerHeight - ((normalizedRowCount + 1) * (lower / 2)));
  const upperGap = Math.abs(containerHeight - ((normalizedRowCount + 1) * (upper / 2)));
  return upperGap < lowerGap ? upper : lower;
}

export function resolveZoomAnimationDuration(requestedDurationMs: number, source: string, animationsEnabled: boolean): number {
  if (!animationsEnabled) {
    return 0;
  }
  if (source === 'wheel') {
    return 0;
  }
  return Math.max(0, Math.round(requestedDurationMs));
}

export function getHorizontalScrollbarBlockSize(container: HTMLElement | null): number {
  if (!container) {
    return 0;
  }
  const scrollbarBlockSize = container.offsetHeight - container.clientHeight;
  return Math.max(0, Number.isFinite(scrollbarBlockSize) ? scrollbarBlockSize : 0);
}

export function getPitchViewportCoverageMetrics(params: {
  containerHeight: number;
  cellHeight: number | null;
  pitchRange: PitchRange;
  totalRanks: number;
}): PitchViewportCoverageMetrics | null {
  const { containerHeight, cellHeight, pitchRange, totalRanks } = params;
  if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
    return null;
  }

  if (!totalRanks || cellHeight === null) {
    return null;
  }

  const rowCount = Math.max(1, getSpan(normalizeRange(pitchRange, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS)));
  const halfUnit = cellHeight / 2;
  const coveredBottomEdgePx = (rowCount + 1) * halfUnit;
  const coverageGapPx = containerHeight - coveredBottomEdgePx;

  return {
    rowCount,
    cellHeight,
    halfUnit,
    coveredBottomEdgePx,
    coverageGapPx,
    underCoveragePx: Math.max(0, coverageGapPx)
  };
}
