/**
 * Workshop Definitions
 *
 * Multi-voice templates for workshop (overdub builder) mode.
 */

import type { OverdubExerciseTemplate } from '../../types.js';
import { SIMPLE_UNISON } from './simpleUnison.js';
import { FEELING_THIS } from './feelingThis.js';

export { SIMPLE_UNISON, FEELING_THIS };

/** All available workshop templates */
export const ALL_WORKSHOP_EXERCISES: OverdubExerciseTemplate[] = [
  SIMPLE_UNISON,
  FEELING_THIS,
];
