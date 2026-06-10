import { describe, expect, it } from 'vitest';
import { BASE_ABSTRACT_UNIT } from '@/core/constants.ts';
import {
  calculateZoomToFitRowCount,
  getMinimumCellHeightForViewportCoverage,
  getPitchViewportCoverageMetrics
} from './pitchRangeState.ts';

describe('pitchRangeState', () => {
  it('fits the selected row span by its visible cell edges', () => {
    const containerHeight = 420;
    const rowCount = 20;
    const zoom = calculateZoomToFitRowCount(containerHeight, rowCount);
    const cellHeight = BASE_ABSTRACT_UNIT * zoom;

    expect((rowCount + 1) * (cellHeight / 2)).toBeCloseTo(containerHeight);
  });

  it('uses the same edge coverage convention as coverage metrics', () => {
    const containerHeight = 420;
    const pitchRange = { topIndex: 10, bottomIndex: 29 };
    const rowCount = 20;
    const zoom = calculateZoomToFitRowCount(containerHeight, rowCount);
    const cellHeight = BASE_ABSTRACT_UNIT * zoom;

    const metrics = getPitchViewportCoverageMetrics({
      containerHeight,
      cellHeight,
      pitchRange,
      totalRanks: 100
    });

    expect(metrics?.coverageGapPx).toBeCloseTo(0);
    expect(metrics?.underCoveragePx).toBe(0);
  });

  it('chooses the nearest whole-pixel cell height for non-integral fits', () => {
    expect(getMinimumCellHeightForViewportCoverage(366, 39)).toBe(18);
    expect(getMinimumCellHeightForViewportCoverage(324, 20)).toBe(31);
  });
});
