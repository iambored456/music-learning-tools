import { getAnimationEffectsManager as getRuntimeAnimationEffectsManager } from '@services/runtimeGlobals.ts';
import type { AnimatableNote } from '@mlt/types';

interface StampShapeEffectOptions {
  cellWidth: number;
  cellHeight: number;
  tempo?: number;
}

interface DelayEcho {
  delay: number;
  opacity: number;
  scale: number;
  active: boolean;
}

interface StampAnimationEffectsManager {
  shouldAnimateNote(note: AnimatableNote): boolean;
  getVibratoYOffset(color?: string): number;
  hasDelayEffect(color: string): boolean;
  getDelayEffects(color: string): DelayEcho[];
}

const getAnimationEffectsManager = (): StampAnimationEffectsManager | undefined => {
  return getRuntimeAnimationEffectsManager() as StampAnimationEffectsManager | undefined;
};

function getDelayPixelOffset(delayMs: number, options: StampShapeEffectOptions): number {
  const tempo = options.tempo || 90;
  const microbeatMs = ((60 / tempo) / 2) * 1000;
  const pxPerMs = options.cellWidth / microbeatMs;
  return delayMs * pxPerMs;
}

function getDelayEffects(note: AnimatableNote): DelayEcho[] {
  const animationManager = getAnimationEffectsManager();
  if (!note.color || !animationManager?.hasDelayEffect?.(note.color)) {
    return [];
  }

  return animationManager.getDelayEffects?.(note.color) ?? [];
}

export function getStampShapeVibratoYOffset(
  note: AnimatableNote,
  options: StampShapeEffectOptions
): number {
  const animationManager = getAnimationEffectsManager();
  if (!animationManager?.shouldAnimateNote?.(note)) {
    return 0;
  }

  return (animationManager.getVibratoYOffset?.(note.color) ?? 0) * options.cellHeight;
}

export function drawStampShapeDelayEllipse(
  ctx: CanvasRenderingContext2D,
  note: AnimatableNote,
  options: StampShapeEffectOptions,
  centerX: number,
  centerY: number,
  rx: number,
  ry: number
): void {
  getDelayEffects(note).forEach(echo => {
    const echoX = centerX + getDelayPixelOffset(echo.delay, options);
    const echoRx = rx * echo.scale;
    const echoRy = ry * echo.scale;

    ctx.save();
    ctx.globalAlpha = echo.opacity;
    ctx.beginPath();
    ctx.ellipse(echoX, centerY, echoRx, echoRy, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = note.color;
    ctx.lineWidth = Math.max(0.5, echoRx * 0.1);
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.restore();
  });
}

export function drawStampShapeDelayPath(
  ctx: CanvasRenderingContext2D,
  note: AnimatableNote,
  options: StampShapeEffectOptions,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  createPath: (cx: number, cy: number, width: number, height: number) => Path2D
): void {
  getDelayEffects(note).forEach(echo => {
    const echoX = centerX + getDelayPixelOffset(echo.delay, options);
    const echoPath = createPath(echoX, centerY, width * echo.scale, height * echo.scale);
    const strokeBasis = Math.max(1, Math.min(Math.abs(width), Math.abs(height)));

    ctx.save();
    ctx.globalAlpha = echo.opacity;
    ctx.strokeStyle = note.color;
    ctx.lineWidth = Math.max(0.5, strokeBasis * 0.1);
    ctx.setLineDash([2, 2]);
    ctx.stroke(echoPath);
    ctx.restore();
  });
}
