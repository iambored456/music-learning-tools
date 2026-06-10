import { diamondPath } from '@components/rhythm/glyphs/sixteenthGlyphs.ts';
import { createHexDiamondBase, renderSixteenthStampRowSVG, svgPathFromPoints } from '@utils/sharedDiamondStampSvg.ts';

export interface SixteenthStampShape {
  ovals: number[];
  diamonds: number[];
}

export interface SixteenthStampPlacementLike {
  row: number;
  shapeOffsets?: Record<string, number>;
}

type GetRowY = (row: number) => number;

export interface SixteenthStampRendererOptions {
  diamondW?: number;
  diamondH?: number;
  ovalRx?: number;
  ovalRy?: number;
  strokeWidth?: number;
}

type ShapeFillLevels = Record<string, number>;
export interface SixteenthStampShapeEffects {
  getYOffset?: (shapeKey: string) => number;
  drawEllipseDelayGhosts?: (shapeKey: string, cx: number, cy: number, rx: number, ry: number) => void;
  drawPathDelayGhosts?: (shapeKey: string, cx: number, cy: number, width: number, height: number) => void;
}

let svgGradientCounter = 0;

/**
 * Shared stamp rendering utility for both canvas and SVG contexts.
 */
export class SixteenthStampRenderer {
  private options: Required<SixteenthStampRendererOptions>;

  constructor(options: SixteenthStampRendererOptions = {}) {
    this.options = {
      diamondW: 30,
      diamondH: 120,
      ovalRx: 30,
      ovalRy: 60,
      strokeWidth: 2,
      ...options
    };
  }

  private drawEnvelopeFillEllipse(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: string,
    fillLevel: number
  ): void {
    if (fillLevel <= 0) {return;}

    const innerRatio = 1 - fillLevel;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(Math.max(0, innerRatio - 0.05), 'transparent');
    gradient.addColorStop(innerRatio, `${color}1F`);
    gradient.addColorStop(1, `${color}BF`);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - rx - 10, cy - ry - 10, (rx + 10) * 2, (ry + 10) * 2);
    ctx.restore();
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
   * Renders a stamp to a canvas context.
   */
  renderToCanvas(
    ctx: CanvasRenderingContext2D,
    stamp: SixteenthStampShape,
    x: number,
    y: number,
    width: number,
    height: number,
    color = '#000',
    placement: (SixteenthStampPlacementLike & { shapeOffsets?: Record<string, number> }) | null = null,
    getRowY: GetRowY | null = null,
    shapeFillLevels: ShapeFillLevels | null = null,
    shapeEffects: SixteenthStampShapeEffects | null = null
  ): void {
    // Separate horizontal and vertical scaling to support modulation stretch
    const scaleX = (width / 100) * 0.8;
    const scaleY = (height / 100) * 0.8;
    const diamondW = this.options.diamondW * scaleX;
    const diamondH = this.options.diamondH * scaleY;
    const ovalRx = this.options.ovalRx * scaleX;
    const ovalRy = this.options.ovalRy * scaleY;

    const slotCenters = [0.125, 0.375, 0.625, 0.875].map(ratio => x + ratio * width);
    const centerY = y + height / 2;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = this.options.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw ovals (8th notes) with individual offsets if available
    stamp.ovals.forEach(ovalStart => {
      const cx = ovalStart === 0 ? x + 0.25 * width : x + 0.75 * width;
      const shapeKey = `oval_${ovalStart}`;

      let ovalY = centerY;
      if (placement && getRowY) {
        const rowOffset = (placement.shapeOffsets?.[shapeKey]) || 0;
        const shapeRow = placement.row + rowOffset;
        ovalY = getRowY(shapeRow);
      }
      ovalY += shapeEffects?.getYOffset?.(shapeKey) ?? 0;

      const fillLevel = shapeFillLevels?.[shapeKey] ?? 0;
      shapeEffects?.drawEllipseDelayGhosts?.(shapeKey, cx, ovalY, ovalRx, ovalRy);
      this.drawEnvelopeFillEllipse(ctx, cx, ovalY, ovalRx, ovalRy, color, fillLevel);

      ctx.beginPath();
      ctx.ellipse(cx, ovalY, ovalRx, ovalRy, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw diamonds (16th notes) with individual offsets if available
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
      diamondY += shapeEffects?.getYOffset?.(shapeKey) ?? 0;

      const path = diamondPath(cx, diamondY, diamondW, diamondH);
      const pathObj = new Path2D(path);
      const fillLevel = shapeFillLevels?.[shapeKey] ?? 0;
      shapeEffects?.drawPathDelayGhosts?.(shapeKey, cx, diamondY, diamondW, diamondH);
      this.drawEnvelopeFillPath(ctx, pathObj, cx, diamondY, Math.max(diamondW, diamondH) / 2, color, fillLevel);
      ctx.stroke(pathObj);
    });

    ctx.restore();
  }

  /**
   * Renders a stamp to an SVG element.
   */
  renderToSVG(stamp: SixteenthStampShape, viewBoxWidth = 100, viewBoxHeight = 100): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);

    const strokeWidth = this.options.strokeWidth * 2;
    const inset = Math.max(strokeWidth / 2, 0.5);
    const usableWidth = Math.max(1, viewBoxWidth - (2 * inset));
    const usableHeight = Math.max(1, viewBoxHeight - (2 * inset));
    const scale = Math.min(usableWidth / 100, usableHeight / 100) * 0.8;
    const ovalRx = this.options.ovalRx * scale;
    const ovalRy = this.options.ovalRy * scale;
    const slotWidth = usableWidth / 4;
    const slotStartX = inset;
    const diamondH = usableHeight;
    const centerY = inset + (usableHeight / 2);

    // Draw ovals (8th notes)
    stamp.ovals.forEach(ovalStart => {
      const cx = inset + ((ovalStart === 0 ? 0.25 : 0.75) * usableWidth);
      const oval = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      oval.setAttribute('cx', String(cx));
      oval.setAttribute('cy', String(centerY));
      oval.setAttribute('rx', String(ovalRx));
      oval.setAttribute('ry', String(ovalRy));
      oval.setAttribute('fill', 'none');
      oval.setAttribute('stroke', 'currentColor');
      oval.setAttribute('stroke-width', String(strokeWidth));
      oval.setAttribute('stroke-linecap', 'round');
      svg.appendChild(oval);
    });

    // Draw diamonds (16th notes) with shared boundaries rendered once.
    const selected = Array.from({ length: 4 }, (_, index) => stamp.diamonds.includes(index));
    const base = createHexDiamondBase(slotWidth, diamondH, centerY);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const playbackFillPaths: SVGPathElement[] = [];
    const gradientPrefix = `sixteenth-playback-fill-${svgGradientCounter++}`;
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
      slots: 4,
      selected,
      base,
      offset: slot => ({ x: slotStartX + (slot * slotWidth), y: 0 }),
      strokeWidth
    });
    svg.insertAdjacentHTML('beforeend', rowMarkup);

    return svg;
  }
}

export const defaultSixteenthStampRenderer = new SixteenthStampRenderer();
