export interface PulsingPlayheadStyle {
  hz: number;
  minAlpha: number;
  maxAlpha: number;
  maxExpandPx: number;
  colorRgb: string;
}

export const DEFAULT_PULSING_PLAYHEAD_STYLE: PulsingPlayheadStyle = {
  // NOTE: Despite the name, this is now a constant (non-pulsing) highlight.
  hz: 0,
  minAlpha: 0.2,
  maxAlpha: 0.2,
  maxExpandPx: 0,
  colorRgb: 'rgb(255, 235, 0)'
};

export function drawPulsingColumnHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  nowMs: number,
  style: PulsingPlayheadStyle = DEFAULT_PULSING_PLAYHEAD_STYLE
): void {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return;
  }
  if (width <= 0 || height <= 0) {
    return;
  }

  const t = nowMs / 1000;
  const pulse = style.hz > 0 ? (0.5 + 0.5 * Math.sin(t * (2 * Math.PI) * style.hz)) : 1;
  const alpha = style.minAlpha + (style.maxAlpha - style.minAlpha) * pulse;
  const expandPx = Math.min(style.maxExpandPx, Math.max(0, width * 0.1)) * pulse;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style.colorRgb;
  ctx.fillRect(x - expandPx / 2, y, width + expandPx, height);
  ctx.restore();
}
