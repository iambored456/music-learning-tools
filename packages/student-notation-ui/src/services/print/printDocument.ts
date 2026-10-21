import type { AppState, PrintOptions } from '@mlt/types';
import { buildScoreScene, snapshotPrintScore, type ScoreScene } from './scoreScene.ts';
import { layoutPrintPages, type PageLine } from './pageLayout.ts';
import { svgElement as el, svgRect as rect } from './svg.ts';

export interface PrintPage {
  readonly width: number;
  readonly height: number;
  readonly svg: string;
}
export interface PrintDocument {
  readonly pages: readonly PrintPage[];
  readonly barCount: number;
  readonly hasPickup: boolean;
  readonly lineCount: number;
  readonly warnings: readonly string[];
  readonly topRow: number;
  readonly bottomRow: number;
}

function renderLine(scene: ScoreScene, layout: PageLine, options: PrintOptions): string {
  const left = options.includeLeftLegend ? scene.legendWidth : 0;
  const musicalWidth = layout.endX - layout.startX;
  let content = el('svg', { x: left, y: 0, width: musicalWidth, height: scene.height,
    viewBox: `${layout.startX} 0 ${musicalWidth} ${scene.height}`, overflow: 'hidden' }, el('use', { href: '#music' }));
  if (options.includeLeftLegend) content += el('use', { href: '#left-legend' });
  if (options.includeRightLegend) content += el('use', { href: '#right-legend', x: left + musicalWidth });
  // Explicit continuation chevrons distinguish a split sustained note from a new attack.
  for (const note of scene.continuations) {
    for (const boundary of [layout.startX, layout.endX]) {
      if (!(note.start < boundary && note.end > boundary)) continue;
      const bx = left + (boundary === layout.startX ? 3 : musicalWidth - 6);
      content += el('path', { d: `M ${bx} ${note.y - 3} l 3 3 l -3 3`, fill: 'none', stroke: note.color, 'stroke-width': 1.2 });
    }
  }
  return el('svg', { x: layout.x, y: layout.y, width: layout.cropWidth * layout.scale, height: layout.cropHeight * layout.scale,
    viewBox: `${layout.cropX} ${layout.cropY} ${layout.cropWidth} ${layout.cropHeight}`, overflow: 'hidden' }, content);
}

/** These exact, immutable SVG pages are used for both preview and printing. */
export function preparePrintDocument(source: AppState, options: PrintOptions): PrintDocument {
  const state = snapshotPrintScore(source);
  const scene = buildScoreScene(state, options);
  const layout = layoutPrintPages(scene, options);
  const pages = layout.pages.map(page => Object.freeze({ width: page.width, height: page.height,
    svg: el('svg', { xmlns: 'http://www.w3.org/2000/svg', width: `${page.width}pt`, height: `${page.height}pt`,
      viewBox: `0 0 ${page.width} ${page.height}`, 'font-family': 'Arial, sans-serif', 'font-weight': 'normal' },
    rect(0, 0, page.width, page.height, '#ffffff')
      + el('defs', {}, el('g', { id: 'music' }, scene.music)
        + el('g', { id: 'left-legend' }, scene.leftLegend) + el('g', { id: 'right-legend' }, scene.rightLegend))
      + page.lines.map(line => renderLine(scene, line, options)).join(''))
  }));
  return Object.freeze({ pages: Object.freeze(pages), barCount: scene.barCount, hasPickup: scene.hasPickup,
    lineCount: layout.lineCount, warnings: Object.freeze(layout.warnings), topRow: scene.topRow, bottomRow: scene.bottomRow });
}

export const pageImageSource = (page: PrintPage): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(page.svg)}`;

/** Raster output is drawn from vectors at the requested physical resolution, never upscaled screen pixels. */
export async function rasterizePrintPage(page: PrintPage, dpi = 300): Promise<HTMLCanvasElement> {
  if (!Number.isFinite(dpi) || dpi < 72 || dpi > 600) throw new Error('Print resolution must be between 72 and 600 DPI.');
  const image = new Image();
  image.src = pageImageSource(page);
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(page.width / 72 * dpi);
  canvas.height = Math.round(page.height / 72 * dpi);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the print image.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
