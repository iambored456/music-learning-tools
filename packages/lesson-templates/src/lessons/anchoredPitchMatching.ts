/**
 * Anchored Pitch Matching Lesson
 *
 * A personalized lesson that uses the user's speaking pitch as the
 * tonal center. Pitches are generated relative to the speaking pitch.
 *
 * This lesson is designed for:
 * - Users who have calibrated their speaking pitch
 * - More natural pitch ranges based on individual voice
 * - Building awareness of pitch relationships
 */

import type { PitchMatchingTemplate, LessonSettingsSchema } from '../types.js';
import { STANDARD_4_PHASE_PATTERN } from '../presets/pitchMatching.js';

/** Settings schema for anchored lesson */
const ANCHORED_SETTINGS_SCHEMA: LessonSettingsSchema = {
  fields: [
    {
      key: 'loopCount',
      label: 'Loops',
      type: 'integer',
      default: 5,
      min: 3,
      max: 15,
      description: 'Number of pitches to match',
    },
    {
      key: 'tempoBpm',
      label: 'Tempo',
      type: 'integer',
      default: 100,
      min: 60,
      max: 160,
      description: 'Speed of the exercise (BPM)',
    },
    {
      key: 'countInBeats',
      label: 'Count-in Beats',
      type: 'integer',
      default: 4,
      min: 0,
      max: 8,
      description: 'Preparatory beats before starting',
    },
    {
      key: 'droneOn',
      label: 'Drone',
      type: 'boolean',
      default: true,
      description: 'Play your speaking pitch as a reference drone',
    },
    {
      key: 'playbackReferenceOn',
      label: 'Reference Tone',
      type: 'boolean',
      default: true,
      description: 'Play each target pitch before you sing',
    },
  ],
};

/**
 * Anchored Pitch Matching
 *
 * Characteristics:
 * - REQUIRES speaking pitch calibration
 * - Uses speaking pitch as tonic (center of pitch range)
 * - Drone enabled by default to reinforce tonal center
 * - Category: Beginning Exercises
 */
export const ANCHORED_PITCH_MATCHING: PitchMatchingTemplate = {
  id: 'anchored-pitch-matching',
  name: 'Anchored Pitch Matching',
  description: 'Match pitches centered around your speaking voice. Personalized to your range.',
  type: 'pitch-matching',
  difficulty: 1,
  category: 'beginning',
  speakingPitchUsage: 'asTonic',
  durationEstimate: '~45s',
  settingsSchema: ANCHORED_SETTINGS_SCHEMA,
  config: {
    numLoops: 5,
    tempo: 100,
    referenceVolume: -10,
    // minMidi and maxMidi will be computed from speaking pitch
  },
  pattern: STANDARD_4_PHASE_PATTERN,
  variations: [
    {
      id: 'anchored-narrow',
      name: 'Narrow Range',
      difficulty: 1,
      configOverrides: {
        numLoops: 4,
        tempo: 90,
      },
    },
    {
      id: 'anchored-wide',
      name: 'Wide Range',
      difficulty: 2,
      configOverrides: {
        numLoops: 8,
        tempo: 110,
      },
    },
    {
      id: 'anchored-challenge',
      name: 'Challenge',
      difficulty: 3,
      configOverrides: {
        numLoops: 10,
        tempo: 130,
        referenceVolume: -15,
      },
    },
  ],
};
