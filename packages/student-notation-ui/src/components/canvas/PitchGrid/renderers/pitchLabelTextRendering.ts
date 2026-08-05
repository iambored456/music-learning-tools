import { buildCanvasFont } from '@services/typographyService.ts';

export type PitchLabelTextMeasureContext = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;

export interface PitchLabelTextLayoutOptions {
  preferredFontSize: number;
  maxWidth: number;
  maxHeight: number;
  lineHeightRatio: number;
}

export interface PitchLabelTextLayout {
  fontSize: number;
  font: string;
}

function getFont(fontSize: number): string {
  return buildCanvasFont('notation-label', { fontSizePx: fontSize });
}

function measureWidestLine(
  ctx: PitchLabelTextMeasureContext,
  lines: string[],
  fontSize: number
): number {
  const previousFont = ctx.font;
  ctx.font = getFont(fontSize);
  const widestLine = lines.reduce(
    (widest, line) => Math.max(widest, ctx.measureText(line).width),
    0
  );
  ctx.font = previousFont;
  return widestLine;
}

export function resolvePitchLabelTextLayout(
  ctx: PitchLabelTextMeasureContext,
  lines: string[],
  options: PitchLabelTextLayoutOptions
): PitchLabelTextLayout {
  const safeLines = lines.length > 0 ? lines : [''];
  const { preferredFontSize, maxWidth, maxHeight, lineHeightRatio } = options;
  const widestLine = measureWidestLine(ctx, safeLines, preferredFontSize);
  const textBlockHeight = preferredFontSize * (1 + lineHeightRatio * (safeLines.length - 1));
  const widthScale = widestLine > 0 ? maxWidth / widestLine : 1;
  const heightScale = textBlockHeight > 0 ? maxHeight / textBlockHeight : 1;
  const fontSize = preferredFontSize * Math.min(1, widthScale, heightScale);

  return {
    fontSize,
    font: getFont(fontSize)
  };
}
