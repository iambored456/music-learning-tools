/**
 * Foundations 1.1: Vocal On/Off
 *
 * Train producing a pitched vocal sound on purpose (start/stop),
 * independent of pitch accuracy.
 */

import type { PitchMatchingTemplate, LessonSettingsSchema, ExercisePattern } from '../types.js';

const SETTINGS_SCHEMA: LessonSettingsSchema = {
  fields: [
    { key: 'loopCount', label: 'Loops', type: 'integer', default: 5, min: 3, max: 10 },
    { key: 'tempoBpm', label: 'Tempo (BPM)', type: 'integer', default: 96, min: 60, max: 140 },
    { key: 'minVoicedMs', label: 'Min Voiced (ms)', type: 'integer', default: 400, min: 100, max: 2000 },
    { key: 'minAmplitudeDb', label: 'Min Amplitude (dB)', type: 'integer', default: -60, min: -80, max: -10 },
    { key: 'minCoveragePct', label: 'Min Coverage (%)', type: 'integer', default: 60, min: 30, max: 100 },
    { key: 'showImmediateFeedback', label: 'Immediate Feedback', type: 'boolean', default: true },
    { key: 'showScore', label: 'Show Score', type: 'boolean', default: true },
  ],
};

const VOCAL_ON_OFF_PATTERN: ExercisePattern = {
  id: 'foundations-1-1-vocal-on-off-pattern',
  name: '1.1 Vocal On/Off',
  leadInMs: 2000,
  phases: [
    { type: 'reference', durationMicrobeats: 8 },
    { type: 'rest', durationMicrobeats: 8 },
    { type: 'input', durationMicrobeats: 8 },
    { type: 'rest', durationMicrobeats: 8 },
  ],
};

export const FOUNDATIONS_1_1_VOCAL_ON_OFF: PitchMatchingTemplate = {
  id: 'foundations-1-1-vocal-on-off',
  name: '1.1 Vocal On/Off',
  description: 'Start and stop a pitched vocal sound without matching a specific note.',
  type: 'pitch-matching',
  difficulty: 1,
  category: 'foundations',
  speakingPitchUsage: 'asTonic',
  durationEstimate: '~30s',
  settingsSchema: SETTINGS_SCHEMA,
  config: {
    numLoops: 5,
    tempo: 96,
    referenceVolume: -12,
    minAmplitudeDb: -60,
    minVoicedMs: 400,
    minCoveragePct: 60,
    showImmediateFeedback: true,
    showScore: true,
  },
  pattern: VOCAL_ON_OFF_PATTERN,
};
