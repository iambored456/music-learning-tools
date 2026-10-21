import type { PrintOptions } from '@mlt/types';
import { getPrintLineRanges, type PrintLineRange } from '../printLayout.ts';

export const POINTS_PER_INCH = 72;
export const PAPER_SIZES = { letter: [8.5, 11], '11x14': [11, 14], '11x17': [11, 17] } as const;
export const PRINT_MARGIN = 18;

export interface PrintGeometry {
  width: number;
  height: number;
  legendWidth: number;
  measureEnds: number[];
  gap: number;
}
export interface PageLine extends PrintLineRange {
  x: number;
  y: number;
  scale: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}
export interface PrintPageLayout {
  width: number;
  height: number;
  lines: PageLine[];
}
export interface PrintLayout {
  pages: PrintPageLayout[];
  lineCount: number;
  warnings: string[];
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const finite = (value: number | undefined, fallback: number): number => value !== undefined && Number.isFinite(value) ? value : fallback;

/** Physical page geometry in points; independent of browser dimensions and device pixels. */
export function layoutPrintPages(geometry: PrintGeometry, options: PrintOptions): PrintLayout {
  if (!(geometry.width > 0 && geometry.height > 0)) throw new Error('There is no score to print.');
  const paper = PAPER_SIZES[options.pageSize] ?? PAPER_SIZES.letter;
  const width = paper[options.orientation === 'landscape' ? 1 : 0] * POINTS_PER_INCH;
  const height = paper[options.orientation === 'landscape' ? 0 : 1] * POINTS_PER_INCH;
  const availableWidth = width - PRINT_MARGIN * 2;
  const availableHeight = height - PRINT_MARGIN * 2;
  const left = options.includeLeftLegend ? geometry.legendWidth : 0;
  const right = options.includeRightLegend ? geometry.legendWidth : 0;
  const topCrop = clamp(finite(options.cropTop, 0), 0, 0.95);
  const bottomCrop = clamp(finite(options.cropBottom, 1), topCrop + 0.05, 1);
  const leftCrop = clamp(finite(options.cropLeft, 0), 0, 0.95);
  const rightCrop = clamp(finite(options.cropRight, 1), leftCrop + 0.05, 1);
  const lines = getPrintLineRanges(geometry.measureEnds, geometry.width, options.barsPerLine).map(range => {
    const lineWidth = left + range.endX - range.startX + right;
    return { ...range, cropX: lineWidth * leftCrop, cropY: geometry.height * topCrop,
      cropWidth: lineWidth * (rightCrop - leftCrop), cropHeight: geometry.height * (bottomCrop - topCrop) };
  });
  const widest = Math.max(...lines.map(line => line.cropWidth));
  const lineHeight = lines[0]!.cropHeight;
  const requestedScale = 0.75 * clamp(finite(options.notationSize, 100), 25, 200) / 100;
  let scale = Math.min(requestedScale, availableWidth / widest);
  const warnings: string[] = [];
  const paginate = options.pagination === 'paginate';
  const totalHeight = lines.length * lineHeight + (lines.length - 1) * geometry.gap;
  scale = Math.min(scale, availableHeight / (paginate ? lineHeight : totalHeight));
  if (scale < requestedScale * 0.99) {
    warnings.push(paginate
      ? 'Notation was reduced to keep each line inside the page. Try fewer bars per line or a smaller pitch range.'
      : 'Notation was reduced to fit one page. Choose multiple pages to keep a larger size.');
  }
  const perPage = paginate ? Math.max(1, Math.floor((availableHeight / scale + geometry.gap + 1e-7) / (lineHeight + geometry.gap))) : lines.length;
  if (Math.ceil(lines.length / perPage) > 200) throw new Error('This layout exceeds 200 pages. Increase bars per line or reduce notation size.');
  const pages: PrintPageLayout[] = [];
  for (let start = 0; start < lines.length; start += perPage) {
    const pageLines = lines.slice(start, start + perPage);
    const contentHeight = (pageLines.length * lineHeight + (pageLines.length - 1) * geometry.gap) * scale;
    const offsetY = paginate ? PRINT_MARGIN : (height - contentHeight) / 2;
    pages.push({ width, height, lines: pageLines.map((line, index) => ({ ...line, scale,
      x: (width - widest * scale) / 2, y: offsetY + index * (lineHeight + geometry.gap) * scale })) });
  }
  return { pages, lineCount: lines.length, warnings };
}
