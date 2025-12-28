/**
 * @mlt/rhythm-core
 *
 * Framework-agnostic timing engine for rhythm-game-style applications.
 *
 * Core components:
 * - Conductor: Authoritative time source
 * - Scheduler: Event scheduling with lookahead
 * - ChartAdapter: Snapshot → timed events conversion
 * - BeatWindow: Beat event emission
 * - Judge: Multi-channel pitch judgment
 * - PitchAccuracyGate: Playhead gating for lessons
 * - Referee: Session orchestrator
 */
// ============================================================================
// Main Orchestrator (Primary API)
// ============================================================================
export { createReferee } from './referee/Referee.js';
// ============================================================================
// Individual Components (Advanced Use)
// ============================================================================
export { createConductor } from './conductor/Conductor.js';
export { createPlayheadTimeSource } from './conductor/PlayheadTimeSource.js';
export { createAudioTimeSource } from './conductor/AudioTimeSource.js';
export { createScheduler } from './scheduler/Scheduler.js';
export { createChartAdapter } from './chart/ChartAdapter.js';
export { createBeatWindow } from './beat/BeatWindow.js';
export { createJudge } from './judge/Judge.js';
export { createPitchMatcher } from './judge/PitchMatcher.js';
export { createPitchAccuracyGate } from './gate/PitchAccuracyGate.js';
// Type helpers
export { asSessionTimeMs, asAudioContextTime, asScheduledEventId } from './types.js';
// ============================================================================
// Constants
// ============================================================================
export { DEFAULT_LATENCY_OFFSETS, DEFAULT_CONDUCTOR_CONFIG, DEFAULT_SCHEDULER_CONFIG, DEFAULT_CHART_ADAPTER_CONFIG, DEFAULT_BEAT_WINDOW_CONFIG, DEFAULT_JUDGE_CONFIG, DEFAULT_GATE_CONFIG, DEFAULT_REFEREE_CONFIG, CENTS_PER_SEMITONE, MICROBEATS_PER_BEAT, DEFAULT_LOOKAHEAD_BEATS, getMicrobeatDurationMs, getBeatDurationMs, getLookaheadMs, } from './constants.js';
