import { diamondPath } from '@components/rhythm/glyphs/sixteenthGlyphs.ts';
import { createHexDiamondBase, renderSixteenthStampRowSVG, svgPathFromPoints } from '@utils/sharedDiamondStampSvg.ts';

export interface SixteenthThreeStampShape {
  ovals: number[];
  diamonds: number[];
}

export interface SixteenthThreeStampPlacementLike {
  row: number;
  shapeOffsets?: Record<string, number>;
}

type GetRowY = (row: number) => number;

export interface SixteenthThreeStampRendererOptions {
  diamondW?: number;
  diamondH?: number;
  strokeWidth?: number;
}

type ShapeFillLevels = Record<string, number>;
const snapToHalf = (value: number): number => Math.round(value * 2) / 2;
const CANVAS_SCALE_FACTOR = 0.8;
let svgGradientCounter = 0;

/**
 * Shared three-sixteenth stamp rendering utility for both canvas and SVG contexts.
 * Uses 3 evenly-spaced slot positions at 1/6, 3/6, 5/6 of the cell.
 */
export class SixteenthThreeStampRenderer {
  private options: Required<SixteenthThreeStampRendererOptions>;

  constructor(options: SixteenthThreeStampRendererOptions = {}) {
    this.options = {
      // Match four-sixteenth visual density:
      // 4-stamp uses 30/100 * 0.8 width over 0.25 slot spacing (~96% fill).
      // For 3 slots (spacing 1/3), use 40 so fill is visually equivalent.
      diamondW: 40,
      diamondH: 120,
      strokeWidth: 2,
      ...options
    };
  }

  private drawEnvelopeFillPath(
    ctx: CanvasRenderingContext2D,
    pathObj: Path2D,
    cx: number,
    cy: number,
    radius: number,
    color: string,
    fillLevel: number
  ): void {
    if (fillLevel <= 0) {return;}

    const innerRatio = 1 - fillLevel;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(Math.max(0, innerRatio - 0.05), 'transparent');
    gradient.addColorStop(innerRatio, `${color}1F`);
    gradient.addColorStop(1, `${color}BF`);

    ctx.save();
    ctx.clip(pathObj);
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - radius - 10, cy - radius - 10, (radius + 10) * 2, (radius + 10) * 2);
    ctx.restore();
  }

  /**
   * Renders a three-sixteenth stamp to a canvas context.
   * Slot centers at 1/6, 3/6, 5/6 of the cell width.
   */
  renderToCanvas(
    ctx: CanvasRenderingContext2D,
    stamp: SixteenthThreeStampShape,
    x: number,
    y: number,
    width: number,
    height: number,
    color = '#000',
    placement: (SixteenthThreeStampPlacementLike & { shapeOffsets?: Record<string, number> }) | null = null,
    getRowY: GetRowY | null = null,
    shapeFillLevels: ShapeFillLevels | null = null
  ): void {
    const scaleX = (width / 100) * CANVAS_SCALE_FACTOR;
    const scaleY = (height / 100) * CANVAS_SCALE_FACTOR;
    const diamondW = this.options.diamondW * scaleX;
    const diamondH = this.options.diamondH * scaleY;

    // 3 evenly-spaced positions: 1/6, 3/6, 5/6
    const slotCenters = [1 / 6, 3 / 6, 5 / 6].map(ratio => x + ratio * width);
    const centerY = y + height / 2;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = this.options.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw diamonds (all shapes in three-sixteenth stamps are diamonds)
    stamp.diamonds.forEach(slot => {
      const cx = slotCenters[slot];
      if (cx === undefined) {
        return;
      }
      const shapeKey = `diamond_${slot}`;

      let diamondY = centerY;
      if (placement && getRowY) {
        const rowOffset = (placement.shapeOffsets?.[shapeKey]) || 0;
        const shapeRow = placement.row + rowOffset;
        diamondY = getRowY(shapeRow);
      }

      const path = diamondPath(cx, diamondY, diamondW, diamondH);
      const pathObj = new Path2D(path);
      const fillLevel = shapeFillLevels?.[shapeKey] ?? 0;
      this.drawEnvelopeFillPath(ctx, pathObj, cx, diamondY, Math.max(diamondW, diamondH) / 2, color, fillLevel);
      ctx.stroke(pathObj);
    });

    ctx.restore();
  }

  /**
   * Renders a three-sixteenth stamp to an SVG element.
   */
  renderToSVG(stamp: SixteenthThreeStampShape, viewBoxWidth = 100, viewBoxHeight = 100): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);

    const strokeWidth = this.options.strokeWidth * 2;
    const inset = Math.max(strokeWidth / 2, 0.5);
    const usableWidth = Math.max(1, viewBoxWidth - (2 * inset));
    const usableHeight = Math.max(1, viewBoxHeight - (2 * inset));
    const slotWidth = snapToHalf(usableWidth / 3);
    const slotStartX = inset;
    const diamondH = usableHeight;
    const centerY = inset + (usableHeight / 2);

    const selected = Array.from({ length: 3 }, (_, index) => stamp.diamonds.includes(index));
    const base = createHexDiamondBase(slotWidth, diamondH, centerY);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const playbackFillPaths: SVGPathElement[] = [];
    const gradientPrefix = `sixteenth-three-playback-fill-${svgGradientCounter++}`;
    selected.forEach((isSelected, slot) => {
      if (!isSelected) {
        return;
      }

      const slotOffsetX = slotStartX + (slot * slotWidth);
      const translatedBase = base.map(point => ({ x: point.x + slotOffsetX, y: point.y }));
      const gradientId = `${gradientPrefix}-${slot}`;
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
      gradient.setAttribute('id', gradientId);
      gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
      gradient.setAttribute('cx', String(slotOffsetX + (slotWidth / 2)));
      gradient.setAttribute('cy', String(centerY));
      gradient.setAttribute('r', String(Math.max(slotWidth, diamondH) / 2));

      const innerStop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      innerStop.setAttribute('offset', '0%');
      innerStop.setAttribute('stop-color', 'currentColor');
      innerStop.setAttribute('stop-opacity', String(0x1F / 255));

      const outerStop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      outerStop.setAttribute('offset', '100%');
      outerStop.setAttribute('stop-color', 'currentColor');
      outerStop.setAttribute('stop-opacity', String(0xBF / 255));

      gradient.appendChild(innerStop);
      gradient.appendChild(outerStop);
      defs.appendChild(gradient);

      const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      fillPath.setAttribute('data-segment', 'playback-fill');
      fillPath.setAttribute('d', svgPathFromPoints(translatedBase));
      fillPath.setAttribute('fill', `url(#${gradientId})`);
      playbackFillPaths.push(fillPath);
    });

    if (playbackFillPaths.length > 0) {
      svg.appendChild(defs);
      playbackFillPaths.forEach(path => svg.appendChild(path));
    }

    const rowMarkup = renderSixteenthStampRowSVG({
      slots: 3,
      selected,
      base,
      offset: slot => ({ x: slotStartX + (slot * slotWidth), y: 0 }),
      strokeWidth
    });
    svg.insertAdjacentHTML('beforeend', rowMarkup);

    return svg;
  }
}

export const defaultSixteenthThreeStampRenderer = new SixteenthThreeStampRenderer();
