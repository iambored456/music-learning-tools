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
export { FOUNDATIONS_1_1_VOCAL_ON_OFF } from './foundations_1_1_vocal_on_off.js';
export { FOUNDATIONS_1_2_HIGH_LOW_CONTRAST } from './foundations_1_2_high_low_contrast.js';
export { FOUNDATIONS_1_3_PITCH_SLIDE } from './foundations_1_3_pitch_slide.js';
export { FOUNDATIONS_1_4_HOLD_STEADY } from './foundations_1_4_hold_steady.js';
// All lessons for registration
import { PITCH_MATCHING_PRESETS } from '../presets/pitchMatching.js';
import { INTRO_PITCH_MATCHING } from './introPitchMatching.js';
import { ANCHORED_PITCH_MATCHING } from './anchoredPitchMatching.js';
import { FOUNDATIONS_1_1_VOCAL_ON_OFF } from './foundations_1_1_vocal_on_off.js';
import { FOUNDATIONS_1_2_HIGH_LOW_CONTRAST } from './foundations_1_2_high_low_contrast.js';
import { FOUNDATIONS_1_3_PITCH_SLIDE } from './foundations_1_3_pitch_slide.js';
import { FOUNDATIONS_1_4_HOLD_STEADY } from './foundations_1_4_hold_steady.js';
/** All available lessons */
export const ALL_LESSONS = [
    INTRO_PITCH_MATCHING,
    ANCHORED_PITCH_MATCHING,
    FOUNDATIONS_1_1_VOCAL_ON_OFF,
    FOUNDATIONS_1_2_HIGH_LOW_CONTRAST,
    FOUNDATIONS_1_3_PITCH_SLIDE,
    FOUNDATIONS_1_4_HOLD_STEADY,
    ...PITCH_MATCHING_PRESETS,
];
