import { ANGLE_STEP, mod12, wheelPitchClasses, type WheelOrder } from '@mlt/compass-core';

export const FREEPLAY_WHEEL_INNER_RADIUS = 140;
export const FREEPLAY_WHEEL_OUTER_RADIUS = 233;

/** Coordinates are in the wheel's centered SVG viewBox, independent of screen size. */
export function freeplayWheelPosition(x: number, y: number, order: WheelOrder): { degree: number; index: number } | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const radius = Math.hypot(x, y);
  if (radius < FREEPLAY_WHEEL_INNER_RADIUS || radius > FREEPLAY_WHEEL_OUTER_RADIUS) return null;
  const index = mod12(Math.floor((Math.atan2(y, x) + Math.PI / 2 + ANGLE_STEP / 2) / ANGLE_STEP));
  return { index, degree: wheelPitchClasses(order)[index] };
}

/** Cross the top seam along the shorter arc; an interrupted drag has no octave carry. */
export function freeplayDragOctave(previousIndex: number | null, nextIndex: number, octave: number): number {
  const delta = previousIndex === null ? 0 : nextIndex - previousIndex;
  return Math.min(6, Math.max(3, octave + (delta < -6 ? 1 : delta > 6 ? -1 : 0)));
}
