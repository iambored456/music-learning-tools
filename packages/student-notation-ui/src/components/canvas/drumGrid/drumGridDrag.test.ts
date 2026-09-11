import { describe, expect, it } from 'vitest';
import { getDrumGridCellsBetween } from './drumGridDrag.ts';

describe('drum-grid drag traversal', () => {
  it('includes skipped horizontal cells between pointer events', () => {
    expect(getDrumGridCellsBetween(
      { column: 2, row: 1 },
      { column: 5, row: 1 }
    )).toEqual([
      { column: 2, row: 1 },
      { column: 3, row: 1 },
      { column: 4, row: 1 },
      { column: 5, row: 1 }
    ]);
  });

  it('tracks a diagonal drag across drum rows', () => {
    expect(getDrumGridCellsBetween(
      { column: 4, row: 0 },
      { column: 6, row: 2 }
    )).toEqual([
      { column: 4, row: 0 },
      { column: 5, row: 1 },
      { column: 6, row: 2 }
    ]);
  });
});
