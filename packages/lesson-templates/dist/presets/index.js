/**
 * Preset Templates Index
 *
 * Re-exports all preset templates and provides initialization utilities.
 */
export { STANDARD_4_PHASE_PATTERN, QUICK_RESPONSE_PATTERN, EXTENDED_HOLD_PATTERN, BASIC_PITCH_MATCHING, QUICK_PITCH_MATCHING, SUSTAINED_PITCH_MATCHING, CENTERED_RANGE_MATCHING, PITCH_MATCHING_PRESETS, } from './pitchMatching.js';
import { registerTemplates } from '../registry.js';
import { PITCH_MATCHING_PRESETS } from './pitchMatching.js';
/**
 * Register all preset templates with the registry.
 * Call this once at application startup.
 */
export function registerAllPresets() {
    registerTemplates(PITCH_MATCHING_PRESETS);
}
/**
 * Get all preset templates (without registering them)
 */
export function getAllPresets() {
    return [...PITCH_MATCHING_PRESETS];
}
