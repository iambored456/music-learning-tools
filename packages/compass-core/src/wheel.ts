import { ANGLE_STEP } from './music.ts';

export type WheelOrder = 'chromatic' | 'fifths';
export const mod12 = (value: number) => ((value % 12) + 12) % 12;

/** Both wheels use pitch classes as identities, independent of their display order. */
export function wheelPitchClasses(order: WheelOrder): number[] {
  return Array.from({ length: 12 }, (_, i) => mod12(i * (order === 'fifths' ? 7 : 1)));
}

export function wheelPoint(radius: number, angle: number, cx = 0, cy = 0) {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

export function wheelSegmentAngles(angle: number) {
  return { start: angle - ANGLE_STEP / 2, end: angle + ANGLE_STEP / 2 };
}

/** Canvas adapter used by Diatonic Compass. */
export function traceWheelSegment(ctx: CanvasRenderingContext2D, cx: number, cy: number, inner: number, outer: number, angle: number) {
  const { start, end } = wheelSegmentAngles(angle);
  ctx.beginPath();
  ctx.arc(cx, cy, outer, start, end);
  ctx.arc(cx, cy, inner, end, start, true);
  ctx.closePath();
}

/** SVG adapter used by the trainer's keyboard-accessible answer wheel. */
export function wheelSegmentPath(inner: number, outer: number, angle: number): string {
  const { start, end } = wheelSegmentAngles(angle);
  const a = wheelPoint(outer, start), b = wheelPoint(outer, end);
  const c = wheelPoint(inner, end), d = wheelPoint(inner, start);
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`;
}
