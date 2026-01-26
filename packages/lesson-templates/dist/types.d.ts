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
    /** How the template uses the user's calibrated speaking pitch */
    speakingPitchUsage: SpeakingPitchUsage;
    /** Semitone offset when speakingPitchUsage is 'custom' */
    customPitchOffset?: number;
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
//# sourceMappingURL=types.d.ts.map