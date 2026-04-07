import { describe, expect, it } from 'vitest';
import {
  LEGEND_SMALL_TEXT_THRESHOLD_PX,
  resolveLegendTextLayout,
  snapToDevicePixel
} from './legendTextRendering.ts';

type StubMeasureContext = {
  font: string;
  measureText(text: string): TextMetrics;
};

function createMeasureContext(charWidth = 0.58): StubMeasureContext {
  let currentFont = '';

  return {
    get font() {
      return currentFont;
    },
    set font(value: string) {
      currentFont = value;
    },
    measureText(text: string) {
      const fontSizeMatch = currentFont.match(/(\d+(?:\.\d+)?)px/);
      const fontSize = Number(fontSizeMatch?.[1] ?? 0);
      const width = text.length * fontSize * charWidth;
      return { width } as TextMetrics;
    }
  };
}

describe('legendTextRendering', () => {
  it('uses fill-only rendering for very small fitted labels', () => {
    const ctx = createMeasureContext() as unknown as CanvasRenderingContext2D;

    const layout = resolveLegendTextLayout(ctx, 'Bb/A#7', {
      cellHeight: 23,
      colWidth: 34.5,
      pixelRatio: 1
    });

    expect(layout.regime).toBe('fill');
    expect(layout.fontSize).toBeLessThan(LEGEND_SMALL_TEXT_THRESHOLD_PX);
    expect(layout.outlineOffsetPx).toBe(0);
  });

  it('switches to halo rendering once the fitted font reaches medium size', () => {
    const ctx = createMeasureContext() as unknown as CanvasRenderingContext2D;

    const layout = resolveLegendTextLayout(ctx, 'C4', {
      cellHeight: 65,
      colWidth: 97.5,
      pixelRatio: 1
    });

    expect(layout.regime).toBe('halo');
    expect(layout.fontSize).toBeGreaterThanOrEqual(LEGEND_SMALL_TEXT_THRESHOLD_PX);
    expect(layout.outlineOffsetPx).toBe(1);
  });

  it('width-fits longer labels inside the legend subcolumn', () => {
    const ctx = createMeasureContext() as unknown as CanvasRenderingContext2D;

    const naturalLayout = resolveLegendTextLayout(ctx, 'C4', {
      cellHeight: 65,
      colWidth: 97.5,
      pixelRatio: 1
    });
    const accidentalLayout = resolveLegendTextLayout(ctx, 'Bb/A#7', {
      cellHeight: 65,
      colWidth: 97.5,
      pixelRatio: 1
    });

    expect(accidentalLayout.fontSize).toBeLessThan(naturalLayout.fontSize);
    expect(accidentalLayout.maxTextWidth).toBeCloseTo(87.75, 2);
  });

  it('snaps anchor positions to device pixels', () => {
    expect(snapToDevicePixel(10.24, 2)).toBe(10);
    expect(snapToDevicePixel(10.26, 2)).toBe(10.5);
  });
});
