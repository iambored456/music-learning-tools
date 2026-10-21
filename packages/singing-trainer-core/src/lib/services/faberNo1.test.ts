import { describe, expect, it } from 'vitest';
import { ALL_LESSONS, FABER_NO_1 } from '@mlt/lesson-templates';
import { calculateExerciseDurationMs, convertExerciseVoicesToTargetNotes } from './exerciseVoiceConverter.js';
import { FABER_PRACTICE, createVoicePracticeNotation } from './faberPractice.js';
import { generateRowDataForMidiRange } from '@mlt/pitch-data';
import { calculateSolfegeAccuracy } from './solfegePractice.js';

describe('Faber No. 1 bicinium', () => {
  const { config } = FABER_NO_1;

  it('registers one named exercise in the Bicinia category', () => {
    expect(ALL_LESSONS.filter(template => template.id === FABER_NO_1.id)).toEqual([FABER_NO_1]);
    expect(FABER_NO_1).toMatchObject({ name: 'Faber No. 1', category: 'bicinia', speakingPitchUsage: 'asFloorNote' });
  });

  it('retains the supplied two voices and their note counts without within-voice overlaps', () => {
    expect(config.voices.map(voice => [voice.color, voice.notes.length])).toEqual([
      ['#44bcef', 24], ['#d293e0', 21]
    ]);
    for (const voice of config.voices) {
      voice.notes.forEach((note, index) => {
        expect(note.startMicrobeatCol).toBeGreaterThanOrEqual(0);
        expect(note.endMicrobeatCol).toBeLessThan(config.timeGrid.microbeatCount);
        if (index > 0) expect(note.startMicrobeatCol).toBeGreaterThan(voice.notes[index - 1]!.endMicrobeatCol);
      });
    }
  });

  it('preserves eighth-note timing at 90 BPM and the delayed second entrance', () => {
    expect(config.tempo).toBe(90);
    const notes = convertExerciseVoicesToTargetNotes(config.voices, config.timeGrid, config.tempo);
    const blue = notes.filter(note => note.voiceId === 'faber-voice-1');
    const purple = notes.filter(note => note.voiceId === 'faber-voice-2');
    expect(blue[0]).toMatchObject({ midi: 67, startTimeMs: 0 });
    expect(blue[0]!.durationMs).toBeCloseTo(4 * 60_000 / 90 / 2);
    expect(purple[0]).toMatchObject({ midi: 67 });
    expect(purple[0]!.startTimeMs).toBeCloseTo(8 * 60_000 / 90 / 2);
    expect(calculateExerciseDurationMs(config.timeGrid, config.tempo)).toBeCloseTo(44 * 60_000 / 90);
    for (const voice of [blue, purple]) {
      const final = voice.at(-1)!;
      expect(final.startTimeMs + final.durationMs).toBeCloseTo(44 * 60_000 / 90);
    }
  });

  it.each(['faber-voice-1', 'faber-voice-2'])('supports practicing %s with the other voice as reference', voiceId => {
    const notes = convertExerciseVoicesToTargetNotes(config.voices, config.timeGrid, config.tempo, voiceId);
    expect(notes.filter(note => note.role === 'input').every(note => note.voiceId === voiceId)).toBe(true);
    expect(notes.filter(note => note.role === 'reference').every(note => note.voiceId !== voiceId)).toBe(true);
    expect(notes.filter(note => note.role === 'input').length).toBeGreaterThan(0);
    expect(notes.filter(note => note.role === 'reference').length).toBeGreaterThan(0);
  });

  it('maps both parts into one practice score without losing timing, colors or pitch relationships', () => {
    const gamut = generateRowDataForMidiRange(0, 127);
    const notation = createVoicePracticeNotation(FABER_PRACTICE.voices, 55, gamut);
    expect(notation.columnWidths).toHaveLength(88);
    expect(new Set(notation.placedNotes.map(note => note.uuid)).size).toBe(45);
    expect(notation.placedNotes.filter(note => note.color === '#44bcef')).toHaveLength(24);
    expect(notation.placedNotes.filter(note => note.color === '#d293e0')).toHaveLength(21);
    expect(Math.min(...notation.placedNotes.map(note => gamut[note.row]!.midi!))).toBe(55);
    FABER_PRACTICE.voices.forEach((voice, index) => {
      const source = convertExerciseVoicesToTargetNotes([config.voices[index]!], config.timeGrid, config.tempo);
      expect(voice.line.durationBeats).toBe(44);
      voice.line.notes.forEach((note, noteIndex) => {
        expect(note.beat * 60_000 / config.tempo).toBeCloseTo(source[noteIndex]!.startTimeMs);
        expect(note.durationBeats * 60_000 / config.tempo).toBeCloseTo(source[noteIndex]!.durationMs);
      });
    });
    expect(notation.getScaleDegreeLabel(notation.placedNotes[0]!).label).toBe('1');
  });

  it('scores only the selected voice and preserves the second voice entrance rest', () => {
    const [first, second] = FABER_PRACTICE.voices;
    const trail = Array.from({ length: 20 }, (_, index) => ({ beat: 4 + index * 0.1, midi: 60, move: index === 0 }));
    expect(calculateSolfegeAccuracy(second!.line, trail, 60, 60, undefined, 6)).toBe(100);
    expect(calculateSolfegeAccuracy(first!.line, trail, 60, 60, undefined, 6)).toBe(0);
  });
});
