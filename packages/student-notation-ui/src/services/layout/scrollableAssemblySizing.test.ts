import { describe, expect, it } from 'vitest';
import { resolveNotationAssemblySizing, type NotationAssemblySizing } from './assemblySizing.ts';
import { resolveScrollableNotationAssemblySizing } from './scrollableAssemblySizing.ts';
import { getLegendTotalWidthPx } from '@utils/legendSizing.ts';

function createViewport(scrollbarHeight = 24) {
  const viewport = {
    width: 1325,
    height: 800,
    renderedWidth: 0,
    style: { overflowX: 'auto' },
    get clientWidth() { return this.width; },
    get offsetHeight() { return this.height; },
    get clientHeight() {
      const hasScrollbar = this.style.overflowX === 'scroll'
        || (this.style.overflowX === 'auto' && this.renderedWidth > this.width);
      return this.height - (hasScrollbar ? scrollbarHeight : 0);
    }
  };
  return viewport;
}

function contentWidth(sizing: NotationAssemblySizing, columns: number): number {
  return Math.round(columns * sizing.cellWidth)
    + 2 * Math.round(getLegendTotalWidthPx(sizing.cellWidth, sizing.cellHeight));
}

describe('scrollableAssemblySizing', () => {
  it('settles when adding a column crosses the auto-scrollbar resize cycle', () => {
    const viewport = createViewport();
    const layout = (columns: number) => {
      const sizing = resolveScrollableNotationAssemblySizing({
        container: viewport as unknown as HTMLElement,
        fallbackAvailableHeight: 800,
        rowCount: 20,
        getContentWidth: candidate => contentWidth(candidate, columns)
      });
      viewport.renderedWidth = contentWidth(sizing, columns);
      return sizing;
    };

    const before = layout(31);
    expect(viewport.style.overflowX).toBe('hidden');
    expect(before.cellWidth).toBe(30);
    // At 32 columns, the full-height grid overflows; the shorter grid fits.
    // Using auto overflow with clientHeight alternates between these sizes.
    expect(contentWidth(before, 32)).toBeGreaterThan(viewport.width);
    const after = layout(32);
    expect(viewport.renderedWidth).toBeLessThan(viewport.width);
    expect(viewport.style.overflowX).toBe('scroll');
    expect(after.availableHeight).toBe(776);
    expect(after.fitsAvailableHeight).toBe(true);
    for (let pass = 0; pass < 8; pass += 1) {
      expect(layout(32)).toEqual(after);
    }

    // Removing the column must release the scrollbar and restore cell size.
    expect(layout(31)).toEqual(before);
    expect(viewport.style.overflowX).toBe('hidden');
  });

  it.each([0, 15, 24])('uses the actual %i px scrollbar budget and responds to viewport changes', scrollbarHeight => {
    const viewport = createViewport(scrollbarHeight);
    const layout = () => resolveScrollableNotationAssemblySizing({
      container: viewport as unknown as HTMLElement,
      fallbackAvailableHeight: 800,
      rowCount: 20,
      getContentWidth: sizing => contentWidth(sizing, 60)
    });
    const scrolled = layout();
    expect(scrolled.availableHeight).toBe(800 - scrollbarHeight);
    expect(layout()).toEqual(scrolled);
    viewport.width = 3000;
    expect(layout().availableHeight).toBe(800);
    expect(viewport.style.overflowX).toBe('hidden');
    viewport.height = 600;
    expect(layout().availableHeight).toBe(600);
  });

  it.each([
    { includeButtonGrid: false },
    { includeDrumGrid: false },
    { includeButtonGrid: false, includeDrumGrid: false }
  ])('preserves the visible grid height budget: %j', visibility => {
    const viewport = createViewport();
    const sizing = resolveScrollableNotationAssemblySizing({
      container: viewport as unknown as HTMLElement,
      fallbackAvailableHeight: 800,
      rowCount: 20,
      ...visibility,
      getContentWidth: candidate => contentWidth(candidate, 60)
    });
    expect(sizing).toEqual(resolveNotationAssemblySizing({
      availableHeight: 776, rowCount: 20, ...visibility
    }));
  });

  it('does not show a scrollbar when content fits exactly', () => {
    const viewport = createViewport();
    resolveScrollableNotationAssemblySizing({
      container: viewport as unknown as HTMLElement,
      fallbackAvailableHeight: 800,
      rowCount: 20,
      getContentWidth: () => viewport.width
    });
    expect(viewport.style.overflowX).toBe('hidden');
  });
});
