import { describe, expect, it } from 'vitest';
import {
  getNotationAssemblySizingForCellHeight,
  resolveNotationAssemblySizing
} from './assemblySizing.ts';
import { getDrumRowHeightFromCellHeight } from '@utils/drumGridSizing.ts';

describe('assemblySizing', () => {
  it('sizes each drum row to 61.8% of a pitch row', () => {
    expect(getDrumRowHeightFromCellHeight(1000)).toBe(618);
  });

  it('chooses the largest integer cell size that fits the full grid assembly', () => {
    const sizing = resolveNotationAssemblySizing({
      availableHeight: 800,
      rowCount: 20
    });

    expect(sizing.cellHeight).toBe(59);
    expect(sizing.cellWidth).toBe(30);
    expect(sizing.buttonGridHeight).toBe(60);
    expect(sizing.pitchViewportHeight).toBe(619.5);
    expect(sizing.drumRowHeight).toBe(36);
    expect(sizing.drumCanvasHeight).toBe(108);
    expect(sizing.assemblyHeight).toBe(787.5);
    expect(sizing.bottomRemainderHeight).toBe(12.5);

    const nextLarger = getNotationAssemblySizingForCellHeight(60, 20, 800);
    expect(nextLarger.fitsAvailableHeight).toBe(false);
  });

  it('accounts for a horizontal scrollbar reducing the available vertical budget', () => {
    const sizing = resolveNotationAssemblySizing({
      availableHeight: 776,
      rowCount: 20
    });

    expect(sizing.cellHeight).toBe(57);
    expect(sizing.cellWidth).toBe(29);
    expect(sizing.assemblyHeight).toBe(763.5);
    expect(sizing.bottomRemainderHeight).toBe(12.5);

    const nextLarger = getNotationAssemblySizingForCellHeight(58, 20, 776);
    expect(nextLarger.fitsAvailableHeight).toBe(false);
  });

  it('keeps the responsive toolbar breakpoint budget stable without a no-op recalc loop', () => {
    const sizing = resolveNotationAssemblySizing({
      availableHeight: 844,
      rowCount: 20
    });

    expect(sizing.cellHeight).toBe(63);
    expect(sizing.pitchViewportHeight).toBe(661.5);
    expect(sizing.assemblyHeight).toBe(841.5);
    expect(sizing.bottomRemainderHeight).toBe(2.5);
  });
});
