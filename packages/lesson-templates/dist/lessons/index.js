/**
 * Lesson Definitions
 *
 * Individual lesson templates that can be registered and used through
 * the exercise chooser. Each lesson has a unique ID and configuration.
 */
// Re-export presets as lessons (they're the same thing)
export { BASIC_PITCH_MATCHING, QUICK_PITCH_MATCHING, SUSTAINED_PITCH_MATCHING, CENTERED_RANGE_MATCHING, PITCH_MATCHING_PRESETS, } from '../presets/pitchMatching.js';
// Export dedicated example lessons
export { ANCHORED_PITCH_MATCHING } from './anchoredPitchMatching.js';
export { FOUNDATIONS_1_MERGED } from './foundations_1_merged.js';
// Export overdub exercises
export { SIMPLE_UNISON, FEELING_THIS, ALL_OVERDUB_EXERCISES } from './overdubExercises/index.js';
// All lessons for registration
import { PITCH_MATCHING_PRESETS } from '../presets/pitchMatching.js';
import { ANCHORED_PITCH_MATCHING } from './anchoredPitchMatching.js';
import { FOUNDATIONS_1_MERGED } from './foundations_1_merged.js';
import { ALL_OVERDUB_EXERCISES } from './overdubExercises/index.js';
/** All available lessons and exercises */
export const ALL_LESSONS = [
    ANCHORED_PITCH_MATCHING,
    FOUNDATIONS_1_MERGED,
    ...PITCH_MATCHING_PRESETS,
    ...ALL_OVERDUB_EXERCISES,
];
