import { FABER_NO_1 } from '@mlt/lesson-templates';
import type { SolfegeLine } from '../constants/ladukhin.js';
import type { PitchRowData } from '@mlt/pitch-data';
import { createSolfegeNotation, SOLFEGE_SOURCE_TONIC } from './solfegeNotation.js';

export interface PracticeVoice {
  id: string;
  name: string;
  color: string;
  line: SolfegeLine;
}

export interface VoicePracticeExercise {
  id: string;
  name: string;
  start: number;
  tempo: number;
  voices: PracticeVoice[];
}

const { config } = FABER_NO_1;
// Exercise columns are sixteenths; practice rows use quarter-note beats.
const columnsPerBeat = config.timeGrid.microbeatsPerMacrobeat * 2;
const durationBeats = config.timeGrid.microbeatCount / columnsPerBeat;
const sourceFloor = Math.min(...config.voices.flatMap(voice => voice.notes.map(note => note.midiPitch)));
const beatsPerMeasure = config.beatsPerMeasure ?? 4;

/** Reuse the supplied score, anchoring its lowest pitch to Speaking Pitch. */
export const FABER_PRACTICE: VoicePracticeExercise = {
  id: FABER_NO_1.id,
  name: FABER_NO_1.name,
  start: 1,
  tempo: config.tempo,
  voices: config.voices.map((voice, index) => ({
    id: voice.voiceId,
    name: voice.name,
    color: voice.color,
    line: {
      number: index + 1,
      meter: `${beatsPerMeasure}/4`,
      durationBeats,
      barlines: Array.from({ length: Math.ceil(durationBeats / beatsPerMeasure) }, (_, bar) => bar * beatsPerMeasure),
      notes: voice.notes.map(note => ({
        beat: note.startMicrobeatCol / columnsPerBeat,
        durationBeats: (note.endMicrobeatCol + 1 - note.startMicrobeatCol) / columnsPerBeat,
        midi: note.midiPitch - sourceFloor + SOLFEGE_SOURCE_TONIC,
      })),
    },
  })),
};

export function createVoicePracticeNotation(voices: PracticeVoice[], speakingMidi: number, fullRowData: PitchRowData[]) {
  const parts = voices.map(voice => ({ voice, notation: createSolfegeNotation(voice.line, speakingMidi, fullRowData) }));
  const base = parts[0]!.notation;
  const labels = new Map(parts.flatMap(({ notation }) => notation.placedNotes.map(note => [note.uuid, notation.getScaleDegreeLabel(note)] as const)));
  return {
    ...base,
    placedNotes: parts.flatMap(({ voice, notation }) => notation.placedNotes.map(note => ({ ...note, color: voice.color }))),
    getScaleDegreeLabel: (note: Parameters<typeof base.getScaleDegreeLabel>[0]) => labels.get(note.uuid) ?? { label: null, isAccidental: false },
  };
}
