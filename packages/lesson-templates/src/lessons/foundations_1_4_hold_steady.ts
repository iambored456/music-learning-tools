/**
 * Foundations 1.4: Hold Steady
 *
 * Train holding a pitch steady within a wide tolerance band.
 */

import type { PitchMatchingTemplate, LessonSettingsSchema, ExercisePattern } from '../types.js';

const SETTINGS_SCHEMA: LessonSettingsSchema = {
  fields: [
    { key: 'loopCount', label: 'Loops', type: 'integer', default: 4, min: 2, max: 10 },
    { key: 'tempoBpm', label: 'Tempo (BPM)', type: 'integer', default: 90, min: 60, max: 140 },
    { key: 'minVoicedMs', label: 'Min Voiced (ms)', type: 'integer', default: 400, min: 100, max: 2000 },
    { key: 'minAmplitudeDb', label: 'Min Amplitude (dB)', type: 'integer', default: -60, min: -80, max: -10 },
    { key: 'minCoveragePct', label: 'Min Coverage (%)', type: 'integer', default: 80, min: 30, max: 100 },
    { key: 'holdBandSemitones', label: 'Hold Band (semitones)', type: 'integer', default: 1, min: 1, max: 4 },
    { key: 'showImmediateFeedback', label: 'Immediate Feedback', type: 'boolean', default: true },
    { key: 'showScore', label: 'Show Score', type: 'boolean', default: true },
  ],
};

const HOLD_STEADY_PATTERN: ExercisePattern = {
  id: 'foundations-1-4-hold-steady-pattern',
  name: '1.4 Hold Steady',
  leadInMs: 2000,
  phases: [
    { type: 'reference', durationMicrobeats: 8 },
    { type: 'rest', durationMicrobeats: 4 },
    { type: 'input', durationMicrobeats: 12, label: 'HOLD STEADY' },
    { type: 'rest', durationMicrobeats: 8 },
  ],
};

export const FOUNDATIONS_1_4_HOLD_STEADY: PitchMatchingTemplate = {
  id: 'foundations-1-4-hold-steady',
  name: '1.4 Hold Steady',
  description: 'Hold a pitch steady within a wide tolerance band.',
  type: 'pitch-matching',
  difficulty: 1,
  category: 'foundations',
  speakingPitchUsage: 'asTonic',
  durationEstimate: '~40s',
  settingsSchema: SETTINGS_SCHEMA,
  config: {
    numLoops: 4,
    tempo: 90,
    referenceVolume: -12,
    minAmplitudeDb: -60,
    minVoicedMs: 400,
    minCoveragePct: 80,
    holdBandSemitones: 1,
    showImmediateFeedback: true,
    showScore: true,
  },
  pattern: HOLD_STEADY_PATTERN,
};
