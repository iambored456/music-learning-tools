import { describe, expect, it } from 'vitest';
import { resolvePitchLabelTextLayout } from './pitchLabelTextRendering.ts';

function createMeasureContext(charWidth = 0.58): Pick<CanvasRenderingContext2D, 'font' | 'measureText'> {
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
      return { width: text.length * fontSize * charWidth } as TextMetrics;
    }
  };
}

describe('pitch label text rendering', () => {
  it('shrinks a pitch-and-octave label to the notehead width', () => {
    const ctx = createMeasureContext();
    const layout = resolvePitchLabelTextLayout(ctx, ['C#4/Db4'], {
      preferredFontSize: 18,
      maxWidth: 34,
      maxHeight: 24,
      lineHeightRatio: 1
    });

    ctx.font = layout.font;
    expect(ctx.measureText('C#4/Db4').width).toBeLessThanOrEqual(34.01);
    expect(layout.fontSize).toBeLessThan(18);
  });

  it('fits stacked enharmonic spellings to the notehead height', () => {
    const ctx = createMeasureContext();
    const layout = resolvePitchLabelTextLayout(ctx, ['C#4', 'Db4'], {
      preferredFontSize: 16,
      maxWidth: 40,
      maxHeight: 20,
      lineHeightRatio: 1.05
    });

    expect(layout.fontSize * 2.05).toBeLessThanOrEqual(20.01);
  });
});
