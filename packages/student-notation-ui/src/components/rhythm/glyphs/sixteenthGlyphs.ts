import { createSixteenthHexPath } from '@mlt/notation-glyphs';

// js/components/rhythm/glyphs/diamond.ts

/**
 * Draw a diamond shape on a canvas context.
 */
export function drawDiamond(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, color: string): void {
  const half = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - half);
  ctx.lineTo(centerX + half, centerY);
  ctx.lineTo(centerX, centerY + half);
  ctx.lineTo(centerX - half, centerY);
  ctx.closePath();
  ctx.fill();
}

/**
 * Generate an SVG path string for an elongated hexagonal diamond shape.
 * Used for 16th note diamond glyphs in stamp rendering.
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param w - Width of the diamond
 * @param totalH - Total height of the diamond
 * @returns SVG path string
 */
export function diamondPath(cx: number, cy: number, w: number, totalH: number): string {
  return createSixteenthHexPath(cx, cy, w, totalH);
}
