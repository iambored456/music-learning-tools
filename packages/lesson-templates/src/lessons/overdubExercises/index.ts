/**
 * Overdub Exercise Definitions
 *
 * Multi-voice exercises for the singing trainer's overdub exercise mode.
 */

import type { OverdubExerciseTemplate } from '../../types.js';
import { SIMPLE_UNISON } from './simpleUnison.js';
import { FEELING_THIS } from './feelingThis.js';

export { SIMPLE_UNISON, FEELING_THIS };

/** All available overdub exercises */
export const ALL_OVERDUB_EXERCISES: OverdubExerciseTemplate[] = [
  SIMPLE_UNISON,
  FEELING_THIS,
];
