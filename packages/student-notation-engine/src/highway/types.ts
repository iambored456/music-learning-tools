/**
 * Note Highway Module Types
 *
 * Type definitions for the Note Highway playback system where grids scroll
 * westward (right-to-left) while a static judgment line remains fixed.
 */

// ============================================================================
// Pitch Input Types
// ============================================================================

/**
 * A single pitch input sample from microphone or keyboard.
 */
export interface PitchSample {
  /** Timestamp in milliseconds */
  timeMs: number;
  /** MIDI note number (may be fractional for pitch accuracy) */
  midi: number;
  /** Detection confidence (0-1) for microphone input */
  clarity: number;
  /** Input source */
  source: 'microphone' | 'keyboard';
}

// ============================================================================
// Target Note Types
// ============================================================================

/**
 * A target note to display on the note highway.
 * Represents a note from the Student Notation score.
 */
export interface HighwayTargetNote {
  /** Unique identifier */
  id: string;
  /** MIDI note number */
  midi: number;
  /** Start time in milliseconds from playback start */
  startTimeMs: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Canvas-space start column index */
  startColumn: number;
  /** Canvas-space end column index */
  endColumn: number;
  /** Note color (timbre) */
  color: string;
  /** Note shape */
  shape: 'oval' | 'circle' | 'diamond';
  /** Global row index in full pitch gamut */
  globalRow: number;
  /** Performance tracking data (populated during playback) */
  performance?: NotePerformance;
}

/**
 * Performance data collected for a single note.
 */
export interface NotePerformance {
  /** Whether the note was successfully hit */
  hitStatus: 'hit' | 'miss';
  /** Onset timing accuracy in milliseconds (negative = early, positive = late) */
  onsetAccuracyMs: number;
  /** Release timing accuracy in milliseconds */
  releaseAccuracyMs: number;
  /** Average pitch accuracy in cents (0 = perfect, ±50 = within tolerance) */
  pitchAccuracyCents: number;
  /** Percentage of note duration with correct pitch (0-100) */
  pitchCoverage: number;
  /** All pitch samples collected during this note */
  pitchSamples: PitchSample[];
  /** Optional accuracy tier for display ('perfect' | 'good' | 'okay' | 'miss') */
  accuracyTier?: string;
}

// ============================================================================
// Feedback Collector Configuration
// ============================================================================

/**
 * Configuration for the feedback collector that analyzes performance.
 */
export interface FeedbackCollectorConfig {
  /** Maximum timing deviation for onset (ms) to count as "hit" */
  onsetToleranceMs: number;
  /** Maximum timing deviation for release (ms) */
  releaseToleranceMs: number;
  /** Maximum pitch deviation (cents) to count as correct pitch */
  pitchToleranceCents: number;
  /** Minimum percentage of note duration with correct pitch to count as "hit" */
  hitThreshold: number;
  /** Optional thresholds for accuracy tiers */
  accuracyTiers?: {
    perfect: { onsetMs: number; pitchCents: number; coverage: number };
    good: { onsetMs: number; pitchCents: number; coverage: number };
    okay: { onsetMs: number; pitchCents: number; coverage: number };
  };
}

/**
 * Instance returned by createFeedbackCollector().
 */
export interface FeedbackCollectorInstance {
  /** Start collecting feedback for a note */
  startNote(noteId: string, note: HighwayTargetNote): void;
  /** Record a pitch input sample */
  recordPitchSample(sample: PitchSample): void;
  /** End collection for a note and calculate performance */
  endNote(noteId: string): NotePerformance | null;
  /** Get current performance data for a note (before it ends) */
  getCurrentPerformance(noteId: string): Partial<NotePerformance> | null;
  /** Get all completed performances */
  getAllPerformances(): Map<string, NotePerformance>;
  /** Clear all collected data */
  reset(): void;
  /** Cleanup resources */
  dispose(): void;
}

// ============================================================================
// Note Highway Service Configuration
// ============================================================================

/**
 * Scroll speed mode for the highway.
 */
export type ScrollMode = 'constant-speed' | 'constant-density';

/**
 * Input source for user performance.
 */
export type InputSource = 'microphone' | 'keyboard';

/**
 * Configuration for the Note Highway service.
 */
export interface NoteHighwayConfig {
  // === Scroll Configuration ===
  /** Position of judgment line as fraction of viewport width (0-1), default 0.12 */
  judgmentLinePosition: number;
  /** Scroll speed in pixels per second, default 200 */
  pixelsPerSecond: number;
  /** Time window to display ahead of judgment line (ms), default 3000 */
  lookAheadMs: number;
  /** Scroll speed mode */
  scrollMode: ScrollMode;

  // === Onramp Configuration ===
  /** Number of beats to play before content starts, default 4 */
  leadInBeats: number;
  /** Whether to play metronome during lead-in, default true */
  playMetronomeDuringOnramp: boolean;

  // === Audio Configuration ===
  /** Whether to play target notes as audio guide, default true */
  playTargetNotes: boolean;
  /** Whether to play metronome during playback, default false */
  playMetronome: boolean;

  // === Input Configuration ===
  /** Enabled input sources */
  inputSources: InputSource[];

  // === Feedback Configuration ===
  /** Feedback collector configuration */
  feedbackConfig: FeedbackCollectorConfig;

  // === Callbacks ===
  /** State access callbacks */
  stateCallbacks: HighwayStateCallbacks;
  /** Event emission callbacks */
  eventCallbacks: HighwayEventCallbacks;
  /** Visual update callbacks (optional) */
  visualCallbacks?: HighwayVisualCallbacks;
  /** Logger (optional) */
  logger?: HighwayLogger;
}

// ============================================================================
// Note Highway State
// ============================================================================

/**
 * Internal state of the Note Highway service.
 */
export interface NoteHighwayState {
  /** Whether playback is active */
  isPlaying: boolean;
  /** Whether playback is paused */
  isPaused: boolean;
  /** Current time in milliseconds (can be negative during onramp) */
  currentTimeMs: number;
  /** Scroll offset in pixels from start */
  scrollOffset: number;
  /** Whether onramp (lead-in) has completed */
  onrampComplete: boolean;
  /** All target notes for the current piece */
  targetNotes: HighwayTargetNote[];
  /** Note IDs currently active (within judgment window) */
  activeNotes: Set<string>;
  /** Playback start time from performance.now() */
  startTime: number | null;
}

// ============================================================================
// Callback Interfaces
// ============================================================================

/**
 * Callbacks for accessing state data.
 * Allows the highway service to query state without direct dependencies.
 */
export interface HighwayStateCallbacks {
  /** Get current tempo in BPM */
  getTempo: () => number;
  /** Get cell width in pixels */
  getCellWidth: () => number;
  /** Get viewport width in pixels */
  getViewportWidth: () => number;
  /** Get time map (column index to time in seconds) */
  getTimeMap?: () => number[];
  /** Get column width for a specific column index */
  getColumnWidth?: (columnIndex: number) => number;
}

/**
 * Callbacks for emitting events.
 */
export interface HighwayEventCallbacks {
  /** Emit a generic event */
  emit: (event: string, data?: unknown) => void;
  /** Subscribe to an event */
  on?: (event: string, handler: (data?: unknown) => void) => void;
}

/**
 * Visual update callbacks for rendering.
 * All callbacks are optional to support headless operation.
 */
export interface HighwayVisualCallbacks {
  /** Clear the highway canvas */
  clearCanvas?: () => void;
  /** Draw the judgment line at specified X position */
  drawJudgmentLine?: (x: number, height: number) => void;
  /** Trigger a visual effect when a note is hit */
  onNoteHit?: (noteId: string, accuracy: string) => void;
  /** Trigger a visual effect when a note is missed */
  onNoteMiss?: (noteId: string) => void;
  /** Update onramp countdown display */
  updateOnrampCountdown?: (beatsRemaining: number) => void;
  /** Clear onramp countdown display */
  clearOnrampCountdown?: () => void;
}

/**
 * Logger interface for debugging and monitoring.
 */
export interface HighwayLogger {
  debug: (context: string, message: string, data?: unknown) => void;
  info: (context: string, message: string, data?: unknown) => void;
  warn: (context: string, message: string, data?: unknown) => void;
  error: (context: string, message: string, data?: unknown) => void;
}

// ============================================================================
// Note Highway Service Instance
// ============================================================================

/**
 * Instance returned by createNoteHighwayService().
 */
export interface NoteHighwayServiceInstance {
  /** Initialize the service with target notes */
  init(notes: HighwayTargetNote[]): void;
  /** Start playback from beginning (including onramp) */
  start(): void;
  /** Pause playback */
  pause(): void;
  /** Resume paused playback */
  resume(): void;
  /** Stop playback and reset */
  stop(): void;
  /** Seek to a specific time position (ms) */
  setScrollOffset(timeMs: number): void;
  /** Record a user pitch input */
  recordPitchInput(midi: number, clarity: number, source: InputSource): void;
  /** Get current state */
  getState(): Readonly<NoteHighwayState>;
  /** Get notes visible in current viewport */
  getVisibleNotes(): HighwayTargetNote[];
  /** Get all performance results */
  getPerformanceResults(): Map<string, NotePerformance>;
  /** Get feedback collector instance */
  getFeedbackCollector(): FeedbackCollectorInstance;
  /** Cleanup resources */
  dispose(): void;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Events emitted by the Note Highway service.
 */
export type NoteHighwayEvent =
  | 'playbackStarted'
  | 'playbackPaused'
  | 'playbackResumed'
  | 'playbackStopped'
  | 'onrampComplete'
  | 'noteEntered'     // Note entered judgment window
  | 'noteExited'      // Note exited judgment window
  | 'noteHit'         // Note was successfully hit
  | 'noteMissed'      // Note was missed
  | 'performanceComplete'; // All notes have been evaluated

/**
 * Data for note events.
 */
export interface NoteEventData {
  noteId: string;
  note: HighwayTargetNote;
  performance?: NotePerformance;
}
