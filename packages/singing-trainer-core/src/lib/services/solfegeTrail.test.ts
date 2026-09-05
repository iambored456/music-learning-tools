import { describe, expect, it } from 'vitest';
import { toSolfegeTrailPoint } from './solfegeTrail.js';
import { ladukhinLines } from '../constants/ladukhin.js';

describe('solfege microphone timing', () => {
  const sample = { time: 4000, midi: 60, frequency: 261.6, clarity: 0.99 };
  it('places the first sung beat after the count-in', () => {
    expect(toSolfegeTrailPoint(sample, 1000, 60, 3, 16, -Infinity)).toEqual({ beat: 0, midi: 60, move: true });
    expect(toSolfegeTrailPoint({ ...sample, time: 5000 }, 1000, 60, 3, 16, 4990)?.beat).toBe(1);
  });
  it('rejects silence, count-in samples, and samples beyond the row', () => {
    expect(toSolfegeTrailPoint({ ...sample, frequency: 0, midi: 0, clarity: 0 }, 1000, 60, 3, 16, 3990)).toBeNull();
    expect(toSolfegeTrailPoint({ ...sample, time: 3990 }, 1000, 60, 3, 16, 3980)).toBeNull();
    expect(toSolfegeTrailPoint({ ...sample, time: 21000 }, 1000, 60, 3, 16, 3990)).toBeNull();
  });
  it('breaks the trail after a gap instead of joining across silence', () => {
    expect(toSolfegeTrailPoint(sample, 1000, 60, 3, 16, 3700)?.move).toBe(true);
    expect(toSolfegeTrailPoint(sample, 1000, 60, 3, 16, 3990)?.move).toBe(false);
  });
});

describe('Ladukhin imported score', () => {
  it('contains the three complete groups in score order', () => {
    expect(ladukhinLines.map(row => row.number)).toEqual([1, 51, 101].flatMap(start => Array.from({ length: 12 }, (_, i) => start + i)));
    expect(ladukhinLines.reduce((sum, row) => sum + row.notes.length, 0)).toBe(585);
  });
  it('keeps contiguous note/rest timing and barlines inside each row', () => {
    for (const row of ladukhinLines) {
      let end = 0;
      for (const note of row.notes) {
        expect(note.beat).toBe(end);
        expect(note.durationBeats).toBeGreaterThan(0);
        end += note.durationBeats;
      }
      expect(end).toBe(row.durationBeats);
      expect(row.barlines[0]).toBe(0);
      expect(row.barlines.every(beat => beat >= 0 && beat < end)).toBe(true);
    }
  });
});
