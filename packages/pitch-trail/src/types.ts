/**
 * Pitch Trail Types
 *
 * Type definitions for the pitch trail renderer.
 */

import type { RGB } from '@mlt/pitch-data';

/**
 * Raw pitch detection data from audio input.
 */
export interface PitchPoint {
  /** Frequency in Hz */
  frequency: number;
  /** MIDI note number (can be fractional for microtonal accuracy) */
  midi: number;
  /** Timestamp from performance.now() */
  time: number;
  /** Detection confidence (0-1) */
  clarity: number;
}

/**
 * Transformed point ready for canvas rendering.
 */
export interface RenderablePoint {
  /** X coordinate on canvas */
  x: number;
  /** Y coordinate on canvas */
  y: number;
  /** Detection confidence (0-1) */
  clarity: number;
  /** RGB color array */
  color: RGB;
}

/**
 * MIDI range for Y-axis mapping.
 */
export interface MidiRange {
  minMidi: number;
  maxMidi: number;
}

/**
 * Configuration options for the pitch trail renderer.
 */
export interface PitchTrailConfig {
  /** Time window in milliseconds (default: 4000) */
  timeWindow?: number;

  /** Distance threshold in pixels for connecting points (default: 35) */
  proximityThreshold?: number;

  /** Maximum connections per point (default: 3) */
  maxConnections?: number;

  /** Radius of pitch point circles (default: 9.5) */
  pointRadius?: number;

  /** Width of connection lines (default: 2.5) */
  lineWidth?: number;

  /** Color of connection lines (default: 'rgba(0,0,0,0.4)') */
  lineColor?: string;

  /** Maximum opacity for points based on clarity (default: 0.9) */
  maxOpacity?: number;

  /** Tonic pitch class for color rotation (0-11, default: 0 for C) */
  tonicPitchClass?: number;
}

/**
 * Required version of PitchTrailConfig with all properties defined.
 */
export type RequiredPitchTrailConfig = Required<PitchTrailConfig>;

/**
 * Viewport configuration for coordinate mapping.
 */
export interface PitchTrailViewport {
  /** Canvas width in pixels */
  width: number;

  /** Canvas height in pixels */
  height: number;

  /** Left boundary of plot area (default: 0) */
  plotAreaLeft?: number;

  /** Right boundary of plot area (default: width) */
  plotAreaRight?: number;

  /** MIDI range for Y-axis scaling */
  midiRange: MidiRange;

  /** Current time reference from performance.now() */
  currentTime: number;
}