/**
 * @mlt/rhythm-core - Default Configuration Constants
 *
 * All timing values are in milliseconds unless otherwise specified.
 */

import type {
  LatencyOffsets,
  ConductorConfig,
  SchedulerConfig,
  ChartAdapterConfig,
  BeatWindowConfig,
  JudgeConfig,
  GateConfig,
  RefereeConfig,
} from './types.js';

// ============================================================================
// Latency Defaults
// ============================================================================

export const DEFAULT_LATENCY_OFFSETS: LatencyOffsets = {
  audioOffsetMs: 0,
  visualOffsetMs: 0,
  inputOffsetMs: 0,
};

// ============================================================================
// Conductor Defaults
// ============================================================================

export const DEFAULT_CONDUCTOR_CONFIG: ConductorConfig = {
  initialTempo: 90,
  mode: 'playhead-led',
  offsets: { ...DEFAULT_LATENCY_OFFSETS },
};

// ============================================================================
// Scheduler Defaults
// ============================================================================

/**
 * Default lookahead of ~333ms (one beat at 90 BPM).
 * This ensures events are scheduled before they're needed.
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  lookaheadMs: 333,
  tickIntervalMs: 25,
};

// ============================================================================
// Chart Adapter Defaults
// ============================================================================

export const DEFAULT_CHART_ADAPTER_CONFIG: ChartAdapterConfig = {
  tempo: 90,
  microbeatsPerMacrobeat: 2,
};

// ============================================================================
// Beat Window Defaults
// ============================================================================

/**
 * ±80ms window around each beat for timing judgment.
 * This is a standard rhythm game timing window.
 */
export const DEFAULT_BEAT_WINDOW_CONFIG: BeatWindowConfig = {
  earlyMarginMs: 80,
  lateMarginMs: 80,
};

// ============================================================================
// Judge Defaults
// ============================================================================

/**
 * Pitch tolerance defaults:
 * - 50 cents for normal notes (quarter notes, eighth notes, long notes)
 * - 75 cents for short notes (16ths, triplets) - looser as requested
 */
export const DEFAULT_JUDGE_CONFIG: JudgeConfig = {
  defaultToleranceCents: 50,
  shortNoteToleranceCents: 75,
  onsetWindowMs: 80,
  releaseWindowMs: 80,
  minClarityThreshold: 0.5,
};

// ============================================================================
// Gate Defaults
// ============================================================================

/**
 * Grace period of 500ms before gate engages.
 * This provides smoother UX by allowing brief inaccuracies.
 */
export const DEFAULT_GATE_CONFIG: GateConfig = {
  gracePeriodMs: 500,
  enabled: false, // Disabled by default, enabled for lessons
};

// ============================================================================
// Combined Referee Defaults
// ============================================================================

export const DEFAULT_REFEREE_CONFIG: RefereeConfig = {
  conductor: { ...DEFAULT_CONDUCTOR_CONFIG },
  scheduler: { ...DEFAULT_SCHEDULER_CONFIG },
  chartAdapter: { ...DEFAULT_CHART_ADAPTER_CONFIG },
  beatWindow: { ...DEFAULT_BEAT_WINDOW_CONFIG },
  judge: { ...DEFAULT_JUDGE_CONFIG },
  gate: { ...DEFAULT_GATE_CONFIG },
};

// ============================================================================
// Timing Constants
// ============================================================================

/**
 * Cents per semitone (standard music theory).
 */
export const CENTS_PER_SEMITONE = 100;

/**
 * Microbeats per beat (standard for this system).
 * Each beat contains 2 microbeats (eighth notes).
 */
export const MICROBEATS_PER_BEAT = 2;

/**
 * Calculate microbeat duration in milliseconds from tempo.
 *
 * @param tempo - Tempo in BPM
 * @returns Duration of one microbeat in ms
 */
export function getMicrobeatDurationMs(tempo: number): number {
  // At tempo BPM, one beat = 60000/tempo ms
  // One microbeat = beat / 2
  return 60000 / (tempo * MICROBEATS_PER_BEAT);
}

/**
 * Calculate beat duration in milliseconds from tempo.
 *
 * @param tempo - Tempo in BPM
 * @returns Duration of one beat in ms
 */
export function getBeatDurationMs(tempo: number): number {
  return 60000 / tempo;
}

/**
 * Default lookahead in beats (for scheduler).
 * One beat ahead is typically sufficient.
 */
export const DEFAULT_LOOKAHEAD_BEATS = 1;

/**
 * Calculate lookahead in ms from tempo.
 *
 * @param tempo - Tempo in BPM
 * @param beats - Number of beats to look ahead
 * @returns Lookahead in ms
 */
export function getLookaheadMs(tempo: number, beats: number = DEFAULT_LOOKAHEAD_BEATS): number {
  return getBeatDurationMs(tempo) * beats;
}
