import { describe, it, expect, vi } from 'vitest';

vi.mock('@state/index.ts', () => ({
  default: {
    on: vi.fn(),
    state: {}
  }
}));

vi.mock('../../../../services/layoutService.ts', () => ({
  default: {
    getViewportInfo: () => ({ startRank: 10, endRank: 20 })
  }
}));

// These are imported after mocks so module-level listeners use the mocked store.
import { getRowFromY, getRowY } from './rendererUtils.ts';

describe('rendererUtils row mapping', () => {
  it('maps the first visible row center to halfUnit', () => {
    const options = { cellHeight: 20 } as any;
    expect(getRowY(10, options)).toBe(10);
    expect(getRowY(11, options)).toBe(20);
  });

  it('inverts getRowY via getRowFromY', () => {
    const options = { cellHeight: 20 } as any;
    expect(getRowFromY(10, options)).toBe(10);
    expect(getRowFromY(20, options)).toBe(11);
  });
});

