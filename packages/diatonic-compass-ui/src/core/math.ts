import { TAU, ANGLE_STEP } from './constants.ts';

export const INV_ANGLE_STEP = 1/ANGLE_STEP;

export const normAngle = (a: number) => ((a % TAU) + TAU) % TAU;

export function angleDiff(from: number, to: number) {
  const d = normAngle(to) - normAngle(from);
  if (d > Math.PI) return d - TAU;
  if (d < -Math.PI) return d + TAU;
  return d;
}

export const easeInOutQuad = (t: number) => (t<.5 ? 2*t*t : -1+(4-2*t)*t);

export const indexAtTop = (rot: number) => ((Math.round(-normAngle(rot)*INV_ANGLE_STEP)%12)+12)%12;

