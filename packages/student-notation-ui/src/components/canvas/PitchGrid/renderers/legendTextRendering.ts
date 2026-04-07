export type LegendTextMeasureContext = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;

export type LegendTextRegime = 'fill' | 'halo';

export interface LegendTextLayoutOptions {
  cellHeight: number;
  colWidth: number;
  pixelRatio: number;
}

export interface LegendTextLayout {
  fontSize: number;
  font: string;
  regime: LegendTextRegime;
  outlineOffsetPx: number;
  maxTextWidth: number;
}

export const LEGEND_SMALL_TEXT_THRESHOLD_PX = 16;

const LEGEND_TEXT_HEIGHT_RATIO = 0.66;
const LEGEND_TEXT_MAX_WIDTH_RATIO = 0.9;
const LEGEND_MIN_FONT_SIZE_PX = 7;
const LEGEND_HALO_OFFSET_PX = 1;

export function snapToDevicePixel(value: number, pixelRatio: number): number {
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return value;
  }
  return Math.round(value * pixelRatio) / pixelRatio;
}

export function getLegendFontDeclaration(fontSize: number): string {
  return `bold ${fontSize}px 'Atkinson Hyperlegible Next', sans-serif`;
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

  const regime: LegendTextRegime =
    fontSize < LEGEND_SMALL_TEXT_THRESHOLD_PX ? 'fill' : 'halo';

  return {
    fontSize,
    font: getLegendFontDeclaration(fontSize),
    regime,
    outlineOffsetPx: regime === 'halo' ? LEGEND_HALO_OFFSET_PX : 0,
    maxTextWidth
  };
}
