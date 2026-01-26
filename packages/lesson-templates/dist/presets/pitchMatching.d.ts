/**
 * Pitch Matching Presets
 *
 * Pre-defined templates for pitch matching exercises.
 * The "Basic Pitch Matching" template corresponds to the existing Demo Exercise.
 */
import type { PitchMatchingTemplate, ExercisePattern } from '../types.js';
/**
 * Standard 4-phase pattern used by the Demo Exercise
 *
 * Structure per loop (32 microbeats total):
 * - Reference (8 microbeats): System plays the target pitch
 * - Rest (8 microbeats): Silence
 * - Input (8 microbeats): User sings the pitch
 * - Rest (8 microbeats): Silence
 */
export declare const STANDARD_4_PHASE_PATTERN: ExercisePattern;
/**
 * Quick response pattern - shorter rest between reference and input
 */
export declare const QUICK_RESPONSE_PATTERN: ExercisePattern;
/**
 * Extended hold pattern - longer singing duration
 */
export declare const EXTENDED_HOLD_PATTERN: ExercisePattern;
/**
 * Basic Pitch Matching Template
 *
 * This is the standard template corresponding to the existing Demo Exercise.
 * Uses the user's speaking pitch as the floor note by default.
 */
export declare const BASIC_PITCH_MATCHING: PitchMatchingTemplate;
/**
 * Quick Response Exercise
 *
 * Faster tempo with shorter rest periods for developing quick pitch recognition.
 */
export declare const QUICK_PITCH_MATCHING: PitchMatchingTemplate;
/**
 * Sustained Pitch Exercise
 *
 * Focus on holding pitches steady for longer durations.
 */
export declare const SUSTAINED_PITCH_MATCHING: PitchMatchingTemplate;
/**
 * Centered Range Exercise
 *
 * Uses speaking pitch as the tonic/center for exploring the comfortable range.
 */
export declare const CENTERED_RANGE_MATCHING: PitchMatchingTemplate;
/**
 * All pitch matching presets
 */
export declare const PITCH_MATCHING_PRESETS: PitchMatchingTemplate[];
//# sourceMappingURL=pitchMatching.d.ts.map