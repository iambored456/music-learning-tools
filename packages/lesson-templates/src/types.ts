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
export type LessonType = 'pitch-matching' | 'interval' | 'rhythm' | 'melody';

/** Difficulty levels */
export type DifficultyLevel = 1 | 2 | 3;

/** Lesson categories for browsing/filtering */
export type LessonCategory = 'foundations' | 'beginning';

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

/** Configuration for instruction step */
export interface InstructionStepConfig {
  message: string;
  title?: string;
  dismissAfterMs?: number;
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
}

/** Phase type in an exercise loop */
export type LoopPhaseType = 'reference' | 'rest' | 'input';

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

/** Union type for all template types */
export type AnyLessonTemplate = PitchMatchingTemplate;
// Future: | IntervalTemplate | RhythmTemplate | MelodyTemplate
