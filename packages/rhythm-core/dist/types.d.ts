/**
 * @mlt/rhythm-core - Type Definitions
 *
 * Framework-agnostic types for timing, scheduling, chart interpretation,
 * pitch judgment, and session orchestration.
 */
/**
 * Session time in milliseconds from session start.
 * This is the canonical time unit for all timing operations.
 */
export type SessionTimeMs = number & {
    readonly __brand: 'SessionTimeMs';
};
/**
 * Audio context time in seconds.
 * Used when syncing with Web Audio API.
 */
export type AudioContextTime = number & {
    readonly __brand: 'AudioContextTime';
};
/**
 * Scheduled event identifier.
 */
export type ScheduledEventId = string & {
    readonly __brand: 'ScheduledEventId';
};
/** Create a SessionTimeMs from a number */
export declare function asSessionTimeMs(ms: number): SessionTimeMs;
/** Create an AudioContextTime from a number */
export declare function asAudioContextTime(seconds: number): AudioContextTime;
/** Create a ScheduledEventId from a string */
export declare function asScheduledEventId(id: string): ScheduledEventId;
/**
 * Offset configuration for latency compensation.
 * All values are in milliseconds.
 */
export interface LatencyOffsets {
    /** Offset for audio output scheduling (positive = schedule earlier) */
    audioOffsetMs: number;
    /** Offset for visual rendering (positive = render earlier) */
    visualOffsetMs: number;
    /** Offset for microphone input (positive = input is delayed) */
    inputOffsetMs: number;
}
/**
 * Time source mode for the conductor.
 * - 'playhead-led': Time advances based on BPM from session start
 * - 'audio-led': Time follows audio playback (Tone.Transport or AudioContext)
 */
export type ConductorMode = 'playhead-led' | 'audio-led';
/**
 * Current state of the conductor.
 */
export interface ConductorState {
    /** Current session time in milliseconds */
    currentTimeMs: SessionTimeMs;
    /** Whether the conductor is actively running */
    isRunning: boolean;
    /** Whether playback is paused (session still active) */
    isPaused: boolean;
    /** Current tempo in beats per minute */
    tempo: number;
    /** Current operating mode */
    mode: ConductorMode;
}
/**
 * Configuration for creating a conductor.
 */
export interface ConductorConfig {
    /** Initial tempo in BPM (default: 90) */
    initialTempo: number;
    /** Operating mode (default: 'playhead-led') */
    mode: ConductorMode;
    /** Latency offset configuration */
    offsets: LatencyOffsets;
}
/**
 * Callback type for conductor state changes.
 */
export type ConductorStateCallback = (state: ConductorState) => void;
/**
 * Type of scheduled event.
 */
export type ScheduledEventType = 'accompaniment' | 'gate' | 'beat' | 'custom';
/**
 * A scheduled event in the system.
 */
export interface ScheduledEvent {
    /** Unique identifier */
    id: ScheduledEventId;
    /** When to fire (session time in ms) */
    timeMs: SessionTimeMs;
    /** Event type for categorization */
    type: ScheduledEventType;
    /** Callback to execute when event fires */
    callback: () => void;
    /** Whether this event has been fired */
    fired: boolean;
    /** Whether this event was cancelled */
    cancelled: boolean;
}
/**
 * Configuration for the scheduler.
 */
export interface SchedulerConfig {
    /** How far ahead to look for events in ms (default: one beat at current tempo) */
    lookaheadMs: number;
    /** How often to check for events in ms (default: 25) */
    tickIntervalMs: number;
}
/**
 * A note converted from the pitchGrid to absolute time.
 */
export interface TimedNote {
    /** Unique identifier */
    id: string;
    /** MIDI pitch number (0-127) */
    midiPitch: number;
    /** Start time in session milliseconds */
    startTimeMs: SessionTimeMs;
    /** End time in session milliseconds */
    endTimeMs: SessionTimeMs;
    /** Duration in milliseconds */
    durationMs: number;
    /** Voice/color identifier */
    voiceId: string;
    /** Display color (hex) */
    color: string;
    /** Note shape for rendering */
    shape: 'circle' | 'oval' | 'diamond';
    /**
     * Whether this is a "short note" (16th or triplet).
     * Short notes receive looser pitch tolerance.
     */
    isShortNote: boolean;
    /** Original pitch name from snapshot (e.g., "C4", "Bb3") */
    pitchName: string;
}
/**
 * A beat marker converted to absolute time.
 */
export interface TimedBeat {
    /** Beat index (0-based) */
    index: number;
    /** Time in session milliseconds */
    timeMs: SessionTimeMs;
    /** Whether this is a macrobeat (grouping boundary) */
    isMacrobeat: boolean;
    /** Whether this is a measure start */
    isMeasureStart: boolean;
    /** Macrobeat grouping (2 or 3 microbeats) at this position */
    grouping: 2 | 3;
    /** Visual style for rendering */
    boundaryStyle: 'dashed' | 'solid' | 'anacrusis' | 'none';
}
/**
 * Tonic indicator position (does not consume time).
 */
export interface TimedTonicIndicator {
    /** Position in session time (where it appears visually) */
    displayTimeMs: SessionTimeMs;
    /** Tonic degree (1-7) */
    tonicNumber: number;
    /** MIDI pitch of the tonic */
    midiPitch: number;
}
/**
 * Configuration for the chart adapter.
 */
export interface ChartAdapterConfig {
    /** Base tempo in BPM */
    tempo: number;
    /** Microbeats per macrobeat (usually 2) */
    microbeatsPerMacrobeat: number;
}
/**
 * Result of loading a chart.
 */
export interface ChartData {
    /** All notes converted to timed events */
    notes: TimedNote[];
    /** All beat markers */
    beats: TimedBeat[];
    /** Tonic indicators (if any) */
    tonicIndicators: TimedTonicIndicator[];
    /** Total duration in milliseconds */
    totalDurationMs: number;
    /** Voice IDs present in the chart */
    voiceIds: string[];
    /** Tempo from the snapshot */
    tempo: number;
    /** Minimum MIDI pitch in the chart */
    minMidiPitch: number;
    /** Maximum MIDI pitch in the chart */
    maxMidiPitch: number;
}
/**
 * Configuration for beat window timing.
 */
export interface BeatWindowConfig {
    /** Margin before beat center in ms (default: 80) */
    earlyMarginMs: number;
    /** Margin after beat center in ms (default: 80) */
    lateMarginMs: number;
}
/**
 * Beat event type.
 */
export type BeatEventType = 'microbeat' | 'macrobeat' | 'measure';
/**
 * A beat event emitted by the beat window.
 */
export interface BeatEvent {
    /** Type of beat */
    type: BeatEventType;
    /** Beat index */
    index: number;
    /** Exact time of the beat center */
    timeMs: SessionTimeMs;
    /** Whether we're currently in the early window */
    inEarlyWindow: boolean;
    /** Whether we're currently in the late window */
    inLateWindow: boolean;
}
/**
 * Callback type for beat events.
 */
export type BeatEventCallback = (event: BeatEvent) => void;
/**
 * Configuration for the pitch judge.
 */
export interface JudgeConfig {
    /** Default pitch tolerance in cents (default: 50) */
    defaultToleranceCents: number;
    /** Looser tolerance for short notes in cents (default: 75) */
    shortNoteToleranceCents: number;
    /** Onset timing window in ms (default: 80) */
    onsetWindowMs: number;
    /** Release timing window in ms (default: 80) */
    releaseWindowMs: number;
    /** Minimum clarity for a sample to count (default: 0.5) */
    minClarityThreshold: number;
}
/**
 * A single pitch sample from the microphone.
 */
export interface PitchSample {
    /** Session time when sample was taken */
    timeMs: SessionTimeMs;
    /** Detected MIDI pitch (fractional, e.g., 60.5 for C4 + 50 cents) */
    midiPitch: number;
    /** Detection clarity/confidence (0-1) */
    clarity: number;
    /** Whether voice was detected (vs silence/noise) */
    isVoiced: boolean;
}
/**
 * Result of judging a single note.
 * All channels are independent for research purposes.
 */
export interface JudgmentResult {
    /** Note being judged */
    noteId: string;
    /** Percentage of time pitch remained in tolerance during note window */
    continuousAccuracy: number;
    /** Was voice detected within onset window? */
    onsetVoiced: boolean;
    /** Was pitch in tolerance at onset? */
    onsetInTolerance: boolean;
    /** Combined onset success (voiced AND in tolerance) */
    onsetSuccess: boolean;
    /** Onset timing error in ms (negative = early, positive = late) */
    onsetTimingErrorMs: number;
    /** Was note sustained through to the end? */
    sustainedThrough: boolean;
    /** Did input stop within release window of note end? */
    releaseTimely: boolean;
    /** Combined release success */
    releaseSuccess: boolean;
    /** Release timing error in ms */
    releaseTimingErrorMs: number;
    /** Average pitch deviation in cents from target */
    averageDeviationCents: number;
    /** Total samples collected during note window */
    sampleCount: number;
    /** Samples that were in tolerance */
    inToleranceSampleCount: number;
    /** Samples that were voiced */
    voicedSampleCount: number;
}
/**
 * Real-time feedback about the current pitch relative to a target note.
 */
export interface PitchFeedback {
    /** Note being evaluated */
    noteId: string;
    /** Current deviation from target in cents */
    deviationCents: number;
    /** Whether currently in tolerance */
    isInTolerance: boolean;
    /** Running accuracy for this note so far */
    runningAccuracy: number;
}
/**
 * Callback type for judgment completion.
 */
export type JudgmentCallback = (result: JudgmentResult) => void;
/**
 * Configuration for the pitch accuracy gate.
 */
export interface GateConfig {
    /** Grace period before gate engages in ms (default: 500) */
    gracePeriodMs: number;
    /** Whether gate is enabled */
    enabled: boolean;
}
/**
 * Current state of the gate.
 */
export interface GateState {
    /** Whether gate is currently active (pausing playback) */
    isGated: boolean;
    /** When the inaccuracy streak started (null if accurate) */
    inaccuracyStartMs: SessionTimeMs | null;
    /** Current grace period remaining in ms */
    gracePeriodRemainingMs: number;
}
/**
 * Callback type for gate state changes.
 */
export type GateStateCallback = (state: GateState) => void;
/**
 * Session lifecycle phase.
 */
export type SessionPhase = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'gated' | 'completed';
/**
 * Complete session state.
 */
export interface SessionState {
    /** Current phase */
    phase: SessionPhase;
    /** Current session time in ms */
    currentTimeMs: SessionTimeMs;
    /** Elapsed time since session start in ms */
    elapsedTimeMs: number;
    /** Total duration of the chart in ms */
    totalDurationMs: number;
    /** Notes currently being judged (judgment line intersects) */
    activeNotes: TimedNote[];
    /** Notes coming up (visible but not yet active) */
    upcomingNotes: TimedNote[];
    /** Notes that have passed */
    passedNotes: TimedNote[];
    /** Completed judgment results */
    completedJudgments: JudgmentResult[];
    /** Current gate state */
    gateState: GateState;
    /** Whether any voice is being actively judged */
    isJudging: boolean;
}
/**
 * Configuration for the referee.
 */
export interface RefereeConfig {
    conductor: ConductorConfig;
    scheduler: SchedulerConfig;
    chartAdapter: ChartAdapterConfig;
    beatWindow: BeatWindowConfig;
    judge: JudgeConfig;
    gate: GateConfig;
}
/**
 * Callback type for session state changes.
 */
export type SessionStateCallback = (state: SessionState) => void;
/**
 * Function to unsubscribe from events.
 */
export type Unsubscribe = () => void;
/**
 * Interface for audio time sources (e.g., Tone.Transport).
 * This allows rhythm-core to remain agnostic of the specific audio library.
 */
export interface AudioTimeSource {
    /** Get current time in seconds */
    getCurrentTimeSeconds(): number;
    /** Whether the audio source is playing */
    isPlaying(): boolean;
    /** Optional: Subscribe to play/pause events */
    onStateChange?(callback: (isPlaying: boolean) => void): Unsubscribe;
}
//# sourceMappingURL=types.d.ts.map