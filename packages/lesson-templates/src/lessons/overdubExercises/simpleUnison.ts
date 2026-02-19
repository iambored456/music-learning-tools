/**
 * Simple Unison Exercise
 *
 * A two-voice exercise where the guide plays a simple melody
 * and the student sings the same part in unison.
 * Good for getting started with the overdub exercise system.
 */

import type { OverdubExerciseTemplate } from '../../types.js';

export const SIMPLE_UNISON: OverdubExerciseTemplate = {
  id: 'overdub-simple-unison',
  name: 'Simple Unison',
  description: 'Sing along with a simple melody in unison',
  type: 'overdub',
  difficulty: 1,
  category: 'workshop',
  speakingPitchUsage: 'none',
  durationEstimate: '~15s',
  settingsSchema: {
    fields: [
      { key: 'tempo', label: 'Tempo (BPM)', type: 'integer', default: 80, min: 60, max: 140, step: 5 },
    ],
  },
  config: {
    tempo: 80,
    timeGrid: {
      microbeatCount: 16,
      microbeatsPerMacrobeat: 2,
      macrobeatGroupings: [2, 2, 2, 2, 2, 2, 2, 2],
    },
    voices: [
      {
        voiceId: 'guide-melody',
        color: '#4a90e2',
        name: 'Guide',
        notes: [
          { startMicrobeatCol: 0, endMicrobeatCol: 1, midiPitch: 60, pitchName: 'C4' },
          { startMicrobeatCol: 2, endMicrobeatCol: 3, midiPitch: 62, pitchName: 'D4' },
          { startMicrobeatCol: 4, endMicrobeatCol: 5, midiPitch: 64, pitchName: 'E4' },
          { startMicrobeatCol: 6, endMicrobeatCol: 7, midiPitch: 65, pitchName: 'F4' },
          { startMicrobeatCol: 8, endMicrobeatCol: 9, midiPitch: 67, pitchName: 'G4' },
          { startMicrobeatCol: 10, endMicrobeatCol: 11, midiPitch: 65, pitchName: 'F4' },
          { startMicrobeatCol: 12, endMicrobeatCol: 13, midiPitch: 64, pitchName: 'E4' },
          { startMicrobeatCol: 14, endMicrobeatCol: 15, midiPitch: 60, pitchName: 'C4' },
        ],
      },
      {
        voiceId: 'student-melody',
        color: '#d66573',
        name: 'Your Part',
        notes: [
          { startMicrobeatCol: 0, endMicrobeatCol: 1, midiPitch: 60, pitchName: 'C4' },
          { startMicrobeatCol: 2, endMicrobeatCol: 3, midiPitch: 62, pitchName: 'D4' },
          { startMicrobeatCol: 4, endMicrobeatCol: 5, midiPitch: 64, pitchName: 'E4' },
          { startMicrobeatCol: 6, endMicrobeatCol: 7, midiPitch: 65, pitchName: 'F4' },
          { startMicrobeatCol: 8, endMicrobeatCol: 9, midiPitch: 67, pitchName: 'G4' },
          { startMicrobeatCol: 10, endMicrobeatCol: 11, midiPitch: 65, pitchName: 'F4' },
          { startMicrobeatCol: 12, endMicrobeatCol: 13, midiPitch: 64, pitchName: 'E4' },
          { startMicrobeatCol: 14, endMicrobeatCol: 15, midiPitch: 60, pitchName: 'C4' },
        ],
      },
    ],
    minMidiPitch: 57,
    maxMidiPitch: 70,
    tonalCenter: { pitchClass: 'C' },
    countInBeats: 4,
  },
};
