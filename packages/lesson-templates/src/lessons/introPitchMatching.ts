/**
 * Intro Pitch Matching Lesson
 *
 * A beginner-friendly lesson that does NOT use speaking pitch.
 * Uses a fixed, comfortable pitch range for all users.
 *
 * This lesson is designed for:
 * - First-time users who haven't calibrated their speaking pitch
 * - Users who want a quick practice without personalization
 * - Introduction to the pitch matching concept
 */

import type { PitchMatchingTemplate, LessonSettingsSchema } from '../types.js';
import { STANDARD_4_PHASE_PATTERN } from '../presets/pitchMatching.js';

/** Settings schema for intro lesson */
const INTRO_SETTINGS_SCHEMA: LessonSettingsSchema = {
  fields: [
    {
      key: 'loopCount',
      label: 'Loops',
      type: 'integer',
      default: 5,
      min: 3,
      max: 10,
      description: 'Number of pitches to match',
    },
    {
      key: 'tempoBpm',
      label: 'Tempo',
      type: 'integer',
      default: 100,
      min: 60,
      max: 140,
      description: 'Speed of the exercise (BPM)',
    },
    {
      key: 'droneOn',
      label: 'Drone',
      type: 'boolean',
      default: false,
      description: 'Play a sustained reference tone',
    },
    {
      key: 'playbackReferenceOn',
      label: 'Reference Tone',
      type: 'boolean',
      default: true,
      description: 'Play the target pitch before you sing',
    },
  ],
};

/**
 * Introduction to Pitch Matching
 *
 * Characteristics:
 * - Does NOT require speaking pitch calibration
 * - Uses fixed pitch range (C3 to C4 - comfortable for most voices)
 * - Slower tempo for beginners
 * - Category: Foundations
 */
export const INTRO_PITCH_MATCHING: PitchMatchingTemplate = {
  id: 'intro-pitch-matching',
  name: '1.0 Introduction to Pitch Matching',
  description: 'Learn the basics of pitch matching with a comfortable, fixed range.',
  type: 'pitch-matching',
  difficulty: 1,
  category: 'foundations',
  speakingPitchUsage: 'none',
  durationEstimate: '~30s',
  settingsSchema: INTRO_SETTINGS_SCHEMA,
  config: {
    numLoops: 5,
    tempo: 100,
    referenceVolume: -10,
    minMidi: 48, // C3
    maxMidi: 60, // C4
  },
  pattern: STANDARD_4_PHASE_PATTERN,
  variations: [
    {
      id: 'intro-easy',
      name: 'Extra Easy',
      difficulty: 1,
      configOverrides: {
        numLoops: 3,
        tempo: 80,
        referenceVolume: -6,
        minMidi: 48,
        maxMidi: 55, // Smaller range
      },
    },
    {
      id: 'intro-standard',
      name: 'Standard',
      difficulty: 1,
      configOverrides: {
        numLoops: 5,
        tempo: 100,
      },
    },
  ],
};
