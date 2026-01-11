/**
 * Viewport Calculations
 *
 * Thin wrappers around shared viewport math with Student Notation defaults.
 */

import { BASE_ABSTRACT_UNIT } from '@/core/constants.ts';
import {
  calculateZoomToFitRowCount as calculateZoomToFitRowCountBase,
  calculateViewportBounds,
  getNormalizedRange,
  interpolateRange,
  easeInOutCubic,
  DEFAULT_MIN_VIEWPORT_ROWS,
  getAdaptiveZoomStep,
  getSpan,
  normalizeRange,
  setBottomEndpoint,
  setTopEndpoint,
  shiftRangeBy,
  zoomRange,
} from '@mlt/pitch-viewport';

/**
 * Calculate the zoom level needed to fit a given number of rows in a container.
 */
export function calculateZoomToFitRowCount(containerHeight: number, rowCount: number): number {
  return calculateZoomToFitRowCountBase(containerHeight, rowCount, {
    baseUnit: BASE_ABSTRACT_UNIT,
    paddingRows: 1,
  });
}

export {
  calculateViewportBounds,
  getNormalizedRange,
  interpolateRange,
  easeInOutCubic,
  DEFAULT_MIN_VIEWPORT_ROWS,
  getAdaptiveZoomStep,
  getSpan,
  normalizeRange,
  setBottomEndpoint,
  setTopEndpoint,
  shiftRangeBy,
  zoomRange,
};
