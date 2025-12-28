/**
 * Pitch Trail Constants
 *
 * Default configuration values extracted from amateur-singing-trainer's PitchTrace.js
 */

import type { RequiredPitchTrailConfig } from './types.js';

/**
 * Default configuration for the pitch trail renderer.
 * These values match the original PitchTrace.js implementation.
 */
export const DEFAULT_CONFIG: RequiredPitchTrailConfig = {
  /** 4-second time window for scrolling display */
  timeWindow: 4000,

  /** Points within 35 pixels are connected */
  proximityThreshold: 35,

  /** Each point can have up to 3 connections */
  maxConnections: 3,

  /** Circle radius for pitch points */
  pointRadius: 9.5,

  /** Width of connection lines */
  lineWidth: 2.5,

  /** Semi-transparent black for connection lines */
  lineColor: 'rgba(0,0,0,0.4)',

  /** Maximum opacity based on clarity */
  maxOpacity: 0.9,

  /** Default tonic is C (pitch class 0) */
  tonicPitchClass: 0,
};
