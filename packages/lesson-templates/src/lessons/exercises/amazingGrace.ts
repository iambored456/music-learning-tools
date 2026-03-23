/**
 * Amazing Grace (Melody)
 *
 * Source timing and pitches imported from MusicXML provided by user.
 */

import type { OverdubExerciseTemplate } from '../../types.js';

export const AMAZING_GRACE: OverdubExerciseTemplate = {
  id: 'exercise-amazing-grace',
  name: 'Amazing Grace (Melody)',
  description: 'Sing the melody with lyric syllables and optional wait-gated scroll.',
  type: 'overdub',
  difficulty: 1,
  category: 'exercises',
  speakingPitchUsage: 'none',
  durationEstimate: '~32s',
  settingsSchema: {
    fields: [
      { key: 'tempo', label: 'Tempo (BPM)', type: 'integer', default: 90, min: 40, max: 200, step: 1 },
      { key: 'waitForInput', label: 'Waitgate', type: 'boolean', default: true },
    ],
  },
  config: {
    tempo: 90,
    timeGrid: {
      microbeatCount: 192,
      microbeatsPerMacrobeat: 2,
      macrobeatGroupings: Array.from({ length: 96 }, () => 2 as const),
    },
    beatsPerMeasure: 3,
    pickupBeats: 1,
    voices: [
      {
        voiceId: 'melody',
        color: '#4a90e2',
        name: 'Melody',
        notes: [
          { startMicrobeatCol: 0, endMicrobeatCol: 3, midiPitch: 60, pitchName: 'C4', lyric: 'A' },
          { startMicrobeatCol: 4, endMicrobeatCol: 11, midiPitch: 65, pitchName: 'F4', lyric: 'ma' },
          { startMicrobeatCol: 12, endMicrobeatCol: 13, midiPitch: 69, pitchName: 'A4', lyric: 'zing' },
          { startMicrobeatCol: 14, endMicrobeatCol: 15, midiPitch: 65, pitchName: 'F4' },
          { startMicrobeatCol: 16, endMicrobeatCol: 23, midiPitch: 69, pitchName: 'A4', lyric: 'grace' },
          { startMicrobeatCol: 24, endMicrobeatCol: 27, midiPitch: 67, pitchName: 'G4', lyric: 'how' },
          { startMicrobeatCol: 28, endMicrobeatCol: 35, midiPitch: 65, pitchName: 'F4', lyric: 'sweet' },
          { startMicrobeatCol: 36, endMicrobeatCol: 39, midiPitch: 62, pitchName: 'D4', lyric: 'the' },
          { startMicrobeatCol: 40, endMicrobeatCol: 47, midiPitch: 60, pitchName: 'C4', lyric: 'sound' },
          { startMicrobeatCol: 48, endMicrobeatCol: 51, midiPitch: 60, pitchName: 'C4', lyric: 'that' },
          { startMicrobeatCol: 52, endMicrobeatCol: 59, midiPitch: 65, pitchName: 'F4', lyric: 'saved' },
          { startMicrobeatCol: 60, endMicrobeatCol: 61, midiPitch: 69, pitchName: 'A4', lyric: 'a' },
          { startMicrobeatCol: 62, endMicrobeatCol: 63, midiPitch: 65, pitchName: 'F4' },
          { startMicrobeatCol: 64, endMicrobeatCol: 71, midiPitch: 69, pitchName: 'A4', lyric: 'wretch' },
          { startMicrobeatCol: 72, endMicrobeatCol: 75, midiPitch: 67, pitchName: 'G4', lyric: 'like' },
          { startMicrobeatCol: 76, endMicrobeatCol: 95, midiPitch: 72, pitchName: 'C5', lyric: 'me' },
          { startMicrobeatCol: 96, endMicrobeatCol: 97, midiPitch: 69, pitchName: 'A4', lyric: 'I' },
          { startMicrobeatCol: 98, endMicrobeatCol: 99, midiPitch: 72, pitchName: 'C5' },
          { startMicrobeatCol: 100, endMicrobeatCol: 107, midiPitch: 72, pitchName: 'C5', lyric: 'once' },
          { startMicrobeatCol: 108, endMicrobeatCol: 109, midiPitch: 69, pitchName: 'A4', lyric: 'was' },
          { startMicrobeatCol: 110, endMicrobeatCol: 111, midiPitch: 65, pitchName: 'F4' },
          { startMicrobeatCol: 112, endMicrobeatCol: 119, midiPitch: 69, pitchName: 'A4', lyric: 'lost' },
          { startMicrobeatCol: 120, endMicrobeatCol: 123, midiPitch: 67, pitchName: 'G4', lyric: 'but' },
          { startMicrobeatCol: 124, endMicrobeatCol: 131, midiPitch: 65, pitchName: 'F4', lyric: 'now' },
          { startMicrobeatCol: 132, endMicrobeatCol: 135, midiPitch: 62, pitchName: 'D4', lyric: 'am' },
          { startMicrobeatCol: 136, endMicrobeatCol: 143, midiPitch: 60, pitchName: 'C4', lyric: 'found' },
          { startMicrobeatCol: 144, endMicrobeatCol: 147, midiPitch: 60, pitchName: 'C4', lyric: 'Was' },
          { startMicrobeatCol: 148, endMicrobeatCol: 155, midiPitch: 65, pitchName: 'F4', lyric: 'blind' },
          { startMicrobeatCol: 156, endMicrobeatCol: 157, midiPitch: 69, pitchName: 'A4', lyric: 'but' },
          { startMicrobeatCol: 158, endMicrobeatCol: 159, midiPitch: 65, pitchName: 'F4' },
          { startMicrobeatCol: 160, endMicrobeatCol: 167, midiPitch: 69, pitchName: 'A4', lyric: 'now' },
          { startMicrobeatCol: 168, endMicrobeatCol: 171, midiPitch: 67, pitchName: 'G4', lyric: 'I' },
          { startMicrobeatCol: 172, endMicrobeatCol: 183, midiPitch: 65, pitchName: 'F4', lyric: 'see' },
        ],
      },
    ],
    minMidiPitch: 57,
    maxMidiPitch: 75,
    tonalCenter: {
      pitchClass: 'F',
      mode: 'major',
    },
    countInBeats: 3,
    waitForInput: true,
  },
};
