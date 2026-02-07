/**
 * Foundations 1.2: High/Low Contrast
 *
 * Train producing low vs high pitch bands relative to speaking pitch.
 */

import type { PitchMatchingTemplate, LessonSettingsSchema, ExercisePattern } from '../types.js';

const SETTINGS_SCHEMA: LessonSettingsSchema = {
  fields: [
    { key: 'loopCount', label: 'Loops', type: 'integer', default: 4, min: 2, max: 10 },
    { key: 'tempoBpm', label: 'Tempo (BPM)', type: 'integer', default: 90, min: 60, max: 140 },
    { key: 'minVoicedMs', label: 'Min Voiced (ms)', type: 'integer', default: 400, min: 100, max: 2000 },
    { key: 'minAmplitudeDb', label: 'Min Amplitude (dB)', type: 'integer', default: -60, min: -80, max: -10 },
    { key: 'minCoveragePct', label: 'Min Coverage (%)', type: 'integer', default: 60, min: 30, max: 100 },
    { key: 'bandLowMinOffsetSemis', label: 'Low Band Min (semitones)', type: 'integer', default: -8, min: -24, max: 0 },
    { key: 'bandLowMaxOffsetSemis', label: 'Low Band Max (semitones)', type: 'integer', default: -3, min: -24, max: 0 },
    { key: 'bandHighMinOffsetSemis', label: 'High Band Min (semitones)', type: 'integer', default: 3, min: 0, max: 24 },
    { key: 'bandHighMaxOffsetSemis', label: 'High Band Max (semitones)', type: 'integer', default: 8, min: 0, max: 24 },
    { key: 'showImmediateFeedback', label: 'Immediate Feedback', type: 'boolean', default: true },
    { key: 'showScore', label: 'Show Score', type: 'boolean', default: true },
  ],
};

const HIGH_LOW_PATTERN: ExercisePattern = {
  id: 'foundations-1-2-high-low-contrast-pattern',
  name: '1.2 High/Low Contrast',
  leadInMs: 2000,
  phases: [
    { type: 'reference', durationMicrobeats: 4 },
    { type: 'rest', durationMicrobeats: 4 },
    { type: 'input', durationMicrobeats: 8, label: 'LOW' },
    { type: 'rest', durationMicrobeats: 4 },
    { type: 'reference', durationMicrobeats: 4 },
    { type: 'rest', durationMicrobeats: 4 },
    { type: 'input', durationMicrobeats: 8, label: 'HIGH' },
    { type: 'rest', durationMicrobeats: 4 },
  ],
};

export const FOUNDATIONS_1_2_HIGH_LOW_CONTRAST: PitchMatchingTemplate = {
  id: 'foundations-1-2-high-low-contrast',
  name: '1.2 High vs Low Contrast',
  description: 'Sing within a low band, then within a higher band relative to your speaking pitch.',
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
    bandLowMinOffsetSemis: -8,
    bandLowMaxOffsetSemis: -3,
    bandHighMinOffsetSemis: 3,
    bandHighMaxOffsetSemis: 8,
    showImmediateFeedback: true,
    showScore: true,
  },
  pattern: HIGH_LOW_PATTERN,
};
