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

export { createReferee, type IReferee } from './referee/Referee.js';

// ============================================================================
// Individual Components (Advanced Use)
// ============================================================================

export { createConductor, type IConductor } from './conductor/Conductor.js';
export { createPlayheadTimeSource, type PlayheadTimeSource } from './conductor/PlayheadTimeSource.js';
export { createAudioTimeSource, type AudioTimeSourceInstance } from './conductor/AudioTimeSource.js';

export { createScheduler, type IScheduler, type ScheduledEventInput } from './scheduler/Scheduler.js';

export { createChartAdapter, type IChartAdapter } from './chart/ChartAdapter.js';

export { createBeatWindow, type IBeatWindow, type BeatWindowState } from './beat/BeatWindow.js';

export { createJudge, type IJudge } from './judge/Judge.js';
export { createPitchMatcher, type IPitchMatcher, type PitchMatchResult } from './judge/PitchMatcher.js';

export { createPitchAccuracyGate, type IPitchAccuracyGate, type IGateCheckResult } from './gate/PitchAccuracyGate.js';

// ============================================================================
// Types
// ============================================================================

export type {
  // Branded types
  SessionTimeMs,
  AudioContextTime,
  ScheduledEventId,

  // Latency
  LatencyOffsets,

  // Conductor
  ConductorMode,
  ConductorState,
  ConductorConfig,
  ConductorStateCallback,

  // Scheduler
  ScheduledEventType,
  ScheduledEvent,
  SchedulerConfig,

  // Chart
  TimedNote,
  TimedBeat,
  TimedTonicIndicator,
  ChartAdapterConfig,
  ChartData,

  // Beat
  BeatWindowConfig,
  BeatEventType,
  BeatEvent,
  BeatEventCallback,

  // Judge
  JudgeConfig,
  PitchSample,
  JudgmentResult,
  PitchFeedback,
  JudgmentCallback,

  // Gate
  GateConfig,
  GateState,
  GateStateCallback,

  // Referee
  RefereeConfig,
  SessionPhase,
  SessionState,
  SessionStateCallback,

  // Utilities
  Unsubscribe,
  AudioTimeSource,
} from './types.js';

// Type helpers
export { asSessionTimeMs, asAudioContextTime, asScheduledEventId } from './types.js';

// ============================================================================
// Constants
// ============================================================================

export {
  DEFAULT_LATENCY_OFFSETS,
  DEFAULT_CONDUCTOR_CONFIG,
  DEFAULT_SCHEDULER_CONFIG,
  DEFAULT_CHART_ADAPTER_CONFIG,
  DEFAULT_BEAT_WINDOW_CONFIG,
  DEFAULT_JUDGE_CONFIG,
  DEFAULT_GATE_CONFIG,
  DEFAULT_REFEREE_CONFIG,
  CENTS_PER_SEMITONE,
  MICROBEATS_PER_BEAT,
  DEFAULT_LOOKAHEAD_BEATS,
  getMicrobeatDurationMs,
  getBeatDurationMs,
  getLookaheadMs,
} from './constants.js';
