import { describe, expect, it } from 'vitest';
import { generateRowDataForMidiRange } from '@mlt/pitch-data';
import { ladukhinLines } from '../constants/ladukhin.js';
import { createSolfegeNotation } from './solfegeNotation.js';

const gamut = generateRowDataForMidiRange(21, 108);

describe('Ladukhin Student Notation mapping', () => {
  it('maps source C to speaking pitch and keeps degrees unchanged by transposition', () => {
    const line = ladukhinLines[0]!;
    const notation = createSolfegeNotation(line, 55, gamut);
    for (const [index, note] of notation.placedNotes.entries()) {
      expect(note.row).toBe(note.globalRow);
      expect(gamut[note.globalRow!]!.midi).toBe(line.notes[index]!.midi! - 5);
      const original = createSolfegeNotation(line, 60, gamut);
      expect(notation.getScaleDegreeLabel(note)).toEqual(original.getScaleDegreeLabel(note));
    }
    const tonic = notation.placedNotes.find(note => gamut[note.row]!.midi === 55)!;
    expect(notation.getScaleDegreeLabel(tonic).label).toBe('1');
  });

  it('preserves note durations in eighth-note canvas columns for every line', () => {
    for (const line of ladukhinLines) {
      const notation = createSolfegeNotation(line, 60, gamut);
      const pitched = line.notes.filter(note => note.midi !== null);
      expect(notation.placedNotes).toHaveLength(pitched.length);
      notation.placedNotes.forEach((note, index) => {
        expect(note.startColumnIndex).toBe(pitched[index]!.beat * 2);
        expect(note.endColumnIndex - note.startColumnIndex + 1).toBe(pitched[index]!.durationBeats * 2);
        expect(note.shape).toBe(pitched[index]!.durationBeats < 1 ? 'oval' : 'circle');
        expect(notation.getScaleDegreeLabel(note).label).toBeTruthy();
      });
    }
  });

  it('enables every beat boundary and uses the actual score bars, including pickups', () => {
    for (const line of ladukhinLines) {
      const notation = createSolfegeNotation(line, 60, gamut);
      expect(notation.macrobeatGroupings).toHaveLength(line.durationBeats);
      expect(notation.macrobeatGroupings.every(group => group === 2)).toBe(true);
      const solidBeats = notation.macrobeatBoundaryStyles.flatMap((style, index) => style === 'solid' ? [index + 1] : []);
      expect(solidBeats).toEqual(line.barlines.filter(beat => beat > 0));
    }
  });
});
