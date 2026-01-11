import { describe, it, expect } from 'vitest';
import type { PitchRange } from '../../types/state.js';
import {
  clampToGamut,
  getAdaptiveZoomStep,
  getSpan,
  normalizeRange,
  setBottomEndpoint,
  setTopEndpoint,
  shiftRangeBy,
  zoomRange
} from './pitchViewport.ts';

describe('pitchViewport', () => {
  const totalRanks = 100;
  const minSpan = 9;

  it('clamps and orders ranges within gamut', () => {
    expect(clampToGamut({ topIndex: -5, bottomIndex: 200 }, totalRanks)).toEqual({ topIndex: 0, bottomIndex: 99 });
    expect(clampToGamut({ topIndex: 20, bottomIndex: 10 }, totalRanks)).toEqual({ topIndex: 10, bottomIndex: 20 });
  });

  it('normalizes to minimum span by expanding around center', () => {
    const normalized = normalizeRange({ topIndex: 10, bottomIndex: 12 }, totalRanks, minSpan);
    expect(getSpan(normalized)).toBe(minSpan);
    expect(normalized.topIndex).toBe(7);
    expect(normalized.bottomIndex).toBe(15);
  });

  it('sets top endpoint with bottom fixed and enforces min span', () => {
    const current: PitchRange = { topIndex: 10, bottomIndex: 20 };
    expect(setTopEndpoint(current, 15, totalRanks, minSpan)).toEqual({ topIndex: 12, bottomIndex: 20 });
    expect(setTopEndpoint(current, 0, totalRanks, minSpan)).toEqual({ topIndex: 0, bottomIndex: 20 });
  });

  it('sets bottom endpoint with top fixed and enforces min span', () => {
    const current: PitchRange = { topIndex: 10, bottomIndex: 20 };
    expect(setBottomEndpoint(current, 12, totalRanks, minSpan)).toEqual({ topIndex: 10, bottomIndex: 18 });
    expect(setBottomEndpoint(current, 99, totalRanks, minSpan)).toEqual({ topIndex: 10, bottomIndex: 99 });
  });

  it('shifts range by rows while preserving span', () => {
    const current: PitchRange = { topIndex: 0, bottomIndex: 8 };
    expect(shiftRangeBy(current, 1, totalRanks)).toEqual({ topIndex: 1, bottomIndex: 9 });
    expect(shiftRangeBy(current, -1, totalRanks)).toEqual({ topIndex: 0, bottomIndex: 8 });
    expect(shiftRangeBy({ topIndex: 91, bottomIndex: 99 }, 1, totalRanks)).toEqual({ topIndex: 91, bottomIndex: 99 });
  });

  it('zooms out by expanding endpoints (edge pins per Option A)', () => {
    expect(zoomRange({ topIndex: 0, bottomIndex: 8 }, 'out', { totalRanks, minSpan, zoomStep: 2 }))
      .toEqual({ topIndex: 0, bottomIndex: 10 });
    expect(zoomRange({ topIndex: 91, bottomIndex: 99 }, 'out', { totalRanks, minSpan, zoomStep: 2 }))
      .toEqual({ topIndex: 89, bottomIndex: 99 });
    expect(zoomRange({ topIndex: 0, bottomIndex: 99 }, 'out', { totalRanks, minSpan, zoomStep: 2 }))
      .toEqual({ topIndex: 0, bottomIndex: 99 });
  });

  it('zooms in while keeping center stable and clamping to min span', () => {
    expect(zoomRange({ topIndex: 0, bottomIndex: 10 }, 'in', { totalRanks, minSpan, zoomStep: 2 }))
      .toEqual({ topIndex: 1, bottomIndex: 9 });
    expect(zoomRange({ topIndex: 1, bottomIndex: 9 }, 'in', { totalRanks, minSpan, zoomStep: 2 }))
      .toEqual({ topIndex: 1, bottomIndex: 9 });
  });

  it('chooses a larger adaptive zoom step for wide ranges', () => {
    expect(getAdaptiveZoomStep(9, 89)).toBe(1);
    expect(getAdaptiveZoomStep(30, 89)).toBe(2);
    expect(getAdaptiveZoomStep(50, 89)).toBe(3);
    expect(getAdaptiveZoomStep(65, 89)).toBe(4);
    expect(getAdaptiveZoomStep(89, 89)).toBe(5);
  });
});
