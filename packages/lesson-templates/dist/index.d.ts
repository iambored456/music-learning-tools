/**
 * @mlt/lesson-templates
 *
 * Lesson and exercise templates for Music Learning Tools.
 * Provides a template system for defining exercises that can adapt
 * to the user's calibrated speaking pitch.
 */
export type { SpeakingPitchUsage, LessonType, DifficultyLevel, LessonTemplate, PitchMatchingConfig, LoopPhaseType, LoopPhase, ExercisePattern, TemplateVariation, PitchMatchingTemplate, TemplateContext, ResolvedConfig, AnyLessonTemplate, } from './types.js';
export { registerTemplate, registerTemplates, getTemplate, getTemplateOrThrow, getAllTemplates, getTemplatesByType, getTemplatesByDifficulty, hasTemplate, unregisterTemplate, clearRegistry, getTemplateCount, } from './registry.js';
export { resolveConfig, applyAsTonic, applyAsFloorNote, applyCustomOffset, applyVariation, } from './utils/pitchMapping.js';
export { validateTemplate, calculateLoopDurationMicrobeats, calculateLoopDurationMs, type ValidationResult, } from './utils/validator.js';
export { STANDARD_4_PHASE_PATTERN, QUICK_RESPONSE_PATTERN, EXTENDED_HOLD_PATTERN, BASIC_PITCH_MATCHING, QUICK_PITCH_MATCHING, SUSTAINED_PITCH_MATCHING, CENTERED_RANGE_MATCHING, PITCH_MATCHING_PRESETS, registerAllPresets, getAllPresets, } from './presets/index.js';
//# sourceMappingURL=index.d.ts.map