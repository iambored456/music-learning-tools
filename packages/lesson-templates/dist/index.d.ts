/**
 * @mlt/lesson-templates
 *
 * Lesson and exercise templates for Music Learning Tools.
 * Provides a template system for defining exercises that can adapt
 * to the user's calibrated speaking pitch.
 */
export type { SpeakingPitchUsage, LessonType, DifficultyLevel, LessonCategory, LessonTemplate, PitchMatchingConfig, LoopPhaseType, LoopPhaseTargetMode, LoopPhase, ExercisePattern, TemplateVariation, PitchMatchingTemplate, TemplateContext, ResolvedConfig, AnyLessonTemplate, SettingFieldType, SettingField, LessonSettingsSchema, LessonStepType, LessonStep, LessonStepper, InstructionStepConfig, InstructionAvatarExpression, ConfigureStepConfig, ListenStepConfig, InputStepConfig, FeedbackStepConfig, CompleteStepConfig, LessonStepConfig, ExerciseNote, ExerciseVoice, ExerciseTimeGrid, OverdubExerciseConfig, OverdubExerciseTemplate, } from './types.js';
export { registerTemplate, registerTemplates, getTemplate, getTemplateOrThrow, getAllTemplates, getTemplatesByType, getTemplatesByDifficulty, getTemplatesByCategory, getTemplatesGroupedByCategory, getAvailableCategories, getRegistryEntries, getRegistryEntriesByCategory, hasTemplate, unregisterTemplate, clearRegistry, getTemplateCount, type RegistryEntry, } from './registry.js';
export { createLessonEngine, getLessonEngine, resetGlobalEngine, createStepper, LinearStepper, type LessonEngine, type LessonEngineState, type LessonEngineEvent, type LessonEngineListener, type LessonContext, type GridController, type GridOverlay, type GridLabelMode, type AudioController, type UiController, type UiOverlay, type AvatarExpression, type AvatarSpeakOptions, } from './engine/index.js';
export { resolveConfig, applyAsTonic, applyAsFloorNote, applyCustomOffset, applyVariation, } from './utils/pitchMapping.js';
export { validateTemplate, calculateLoopDurationMicrobeats, calculateLoopDurationMs, type ValidationResult, } from './utils/validator.js';
export { STANDARD_4_PHASE_PATTERN, QUICK_RESPONSE_PATTERN, EXTENDED_HOLD_PATTERN, BASIC_PITCH_MATCHING, QUICK_PITCH_MATCHING, SUSTAINED_PITCH_MATCHING, CENTERED_RANGE_MATCHING, PITCH_MATCHING_PRESETS, registerAllPresets, getAllPresets, } from './presets/index.js';
export { convertSpecToExercise, type ExerciseSpec, type SpecGlobals, type SpecEvent, type SpecPart, type ExerciseSpecMetadata, } from './utils/importExerciseSpec.js';
export { convertRelativeExerciseToSpec, importMusicXmlToExerciseSpec, importMusicXmlToOverdubExercise, type MusicXmlSpecWarningCode, type MusicXmlSpecWarning, type MusicXmlPipelineWarning, type RelativeToSpecOptions, type ImportMusicXmlToSpecOptions, type ImportMusicXmlToSpecResult, type ImportMusicXmlToOverdubResult, } from './utils/musicxmlImport.js';
export { ANCHORED_PITCH_MATCHING, FOUNDATIONS_1_MERGED, ALL_LESSONS, SIMPLE_UNISON, FEELING_THIS, ALL_OVERDUB_EXERCISES, } from './lessons/index.js';
//# sourceMappingURL=index.d.ts.map