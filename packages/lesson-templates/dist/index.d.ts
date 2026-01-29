/**
 * @mlt/lesson-templates
 *
 * Lesson and exercise templates for Music Learning Tools.
 * Provides a template system for defining exercises that can adapt
 * to the user's calibrated speaking pitch.
 */
export type { SpeakingPitchUsage, LessonType, DifficultyLevel, LessonCategory, LessonTemplate, PitchMatchingConfig, LoopPhaseType, LoopPhase, ExercisePattern, TemplateVariation, PitchMatchingTemplate, TemplateContext, ResolvedConfig, AnyLessonTemplate, SettingFieldType, SettingField, LessonSettingsSchema, LessonStepType, LessonStep, LessonStepper, InstructionStepConfig, ConfigureStepConfig, ListenStepConfig, InputStepConfig, FeedbackStepConfig, CompleteStepConfig, LessonStepConfig, } from './types.js';
export { registerTemplate, registerTemplates, getTemplate, getTemplateOrThrow, getAllTemplates, getTemplatesByType, getTemplatesByDifficulty, getTemplatesByCategory, getTemplatesGroupedByCategory, getAvailableCategories, getRegistryEntries, getRegistryEntriesByCategory, hasTemplate, unregisterTemplate, clearRegistry, getTemplateCount, type RegistryEntry, } from './registry.js';
export { createLessonEngine, getLessonEngine, resetGlobalEngine, createStepper, LinearStepper, type LessonEngine, type LessonEngineState, type LessonEngineEvent, type LessonEngineListener, type LessonContext, type GridController, type GridOverlay, type GridLabelMode, type AudioController, type UiController, type UiOverlay, } from './engine/index.js';
export { resolveConfig, applyAsTonic, applyAsFloorNote, applyCustomOffset, applyVariation, } from './utils/pitchMapping.js';
export { validateTemplate, calculateLoopDurationMicrobeats, calculateLoopDurationMs, type ValidationResult, } from './utils/validator.js';
export { STANDARD_4_PHASE_PATTERN, QUICK_RESPONSE_PATTERN, EXTENDED_HOLD_PATTERN, BASIC_PITCH_MATCHING, QUICK_PITCH_MATCHING, SUSTAINED_PITCH_MATCHING, CENTERED_RANGE_MATCHING, PITCH_MATCHING_PRESETS, registerAllPresets, getAllPresets, } from './presets/index.js';
export { INTRO_PITCH_MATCHING, ANCHORED_PITCH_MATCHING, ALL_LESSONS, } from './lessons/index.js';
//# sourceMappingURL=index.d.ts.map