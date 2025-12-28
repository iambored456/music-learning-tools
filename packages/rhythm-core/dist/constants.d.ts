/**
 * @mlt/rhythm-core - Default Configuration Constants
 *
 * All timing values are in milliseconds unless otherwise specified.
 */
import type { LatencyOffsets, ConductorConfig, SchedulerConfig, ChartAdapterConfig, BeatWindowConfig, JudgeConfig, GateConfig, RefereeConfig } from './types.js';
export declare const DEFAULT_LATENCY_OFFSETS: LatencyOffsets;
export declare const DEFAULT_CONDUCTOR_CONFIG: ConductorConfig;
/**
 * Default lookahead of ~333ms (one beat at 90 BPM).
 * This ensures events are scheduled before they're needed.
 */
export declare const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig;
export declare const DEFAULT_CHART_ADAPTER_CONFIG: ChartAdapterConfig;
/**
 * ±80ms window around each beat for timing judgment.
 * This is a standard rhythm game timing window.
 */
export declare const DEFAULT_BEAT_WINDOW_CONFIG: BeatWindowConfig;
/**
 * Pitch tolerance defaults:
 * - 50 cents for normal notes (quarter notes, eighth notes, long notes)
 * - 75 cents for short notes (16ths, triplets) - looser as requested
 */
export declare const DEFAULT_JUDGE_CONFIG: JudgeConfig;
/**
 * Grace period of 500ms before gate engages.
 * This provides smoother UX by allowing brief inaccuracies.
 */
export declare const DEFAULT_GATE_CONFIG: GateConfig;
export declare const DEFAULT_REFEREE_CONFIG: RefereeConfig;
/**
 * Cents per semitone (standard music theory).
 */
export declare const CENTS_PER_SEMITONE = 100;
/**
 * Microbeats per beat (standard for this system).
 * Each beat contains 2 microbeats (eighth notes).
 */
export declare const MICROBEATS_PER_BEAT = 2;
/**
 * Calculate microbeat duration in milliseconds from tempo.
 *
 * @param tempo - Tempo in BPM
 * @returns Duration of one microbeat in ms
 */
export declare function getMicrobeatDurationMs(tempo: number): number;
/**
 * Calculate beat duration in milliseconds from tempo.
 *
 * @param tempo - Tempo in BPM
 * @returns Duration of one beat in ms
 */
export declare function getBeatDurationMs(tempo: number): number;
/**
 * Default lookahead in beats (for scheduler).
 * One beat ahead is typically sufficient.
 */
export declare const DEFAULT_LOOKAHEAD_BEATS = 1;
/**
 * Calculate lookahead in ms from tempo.
 *
 * @param tempo - Tempo in BPM
 * @param beats - Number of beats to look ahead
 * @returns Lookahead in ms
 */
export declare function getLookaheadMs(tempo: number, beats?: number): number;
//# sourceMappingURL=constants.d.ts.map