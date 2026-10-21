import { resolveNoteLabelLayout } from '@mlt/ui-components/canvas/primitives';
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

export function resolvePitchLabelTextLayout(
  ctx: PitchLabelTextMeasureContext,
  lines: string[],
  options: PitchLabelTextLayoutOptions
): PitchLabelTextLayout {
  return resolveNoteLabelLayout(ctx, lines, { ...options, font: getFont });
}
