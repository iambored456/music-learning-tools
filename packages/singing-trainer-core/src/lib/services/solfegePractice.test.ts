import { describe, expect, it } from 'vitest';
import type { SolfegeLine } from '../constants/ladukhin.js';
import { calculateSolfegeAccuracy, solfegeCountdown } from './solfegePractice.js';
import { solfegeJustMidi, solfegeMidi } from './solfegeNotation.js';
import type { SolfegeTrailPoint } from './solfegeTrail.js';

const line: SolfegeLine = {
  number: 1, meter: '3/4', durationBeats: 3, barlines: [0],
  notes: [
    { beat: 0, durationBeats: 1, midi: 60 },
    { beat: 1, durationBeats: 1, midi: null },
    { beat: 2, durationBeats: 1, midi: 64 },
  ],
};

function sungNote(start: number, midi: number): SolfegeTrailPoint[] {
  return Array.from({ length: 20 }, (_, i) => ({ beat: start + i / 20, midi, move: i === 0 }));
}

describe('solfege countdown', () => {
  it('counts 4, 3, 2 and 1 once per beat, ending at the first barline', () => {
    expect([-4.1, -4, -3.01, -3, -2.01, -2, -1, -0.01, 0, 1].map(beat => solfegeCountdown(beat)))
      .toEqual([4, 4, 4, 3, 3, 2, 1, 1, null, null]);
  });

  it('supports other beat counts and ignores invalid timeline positions', () => {
    expect([-3, -2, -1, 0].map(beat => solfegeCountdown(beat, 3))).toEqual([3, 2, 1, null]);
    expect(solfegeCountdown(NaN)).toBeNull();
  });
});

describe('solfege row accuracy', () => {
  it('uses the selected temperament for the scoring target', () => {
    const fourthLine: SolfegeLine = {
      number: 1, meter: '4/4', durationBeats: 1, barlines: [0],
      notes: [{ beat: 0, durationBeats: 1, midi: 65 }],
    };
    const strict = { toleranceCents: 0.5, maxSampleHoldMs: 150 };
    const equalFourth = sungNote(0, solfegeMidi(65, 60, 'equal'));
    const justFourth = sungNote(0, solfegeMidi(65, 60, 'just'));
    expect(calculateSolfegeAccuracy(fourthLine, equalFourth, 60, 60, strict, 1, 'equal')).toBe(100);
    expect(calculateSolfegeAccuracy(fourthLine, equalFourth, 60, 60, strict, 1, 'just')).toBe(0);
    expect(calculateSolfegeAccuracy(fourthLine, justFourth, 60, 60, strict, 1, 'just')).toBe(100);
  });
  it('scores only the elapsed part of the current note and does not penalize future notes', () => {
    const trail = sungNote(0, 60);
    expect(calculateSolfegeAccuracy(line, trail, 60, 60, undefined, 0.5)).toBe(100);
    expect(calculateSolfegeAccuracy(line, trail, 60, 60, undefined, 1)).toBe(100);
    expect(calculateSolfegeAccuracy(line, trail, 60, 60, undefined, 1.5)).toBe(100);
    expect(calculateSolfegeAccuracy(line, trail, 60, 60, undefined, 2.5)).toBe(67);
    expect(calculateSolfegeAccuracy(line, trail, 60, 60, undefined, 3)).toBe(50);
  });

  it('ignores future samples and clamps scoring to the row timeline', () => {
    const trail = [...sungNote(0, 60), ...sungNote(2, solfegeJustMidi(64, 60))];
    expect(calculateSolfegeAccuracy(line, trail, 60, 60, undefined, -6)).toBe(0);
    expect(calculateSolfegeAccuracy(line, trail, 60, 60, undefined, 0)).toBe(0);
    expect(calculateSolfegeAccuracy(line, trail, 60, 60, undefined, 0.025)).toBe(100);
    expect(calculateSolfegeAccuracy(line, trail, 60, 60, undefined, 20))
      .toBe(calculateSolfegeAccuracy(line, trail, 60, 60));
  });

  it('scores justly tuned, transposed singing at 100% and excludes rests', () => {
    const trail = [...sungNote(0, 55), ...sungNote(2, solfegeJustMidi(64, 55))];
    expect(calculateSolfegeAccuracy(line, trail, 55, 60)).toBe(100);
  });

  it('counts silence and missing notes rather than rewarding a short correct fragment', () => {
    expect(calculateSolfegeAccuracy(line, [], 60, 60)).toBe(0);
    expect(calculateSolfegeAccuracy(line, sungNote(0, 60), 60, 60)).toBe(50);
    expect(calculateSolfegeAccuracy(line, [{ beat: 0, midi: 60, move: true }], 60, 60)).toBe(8);
  });

  it('applies cents tolerance without treating a wrong octave as correct', () => {
    const third = solfegeJustMidi(64, 60);
    const slightlySharp = [...sungNote(0, 60.6), ...sungNote(2, third + 0.6)];
    expect(calculateSolfegeAccuracy(line, slightlySharp, 60, 60)).toBe(0);
    expect(calculateSolfegeAccuracy(line, slightlySharp, 60, 60, { toleranceCents: 75, maxSampleHoldMs: 150 })).toBe(100);
    expect(calculateSolfegeAccuracy(line, [...sungNote(0, 72), ...sungNote(2, third + 12)], 60, 60)).toBe(0);
  });

  it('weights note duration and rejects count-in and post-row samples', () => {
    const sustained: SolfegeLine = { ...line, notes: [
      { beat: 0, durationBeats: 1, midi: 60 },
      { beat: 1, durationBeats: 2, midi: 62 },
    ] };
    const extra: SolfegeTrailPoint[] = [
      { beat: -1, midi: 60, move: true }, { beat: 3, midi: 62, move: true },
    ];
    expect(calculateSolfegeAccuracy(sustained, [...extra, ...sungNote(0, 60)], 60, 60)).toBe(33);
  });
});
