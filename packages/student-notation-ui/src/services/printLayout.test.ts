import { describe, expect, it } from 'vitest';
import { getPrintLineRanges } from './printLayout.ts';

describe('print line breaks', () => {
  const eightBars = [100, 200, 300, 400, 500, 600, 700, 800];

  it('arranges eight bars as two lines of four', () => {
    expect(getPrintLineRanges(eightBars, 800, 4)).toEqual([
      { startX: 0, endX: 400 }, { startX: 400, endX: 800 }
    ]);
  });

  it('keeps uneven measures whole and preserves a shorter final line', () => {
    expect(getPrintLineRanges([50, 200, 275, 400, 520], 540, 2)).toEqual([
      { startX: 0, endX: 200 }, { startX: 200, endX: 400 }, { startX: 400, endX: 540 }
    ]);
  });

  it('supports one bar per line', () => {
    expect(getPrintLineRanges([80, 210, 300], 300, 1)).toEqual([
      { startX: 0, endX: 80 }, { startX: 80, endX: 210 }, { startX: 210, endX: 300 }
    ]);
  });

  it('keeps the original single line for default, oversized, or invalid settings', () => {
    for (const count of [undefined, 0, 8, 20, -1, 1.5, NaN, Infinity]) {
      expect(getPrintLineRanges(eightBars, 800, count)).toEqual([{ startX: 0, endX: 800 }]);
    }
    expect(getPrintLineRanges([], 800, 4)).toEqual([{ startX: 0, endX: 800 }]);
  });

  it('falls back safely when a split boundary is invalid', () => {
    for (const ends of [[NaN, 200], [0, 200], [300, 200]]) {
      expect(getPrintLineRanges(ends, 200, 1)).toEqual([{ startX: 0, endX: 200 }]);
    }
  });
});
