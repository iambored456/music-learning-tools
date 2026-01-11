// (file path: src/core/actions.ts)

import { appState } from '../state/appState.ts';
import type { RingName } from '../types.ts';
import { normAngle } from './math.ts';
import { StateTracker } from '../utils/StateTracker.ts';

/**
 * @param {('pitchClass'|'degree'|'chromatic'|'highlightPosition')} ringKey
 * @param {number} angle
 */
export function setRingAngle(ringKey: RingName, angle: number) {
  if (appState.rings.hasOwnProperty(ringKey)) {
    const normalizedAngle = normAngle(angle);
    appState.rings[ringKey] = normalizedAngle;
    StateTracker.markDirty(appState);
  }
}

/**
 * Co-rotates all rings. In vertical mode, the visual movement of the chromatic
 * ring is separated from the functional movement of the other rings.
 * @param {object} startAngles - An object with the starting angles of all rings.
 * @param {number} functionalDelta - The delta for the wheel and other belts (can be inverted).
 * @param {number} visualDelta - The delta for the chromatic belt's visual movement (always direct).
 */
export function rotateCoupledRings(
  startAngles: { startPitchClass: number; startDegree: number; startChrom: number; startHighlight: number; },
  functionalDelta: number,
  visualDelta?: number
) {
  // Use the visualDelta for the chromatic ring to match the user's gesture.
  // If visualDelta is not provided, default to functionalDelta for horizontal mode.
  const chromDelta = visualDelta ?? functionalDelta;
  appState.rings.chromatic = normAngle(startAngles.startChrom + chromDelta);

  // Use the functionalDelta for all other rings to get the correct wheel rotation.
  appState.rings.pitchClass = normAngle(startAngles.startPitchClass + functionalDelta);
  appState.rings.degree = normAngle(startAngles.startDegree + functionalDelta);
  appState.rings.highlightPosition = normAngle(startAngles.startHighlight + functionalDelta);

  StateTracker.markDirty(appState);
}
