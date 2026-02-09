/**
 * Lesson Template Types
 *
 * Core type definitions for the lesson template system.
 * Templates define exercise configurations that can adapt to the user's
 * calibrated speaking pitch.
 */

/** How a lesson uses the calibrated speaking pitch */
export type SpeakingPitchUsage = 'none' | 'asTonic' | 'asFloorNote' | 'custom';

/** Lesson types */
export type LessonType = 'pitch-matching' | 'interval' | 'rhythm' | 'melody' | 'overdub';

/** Difficulty levels */
export type DifficultyLevel = 1 | 2 | 3;

/** Lesson categories for browsing/filtering */
export type LessonCategory = 'foundations' | 'beginning' | 'overdub-exercises';

// ============================================================================
// Settings Schema Types
// ============================================================================

/** Supported setting field types */
export type SettingFieldType = 'integer' | 'boolean';

/** Single setting field definition */
export interface SettingField {
  /** Unique key for this setting */
  key: string;
  /** Display label */
  label: string;
  /** Field type */
  type: SettingFieldType;
  /** Default value */
  default: number | boolean;
  /** Minimum value (for integer fields) */
  min?: number;
  /** Maximum value (for integer fields) */
  max?: number;
  /** Step increment (for integer fields) */
  step?: number;
  /** Optional description/help text */
  description?: string;
}

/** Schema defining configurable settings for a lesson */
export interface LessonSettingsSchema {
  /** Array of setting field definitions */
  fields: SettingField[];
}

// ============================================================================
// Linear Step API Types (Scaffolded)
// ============================================================================

/** Types of lesson steps */
export type LessonStepType =
  | 'instruction' // Show instructional message/overlay
  | 'configure' // Configure grid/audio settings
  | 'listen' // Play reference for user to hear
  | 'input' // User input/performance window
  | 'feedback' // Show feedback on performance
  | 'complete'; // Lesson complete

/** Avatar expression for instruction steps */
export type InstructionAvatarExpression = 'neutral' | 'encouraging';

/** Configuration for instruction step */
export interface InstructionStepConfig {
  message: string;
  title?: string;
  dismissAfterMs?: number;
  /** Whether to speak the message with the avatar (if available) */
  speakWithAvatar?: boolean;
  /** Avatar expression to use while speaking */
  avatarExpression?: InstructionAvatarExpression;
}

/** Configuration for configure step */
export interface ConfigureStepConfig {
  pitchRange?: { minMidi: number; maxMidi: number };
  droneOn?: boolean;
  tempo?: number;
}

/** Configuration for listen step */
export interface ListenStepConfig {
  durationMs: number;
  pitches?: number[];
}

/** Configuration for input step */
export interface InputStepConfig {
  durationMs: number;
  targetPitch?: number;
}

/** Configuration for feedback step */
export interface FeedbackStepConfig {
  showAccuracy?: boolean;
  showPitchDeviation?: boolean;
  autoProceedAfterMs?: number;
}

/** Configuration for complete step */
export interface CompleteStepConfig {
  message?: string;
  showSummary?: boolean;
}

/** Union of all step config types */
export type LessonStepConfig =
  | InstructionStepConfig
  | ConfigureStepConfig
  | ListenStepConfig
  | InputStepConfig
  | FeedbackStepConfig
  | CompleteStepConfig;

/** Single step in a lesson flow */
export interface LessonStep {
  /** Unique step identifier */
  id: string;
  /** Step type */
  type: LessonStepType;
  /** Step-specific configuration */
  config: LessonStepConfig;
}

/** Interface for lesson stepper (manages step progression) */
export interface LessonStepper {
  /** Current step being executed (null if not started or complete) */
  readonly currentStep: LessonStep | null;
  /** Current step index */
  readonly currentIndex: number;
  /** Total number of steps */
  readonly totalSteps: number;
  /** Whether the lesson is complete */
  readonly isComplete: boolean;
  /** Start the lesson from the beginning */
  start(): LessonStep | null;
  /** Advance to the next step */
  next(): LessonStep | null;
  /** Go back to previous step */
  previous(): LessonStep | null;
  /** Stop the lesson */
  stop(): void;
  /** Reset to beginning */
  reset(): void;
}

/** Base lesson template interface */
export interface LessonTemplate {
  /** Unique identifier for the template */
  id: string;
  /** Display name */
  name: string;
  /** Brief description of the exercise */
  description: string;
  /** Type of exercise */
  type: LessonType;
  /** Difficulty level: 1 = beginner, 2 = intermediate, 3 = advanced */
  difficulty: DifficultyLevel;
  /** Category for browsing */
  category: LessonCategory;
  /** How the template uses the user's calibrated speaking pitch */
  speakingPitchUsage: SpeakingPitchUsage;
  /** Semitone offset when speakingPitchUsage is 'custom' */
  customPitchOffset?: number;
  /** Estimated duration display string (e.g., "~30s", "~1 min") */
  durationEstimate: string;
  /** Schema for configurable pre-start settings */
  settingsSchema: LessonSettingsSchema;
  /** Optional array of steps for linear lesson flow */
  steps?: LessonStep[];
}

/** Exercise configuration for pitch matching exercises */
export interface PitchMatchingConfig {
  /** Number of repetitions/loops */
  numLoops: number;
  /** Tempo in BPM */
  tempo: number;
  /** Reference tone volume in dB (-60 to 0) */
  referenceVolume: number;
  /** Minimum MIDI note (optional - may be derived from speaking pitch) */
  minMidi?: number;
  /** Maximum MIDI note (optional - may be derived from speaking pitch) */
  maxMidi?: number;
  /** Minimum amplitude (dB) to consider a voiced sample */
  minAmplitudeDb?: number;
  /** Minimum voiced duration within a window (ms) */
  minVoicedMs?: number;
  /** Minimum coverage percentage within a window */
  minCoveragePct?: number;
  /** Low band minimum offset from speaking pitch (semitones) */
  bandLowMinOffsetSemis?: number;
  /** Low band maximum offset from speaking pitch (semitones) */
  bandLowMaxOffsetSemis?: number;
  /** High band minimum offset from speaking pitch (semitones) */
  bandHighMinOffsetSemis?: number;
  /** High band maximum offset from speaking pitch (semitones) */
  bandHighMaxOffsetSemis?: number;
  /** Hold band size in semitones (± value) */
  holdBandSemitones?: number;
  /** Minimum slide span in semitones */
  minSlideSemitones?: number;
  /**
   * If true, scroll waits at input windows until valid mic input is detected.
   * This removes strict rhythmic timing pressure for pitch-shaping exercises.
   */
  waitForInput?: boolean;
  /** Toggle immediate feedback (UI scaffold) */
  showImmediateFeedback?: boolean;
  /** Toggle score display (UI scaffold) */
  showScore?: boolean;
}

/** Phase type in an exercise loop */
export type LoopPhaseType = 'reference' | 'rest' | 'input';

/** Optional target behavior override for a loop phase */
export type LoopPhaseTargetMode =
  | 'fixedPitch'
  | 'windowAnyPitch'
  | 'windowBand'
  | 'slideWindow'
  | 'holdSteady';

/** Single phase in an exercise loop */
export interface LoopPhase {
  /** Type of phase */
  type: LoopPhaseType;
  /** Duration in microbeats */
  durationMicrobeats: number;
  /** Optional emoji indicator for UI */
  emoji?: string;
  /** Optional text label for UI */
  label?: string;
  /** Optional segment identifier for grouped scoring/instructions */
  segmentId?: string;
  /** Optional segment name for grouped scoring/instructions */
  segmentName?: string;
  /** Optional target-mode override for this phase */
  targetMode?: LoopPhaseTargetMode;
  /** Optional LOW/HIGH role hint for windowBand phases */
  bandRole?: 'low' | 'high';
  /** Optional slide direction hint for slideWindow phases */
  slideDirection?: 'up' | 'down';
  /** Optional spoken/visual instruction when this phase begins */
  instructionMessage?: string;
  /** If true, avatar should speak instructionMessage (when available) */
  speakInstruction?: boolean;
  /** If true, this input phase participates in wait-for-input gating */
  waitForInput?: boolean;
}

/** Exercise loop pattern definition */
export interface ExercisePattern {
  /** Unique identifier for the pattern */
  id: string;
  /** Display name */
  name: string;
  /** Lead-in time before exercise starts (ms) */
  leadInMs: number;
  /** Array of phases that make up one loop */
  phases: LoopPhase[];
}

/** Template variation for difficulty progression */
export interface TemplateVariation {
  /** Unique identifier for the variation */
  id: string;
  /** Display name */
  name: string;
  /** Difficulty level of this variation */
  difficulty: DifficultyLevel;
  /** Configuration overrides applied to the base template */
  configOverrides: Partial<PitchMatchingConfig>;
}

/** Pitch matching exercise template */
export interface PitchMatchingTemplate extends LessonTemplate {
  type: 'pitch-matching';
  /** Base exercise configuration */
  config: PitchMatchingConfig;
  /** Exercise loop pattern */
  pattern: ExercisePattern;
  /** Optional variations for different difficulty levels */
  variations?: TemplateVariation[];
}

/** Runtime context passed when resolving templates */
export interface TemplateContext {
  /** User's calibrated speaking pitch (null if not calibrated) */
  speakingPitchMidi: number | null;
  /** Current viewport pitch range (optional) */
  currentViewportRange?: {
    minMidi: number;
    maxMidi: number;
  };
}

/** Resolved configuration after applying speaking pitch mapping */
export interface ResolvedConfig extends PitchMatchingConfig {
  /** Effective minimum MIDI note after mapping */
  effectiveMinMidi: number;
  /** Effective maximum MIDI note after mapping */
  effectiveMaxMidi: number;
  /** Whether speaking pitch was applied */
  speakingPitchApplied: boolean;
}

// ============================================================================
// Overdub Exercise Types
// ============================================================================

/** A note within an overdub exercise voice */
export interface ExerciseNote {
  /** Start position in microbeat columns (0-indexed, inclusive) */
  startMicrobeatCol: number;
  /** End position in microbeat columns (inclusive) */
  endMicrobeatCol: number;
  /** MIDI pitch number (e.g., 60 = C4) */
  midiPitch: number;
  /** Display name (e.g., "C4", "Bb3") */
  pitchName: string;
}

/** A voice within an overdub exercise */
export interface ExerciseVoice {
  /** Unique identifier for the voice */
  voiceId: string;
  /** Display color (hex code) */
  color: string;
  /** Role: 'guide' voices play as reference audio; 'student' is the part to sing */
  role: 'guide' | 'student';
  /** Display name (e.g., "Melody", "Your Part") */
  name: string;
  /** Array of notes in this voice (monophonic within voice) */
  notes: ExerciseNote[];
}

/** Time grid structure for an overdub exercise */
export interface ExerciseTimeGrid {
  /** Total number of microbeat columns */
  microbeatCount: number;
  /** Number of microbeats per macrobeat */
  microbeatsPerMacrobeat: 2 | 3;
  /** Per-macrobeat subdivision groupings */
  macrobeatGroupings: (2 | 3)[];
}

/** Configuration for an overdub exercise */
export interface OverdubExerciseConfig {
  /** Tempo in BPM */
  tempo: number;
  /** Time grid defining the rhythmic structure */
  timeGrid: ExerciseTimeGrid;
  /** Voices in the exercise */
  voices: ExerciseVoice[];
  /** Minimum MIDI pitch for viewport */
  minMidiPitch: number;
  /** Maximum MIDI pitch for viewport */
  maxMidiPitch: number;
  /** Optional tonal center */
  tonalCenter?: { pitchClass: string; mode?: string };
  /** Count-in beats before exercise starts */
  countInBeats?: number;
}

/** Overdub exercise template */
export interface OverdubExerciseTemplate extends LessonTemplate {
  type: 'overdub';
  /** Exercise configuration with multi-voice data */
  config: OverdubExerciseConfig;
}

/** Union type for all template types */
export type AnyLessonTemplate = PitchMatchingTemplate | OverdubExerciseTemplate;
