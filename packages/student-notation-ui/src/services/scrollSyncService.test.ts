import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import scrollSyncService from './scrollSyncService.ts';

let viewport: {
  scrollLeft: number; scrollWidth: number; clientWidth: number; clientLeft: number;
  getBoundingClientRect: () => { left: number };
};
let legendWidth: number;
let canvas: HTMLCanvasElement;

beforeEach(() => {
  legendWidth = 80;
  viewport = {
    scrollLeft: 0, scrollWidth: 2000, clientWidth: 800, clientLeft: 2,
    getBoundingClientRect: () => ({ left: 100 })
  };
  canvas = { getBoundingClientRect: () => ({
    left: 100 + viewport.clientLeft + legendWidth - viewport.scrollLeft
  }) } as HTMLCanvasElement;
  vi.stubGlobal('document', { getElementById: (id: string) => id === 'grids-wrapper' ? viewport : {} });
  scrollSyncService.init();
});

afterEach(() => vi.unstubAllGlobals());

describe('playback grid scrolling', () => {
  it('lets the playhead reach its anchor, then holds its screen position', () => {
    scrollSyncService.followPlayhead(0, canvas);
    expect(viewport.scrollLeft).toBe(0);
    scrollSyncService.followPlayhead(100, canvas);
    expect(viewport.scrollLeft).toBe(0);
    for (const x of [200, 350.5, 700]) {
      scrollSyncService.followPlayhead(x, canvas);
      expect(legendWidth + x - viewport.scrollLeft).toBeCloseTo(200);
    }
  });

  it('stops scrolling at the end without creating trailing space', () => {
    scrollSyncService.followPlayhead(1800, canvas);
    expect(viewport.scrollLeft).toBe(1200);
    scrollSyncService.followPlayhead(1920, canvas);
    expect(viewport.scrollLeft).toBe(1200);
  });

  it('follows replay and loop jumps back to the beginning or a selected beat', () => {
    scrollSyncService.followPlayhead(1800, canvas);
    scrollSyncService.followPlayhead(0, canvas);
    expect(viewport.scrollLeft).toBe(0);
    scrollSyncService.followPlayhead(1800, canvas);
    scrollSyncService.followPlayhead(500, canvas);
    expect(viewport.scrollLeft).toBe(380);
  });

  it('resumes following after a manual horizontal scroll', () => {
    viewport.scrollLeft = 900;
    scrollSyncService.followPlayhead(500, canvas);
    expect(viewport.scrollLeft).toBe(380);
  });

  it('uses current viewport and legend dimensions after resizing', () => {
    scrollSyncService.followPlayhead(500, canvas);
    viewport.clientWidth = 400;
    legendWidth = 60;
    scrollSyncService.followPlayhead(500, canvas);
    expect(legendWidth + 500 - viewport.scrollLeft).toBe(100);
  });

  it('does not scroll a score that fits within the viewport', () => {
    viewport.scrollWidth = 600;
    scrollSyncService.followPlayhead(500, canvas);
    expect(viewport.scrollLeft).toBe(0);
  });

  it('ignores hidden viewports and invalid playhead positions', () => {
    viewport.scrollLeft = 300;
    scrollSyncService.followPlayhead(NaN, canvas);
    expect(viewport.scrollLeft).toBe(300);
    viewport.clientWidth = 0;
    scrollSyncService.followPlayhead(500, canvas);
    expect(viewport.scrollLeft).toBe(300);
  });
});
