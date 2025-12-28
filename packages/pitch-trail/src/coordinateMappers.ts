/**
 * Coordinate Mapping Utilities
 *
 * Functions for transforming pitch data to canvas coordinates.
 */

import { getInterpolatedPitchColor } from '@mlt/pitch-data';
import type {
  PitchPoint,
  RenderablePoint,
  RequiredPitchTrailConfig,
  PitchTrailViewport,
} from './types.js';

/**
 * Map time to X coordinate.
 * Points scroll from right (current) to left (older).
 *
 * @param pointTime - The timestamp of the pitch point
 * @param currentTime - The current time reference
 * @param timeWindow - Duration in milliseconds to display
 * @param plotAreaLeft - Left boundary of the plot area
 * @param plotAreaWidth - Width of the plot area
 * @returns X coordinate in pixels
 */
export function timeToX(
  pointTime: number,
  currentTime: number,
  timeWindow: number,
  plotAreaLeft: number,
  plotAreaWidth: number
): number {
  const age = currentTime - pointTime;
  const normalizedPosition = 1 - age / timeWindow;
  return plotAreaLeft + normalizedPosition * plotAreaWidth;
}

/**
 * Map MIDI value to Y coordinate.
 * Higher pitches appear at top (lower Y), lower pitches at bottom (higher Y).
 *
 * @param midiValue - MIDI note number (can be fractional)
 * @param minMidi - Minimum MIDI value in the range
 * @param maxMidi - Maximum MIDI value in the range
 * @param canvasHeight - Height of the canvas in pixels
 * @returns Y coordinate in pixels
 */
export function midiToY(
  midiValue: number,
  minMidi: number,
  maxMidi: number,
  canvasHeight: number
): number {
  if (maxMidi === minMidi) return canvasHeight / 2;
  const normalized = (midiValue - minMidi) / (maxMidi - minMidi);
  return canvasHeight - normalized * canvasHeight;
}

/**
 * Transform raw pitch history to renderable points.
 *
 * @param history - Array of raw pitch points from detector
 * @param viewport - Viewport configuration for coordinate mapping
 * @param config - Renderer configuration
 * @returns Array of points ready for canvas rendering
 */
export function transformPointsToRenderSpace(
  history: PitchPoint[],
  viewport: PitchTrailViewport,
  config: RequiredPitchTrailConfig
): RenderablePoint[] {
  const plotAreaLeft = viewport.plotAreaLeft ?? 0;
  const plotAreaRight = viewport.plotAreaRight ?? viewport.width;
  const plotAreaWidth = plotAreaRight - plotAreaLeft;

  return history
    .filter((p) => p.midi > 0)
    .map((point) => ({
      x: timeToX(
        point.time,
        viewport.currentTime,
        config.timeWindow,
        plotAreaLeft,
        plotAreaWidth
      ),
      y: midiToY(
        point.midi,
        viewport.midiRange.minMidi,
        viewport.midiRange.maxMidi,
        viewport.height
      ),
      clarity: point.clarity,
      color: getInterpolatedPitchColor(point.midi, config.tonicPitchClass),
    }))
    .filter((p) => p.x >= plotAreaLeft && p.x <= plotAreaRight);
}
