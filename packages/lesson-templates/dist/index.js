/**
 * @mlt/lesson-templates
 *
 * Lesson and exercise templates for Music Learning Tools.
 * Provides a template system for defining exercises that can adapt
 * to the user's calibrated speaking pitch.
 */
// Registry
export { registerTemplate, registerTemplates, getTemplate, getTemplateOrThrow, getAllTemplates, getTemplatesByType, getTemplatesByDifficulty, hasTemplate, unregisterTemplate, clearRegistry, getTemplateCount, } from './registry.js';
// Pitch mapping utilities
export { resolveConfig, applyAsTonic, applyAsFloorNote, applyCustomOffset, applyVariation, } from './utils/pitchMapping.js';
// Validator utilities
export { validateTemplate, calculateLoopDurationMicrobeats, calculateLoopDurationMs, } from './utils/validator.js';
// Presets
export { STANDARD_4_PHASE_PATTERN, QUICK_RESPONSE_PATTERN, EXTENDED_HOLD_PATTERN, BASIC_PITCH_MATCHING, QUICK_PITCH_MATCHING, SUSTAINED_PITCH_MATCHING, CENTERED_RANGE_MATCHING, PITCH_MATCHING_PRESETS, registerAllPresets, getAllPresets, } from './presets/index.js';
