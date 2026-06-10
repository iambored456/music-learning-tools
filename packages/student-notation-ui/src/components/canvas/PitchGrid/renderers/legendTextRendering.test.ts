import { describe, expect, it } from 'vitest';
import {
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
  it('keeps a visible stroke outline for very small fitted labels', () => {
    const ctx = createMeasureContext() as unknown as CanvasRenderingContext2D;

    const layout = resolveLegendTextLayout(ctx, 'Bb/A#7', {
      cellHeight: 23,
      colWidth: 34.5,
      pixelRatio: 1
    });

    expect(layout.regime).toBe('stroke');
    expect(layout.outlineWidthPx).toBeGreaterThan(0);
  });

  it('uses stroke rendering once the fitted font reaches medium size', () => {
    const ctx = createMeasureContext() as unknown as CanvasRenderingContext2D;

    const layout = resolveLegendTextLayout(ctx, 'C4', {
      cellHeight: 65,
      colWidth: 97.5,
      pixelRatio: 1
    });

    expect(layout.regime).toBe('stroke');
    expect(layout.outlineWidthPx).toBeGreaterThan(1);
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
    expect(accidentalLayout.maxTextWidth).toBeCloseTo(83.85, 2);
  });

  it('snaps anchor positions to device pixels', () => {
    expect(snapToDevicePixel(10.24, 2)).toBe(10);
    expect(snapToDevicePixel(10.26, 2)).toBe(10.5);
  });
});
