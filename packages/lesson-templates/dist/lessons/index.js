/**
 * Lesson Definitions
 *
 * Individual lesson templates that can be registered and used through
 * the exercise chooser. Each lesson has a unique ID and configuration.
 */
// Re-export presets as lessons (they're the same thing)
export { BASIC_PITCH_MATCHING, QUICK_PITCH_MATCHING, SUSTAINED_PITCH_MATCHING, CENTERED_RANGE_MATCHING, PITCH_MATCHING_PRESETS, } from '../presets/pitchMatching.js';
// Export dedicated example lessons
export { INTRO_PITCH_MATCHING } from './introPitchMatching.js';
export { ANCHORED_PITCH_MATCHING } from './anchoredPitchMatching.js';
// All lessons for registration
import { PITCH_MATCHING_PRESETS } from '../presets/pitchMatching.js';
import { INTRO_PITCH_MATCHING } from './introPitchMatching.js';
import { ANCHORED_PITCH_MATCHING } from './anchoredPitchMatching.js';
/** All available lessons */
export const ALL_LESSONS = [
    INTRO_PITCH_MATCHING,
    ANCHORED_PITCH_MATCHING,
    ...PITCH_MATCHING_PRESETS,
];
