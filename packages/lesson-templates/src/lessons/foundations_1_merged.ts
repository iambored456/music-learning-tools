/**
 * Foundations (Merged 1.1-1.4)
 *
 * A single guided lesson that progresses through:
 * - Vocal on/off
 * - High/low contrast
 * - Pitch slide
 * - Hold steady
 */

import type { PitchMatchingTemplate, LessonSettingsSchema, ExercisePattern } from '../types.js';

const SETTINGS_SCHEMA: LessonSettingsSchema = {
  fields: [
    { key: 'tempoBpm', label: 'Tempo (BPM)', type: 'integer', default: 90, min: 60, max: 140 },
    { key: 'minVoicedMs', label: 'Min Voiced (ms)', type: 'integer', default: 400, min: 100, max: 2000 },
    { key: 'minAmplitudeDb', label: 'Min Amplitude (dB)', type: 'integer', default: -60, min: -80, max: -10 },
    { key: 'minCoveragePct', label: 'Min Coverage (%)', type: 'integer', default: 60, min: 30, max: 100 },
    { key: 'bandLowMinOffsetSemis', label: 'Low Band Min (semitones)', type: 'integer', default: 0, min: 0, max: 17 },
    { key: 'bandLowMaxOffsetSemis', label: 'Low Band Max (semitones)', type: 'integer', default: 5, min: 0, max: 17 },
    { key: 'bandHighMinOffsetSemis', label: 'High Band Min (semitones)', type: 'integer', default: 9, min: 0, max: 17 },
    { key: 'bandHighMaxOffsetSemis', label: 'High Band Max (semitones)', type: 'integer', default: 14, min: 0, max: 17 },
    { key: 'holdBandSemitones', label: 'Hold Band (semitones)', type: 'integer', default: 1, min: 1, max: 4 },
    { key: 'minSlideSemitones', label: 'Min Slide (semitones)', type: 'integer', default: 3, min: 1, max: 12 },
    { key: 'waitForInput', label: 'Wait For Correct Input', type: 'boolean', default: true },
    { key: 'showImmediateFeedback', label: 'Immediate Feedback', type: 'boolean', default: true },
    { key: 'showScore', label: 'Show Score', type: 'boolean', default: true },
  ],
};

const FOUNDATIONS_MERGED_PATTERN: ExercisePattern = {
  id: 'foundations-merged-1-1-to-1-4-pattern',
  name: 'Foundations 1.1-1.4',
  leadInMs: 2000,
  phases: [
    {
      type: 'reference',
      durationMicrobeats: 4,
      segmentId: 'foundations-1-1',
      segmentName: '1.1 Vocal On/Off',
      targetMode: 'fixedPitch',
      instructionMessage:
        "In this lesson, we are not trying to sing correctly. We are learning control with intention. First, turn your voice on and off. Any pitched sound is okay.",
      speakInstruction: true,
      label: 'LISTEN',
    },
    { type: 'rest', durationMicrobeats: 4, segmentId: 'foundations-1-1', segmentName: '1.1 Vocal On/Off' },
    {
      type: 'input',
      durationMicrobeats: 8,
      segmentId: 'foundations-1-1',
      segmentName: '1.1 Vocal On/Off',
      targetMode: 'windowAnyPitch',
      instructionMessage: 'Make a pitched sound now, then stop the sound completely.',
      speakInstruction: true,
      label: 'VOICE ON/OFF',
      waitForInput: true,
    },
    { type: 'rest', durationMicrobeats: 8, segmentId: 'foundations-1-1', segmentName: '1.1 Vocal On/Off' },

    {
      type: 'reference',
      durationMicrobeats: 4,
      segmentId: 'foundations-1-2',
      segmentName: '1.2 High/Low Contrast',
      targetMode: 'windowBand',
      bandRole: 'low',
      instructionMessage:
        "Great. Now change the sound higher and lower. There is no right note. Just make a clear contrast.",
      speakInstruction: true,
      label: 'LISTEN LOW',
    },
    { type: 'rest', durationMicrobeats: 4, segmentId: 'foundations-1-2', segmentName: '1.2 High/Low Contrast' },
    {
      type: 'input',
      durationMicrobeats: 8,
      segmentId: 'foundations-1-2',
      segmentName: '1.2 High/Low Contrast',
      targetMode: 'windowBand',
      bandRole: 'low',
      instructionMessage: 'Now sing in the lower zone.',
      speakInstruction: true,
      label: 'LOW',
      waitForInput: true,
    },
    { type: 'rest', durationMicrobeats: 4, segmentId: 'foundations-1-2', segmentName: '1.2 High/Low Contrast' },
    {
      type: 'reference',
      durationMicrobeats: 4,
      segmentId: 'foundations-1-2',
      segmentName: '1.2 High/Low Contrast',
      targetMode: 'windowBand',
      bandRole: 'high',
      label: 'LISTEN HIGH',
    },
    { type: 'rest', durationMicrobeats: 4, segmentId: 'foundations-1-2', segmentName: '1.2 High/Low Contrast' },
    {
      type: 'input',
      durationMicrobeats: 8,
      segmentId: 'foundations-1-2',
      segmentName: '1.2 High/Low Contrast',
      targetMode: 'windowBand',
      bandRole: 'high',
      instructionMessage: 'Now sing in the higher zone.',
      speakInstruction: true,
      label: 'HIGH',
      waitForInput: true,
    },
    { type: 'rest', durationMicrobeats: 8, segmentId: 'foundations-1-2', segmentName: '1.2 High/Low Contrast' },

    {
      type: 'reference',
      durationMicrobeats: 4,
      segmentId: 'foundations-1-3',
      segmentName: '1.3 Pitch Slide',
      targetMode: 'fixedPitch',
      instructionMessage:
        'Nice work. Keep the sound going and slide your pitch up, then down.',
      speakInstruction: true,
      label: 'LISTEN',
    },
    { type: 'rest', durationMicrobeats: 4, segmentId: 'foundations-1-3', segmentName: '1.3 Pitch Slide' },
    {
      type: 'input',
      durationMicrobeats: 8,
      segmentId: 'foundations-1-3',
      segmentName: '1.3 Pitch Slide',
      targetMode: 'slideWindow',
      slideDirection: 'up',
      instructionMessage: 'Keep voicing and slide upward slowly.',
      speakInstruction: true,
      label: 'SLIDE UP',
      waitForInput: true,
    },
    { type: 'rest', durationMicrobeats: 4, segmentId: 'foundations-1-3', segmentName: '1.3 Pitch Slide' },
    {
      type: 'input',
      durationMicrobeats: 8,
      segmentId: 'foundations-1-3',
      segmentName: '1.3 Pitch Slide',
      targetMode: 'slideWindow',
      slideDirection: 'down',
      instructionMessage: 'Keep voicing and slide downward slowly.',
      speakInstruction: true,
      label: 'SLIDE DOWN',
      waitForInput: true,
    },
    { type: 'rest', durationMicrobeats: 8, segmentId: 'foundations-1-3', segmentName: '1.3 Pitch Slide' },

    {
      type: 'reference',
      durationMicrobeats: 8,
      segmentId: 'foundations-1-4',
      segmentName: '1.4 Hold Steady',
      targetMode: 'fixedPitch',
      instructionMessage:
        'Excellent. Now hold one pitch steady. It does not need to be perfect, just controlled.',
      speakInstruction: true,
      label: 'LISTEN',
    },
    { type: 'rest', durationMicrobeats: 4, segmentId: 'foundations-1-4', segmentName: '1.4 Hold Steady' },
    {
      type: 'input',
      durationMicrobeats: 12,
      segmentId: 'foundations-1-4',
      segmentName: '1.4 Hold Steady',
      targetMode: 'holdSteady',
      instructionMessage: 'Pick any pitch and hold it steady.',
      speakInstruction: true,
      label: 'HOLD STEADY',
      waitForInput: true,
    },
    {
      type: 'rest',
      durationMicrobeats: 8,
      segmentId: 'foundations-1-4',
      segmentName: '1.4 Hold Steady',
      instructionMessage:
        'You learned four core vocal skills: starting sound, changing pitch, moving pitch, and holding pitch.',
      speakInstruction: true,
    },
  ],
};

export const FOUNDATIONS_1_MERGED: PitchMatchingTemplate = {
  id: 'foundations-1-merged',
  name: '1.1-1.4 Foundations Lesson',
  description:
    'A single continuous foundations lesson: vocal on/off, high-low contrast, slide control, and hold steady.',
  type: 'pitch-matching',
  difficulty: 1,
  category: 'foundations',
  speakingPitchUsage: 'asFloorNote',
  durationEstimate: '~2 min',
  settingsSchema: SETTINGS_SCHEMA,
  config: {
    numLoops: 1,
    tempo: 90,
    referenceVolume: -12,
    minAmplitudeDb: -60,
    minVoicedMs: 400,
    minCoveragePct: 60,
    bandLowMinOffsetSemis: 0,
    bandLowMaxOffsetSemis: 5,
    bandHighMinOffsetSemis: 9,
    bandHighMaxOffsetSemis: 14,
    holdBandSemitones: 1,
    minSlideSemitones: 3,
    waitForInput: true,
    showImmediateFeedback: true,
    showScore: true,
  },
  pattern: FOUNDATIONS_MERGED_PATTERN,
};
