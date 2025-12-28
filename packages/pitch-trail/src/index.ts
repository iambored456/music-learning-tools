/**
 * @mlt/pitch-trail
 *
 * Pitch trail renderer for real-time pitch visualization in Music Learning Tools.
 * Provides a canvas-based renderer that draws connected, colored points
 * representing detected pitches over time.
 *
 * @example
 * ```typescript
 * import { PitchTrailRenderer } from '@mlt/pitch-trail';
 *
 * const renderer = new PitchTrailRenderer();
 *
 * function animate() {
 *   renderer.render(ctx, pitchHistory, {
 *     width: canvas.width,
 *     height: canvas.height,
 *     midiRange: { minMidi: 48, maxMidi: 72 },
 *     currentTime: performance.now()
 *   });
 *   requestAnimationFrame(animate);
 * }
 * ```
 */

// Core renderer
export { PitchTrailRenderer } from './PitchTrailRenderer.js';

// Types
export type {
  PitchPoint,
  RenderablePoint,
  MidiRange,
  PitchTrailConfig,
  RequiredPitchTrailConfig,
  PitchTrailViewport,
} from './types.js';

// Utilities (for advanced use cases)
export {
  timeToX,
  midiToY,
  transformPointsToRenderSpace,
} from './coordinateMappers.js';
export { findConnections, type Connection } from './proximityGraph.js';
export { DEFAULT_CONFIG } from './constants.js';

// Re-export color utilities from pitch-data for convenience
export {
  getInterpolatedPitchColor,
  getInterpolatedPitchColorHex,
  getPitchColorWithClarity,
  getPitchClassColor,
  getTonicPitchClass,
  PITCH_CLASS_COLORS,
  hexToRgb,
  rgbToHex,
  interpolateRgb,
  type RGB,
} from '@mlt/pitch-data';
