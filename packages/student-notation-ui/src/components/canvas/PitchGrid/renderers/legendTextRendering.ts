export type LegendTextMeasureContext = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;

export type LegendTextRegime = 'stroke';

export interface LegendTextLayoutOptions {
  cellHeight: number;
  colWidth: number;
  pixelRatio: number;
}

export interface LegendTextLayout {
  fontSize: number;
  font: string;
  regime: LegendTextRegime;
  outlineWidthPx: number;
  maxTextWidth: number;
}

const LEGEND_TEXT_HEIGHT_RATIO = 0.66;
const LEGEND_TEXT_MAX_WIDTH_RATIO = 0.86;
const LEGEND_MIN_FONT_SIZE_PX = 7;
const LEGEND_MIN_OUTLINE_WIDTH_PX = 1.1;
const LEGEND_MAX_OUTLINE_WIDTH_PX = 2.35;

export function snapToDevicePixel(value: number, pixelRatio: number): number {
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return value;
  }
  return Math.round(value * pixelRatio) / pixelRatio;
}

export function getLegendFontDeclaration(fontSize: number): string {
  return `bold ${fontSize}px 'Atkinson Hyperlegible Next', sans-serif`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function measureLegendLabelWidth(
  ctx: LegendTextMeasureContext,
  label: string,
  fontSize: number
): number {
  const previousFont = ctx.font;
  ctx.font = getLegendFontDeclaration(fontSize);
  const measuredWidth = ctx.measureText(label).width;
  ctx.font = previousFont;
  return measuredWidth;
}

export function resolveLegendTextLayout(
  ctx: LegendTextMeasureContext,
  label: string,
  options: LegendTextLayoutOptions
): LegendTextLayout {
  const { cellHeight, colWidth, pixelRatio } = options;
  const maxTextWidth = Math.max(6, colWidth * LEGEND_TEXT_MAX_WIDTH_RATIO);

  let fontSize = Math.max(LEGEND_MIN_FONT_SIZE_PX, cellHeight * LEGEND_TEXT_HEIGHT_RATIO);
  const widthAtTarget = measureLegendLabelWidth(ctx, label, fontSize);

  if (widthAtTarget > maxTextWidth && widthAtTarget > 0) {
    fontSize *= maxTextWidth / widthAtTarget;
  }

  fontSize = snapToDevicePixel(Math.max(LEGEND_MIN_FONT_SIZE_PX, fontSize), pixelRatio);

  const widthAfterSnap = measureLegendLabelWidth(ctx, label, fontSize);
  if (widthAfterSnap > maxTextWidth && widthAfterSnap > 0) {
    fontSize = snapToDevicePixel(
      Math.max(LEGEND_MIN_FONT_SIZE_PX, fontSize * (maxTextWidth / widthAfterSnap)),
      pixelRatio
    );
  }

  const outlineWidthPx = snapToDevicePixel(
    clamp(fontSize * 0.14, LEGEND_MIN_OUTLINE_WIDTH_PX, LEGEND_MAX_OUTLINE_WIDTH_PX),
    pixelRatio
  );

  return {
    fontSize,
    font: getLegendFontDeclaration(fontSize),
    regime: 'stroke',
    outlineWidthPx,
    maxTextWidth
  };
}
