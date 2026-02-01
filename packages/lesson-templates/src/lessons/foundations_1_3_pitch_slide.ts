/**
 * Foundations 1.3: Pitch Slide
 *
 * Train sliding pitch up and down across a window.
 */

import type { PitchMatchingTemplate, LessonSettingsSchema, ExercisePattern } from '../types.js';

const SETTINGS_SCHEMA: LessonSettingsSchema = {
  fields: [
    { key: 'loopCount', label: 'Loops', type: 'integer', default: 4, min: 2, max: 10 },
    { key: 'tempoBpm', label: 'Tempo (BPM)', type: 'integer', default: 90, min: 60, max: 140 },
    { key: 'minVoicedMs', label: 'Min Voiced (ms)', type: 'integer', default: 400, min: 100, max: 2000 },
    { key: 'minAmplitudeDb', label: 'Min Amplitude (dB)', type: 'integer', default: -60, min: -80, max: -10 },
    { key: 'minCoveragePct', label: 'Min Coverage (%)', type: 'integer', default: 60, min: 30, max: 100 },
    { key: 'minSlideSemitones', label: 'Min Slide (semitones)', type: 'integer', default: 3, min: 1, max: 12 },
    { key: 'showImmediateFeedback', label: 'Immediate Feedback', type: 'boolean', default: true },
    { key: 'showScore', label: 'Show Score', type: 'boolean', default: true },
  ],
};

const PITCH_SLIDE_PATTERN: ExercisePattern = {
  id: 'foundations-1-3-pitch-slide-pattern',
  name: '1.3 Pitch Slide',
  leadInMs: 2000,
  phases: [
    { type: 'reference', durationMicrobeats: 4 },
    { type: 'rest', durationMicrobeats: 4 },
    { type: 'input', durationMicrobeats: 8, label: 'SLIDE UP' },
    { type: 'rest', durationMicrobeats: 4 },
    { type: 'input', durationMicrobeats: 8, label: 'SLIDE DOWN' },
    { type: 'rest', durationMicrobeats: 4 },
  ],
};

export const FOUNDATIONS_1_3_PITCH_SLIDE: PitchMatchingTemplate = {
  id: 'foundations-1-3-pitch-slide',
  name: '1.3 Pitch Slide',
  description: 'Slide your pitch upward and downward across each window.',
  type: 'pitch-matching',
  difficulty: 1,
  category: 'foundations',
  speakingPitchUsage: 'asTonic',
  durationEstimate: '~45s',
  settingsSchema: SETTINGS_SCHEMA,
  config: {
    numLoops: 4,
    tempo: 90,
    referenceVolume: -12,
    minAmplitudeDb: -60,
    minVoicedMs: 400,
    minCoveragePct: 60,
    minSlideSemitones: 3,
    showImmediateFeedback: true,
    showScore: true,
  },
  pattern: PITCH_SLIDE_PATTERN,
};
