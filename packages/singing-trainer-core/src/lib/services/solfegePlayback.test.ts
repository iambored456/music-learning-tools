import { describe, expect, it } from 'vitest';
import type { SolfegeLine } from '../constants/ladukhin.js';
import { solfegeMidi } from './solfegeNotation.js';
import { getSolfegePlaybackMidi } from './solfegePlayback.js';

const line: SolfegeLine = {
  number: 1, meter: '4/4', durationBeats: 3, barlines: [0],
  notes: [
    { beat: 0, durationBeats: 1, midi: 60 },
    { beat: 1, durationBeats: 1, midi: 72 },
    { beat: 2, durationBeats: 1, midi: 60 },
  ],
};

describe('exercise playback circle', () => {
  it('eases up and down between adjacent notes and settles after 80 ms', () => {
    expect(getSolfegePlaybackMidi(line, 0, 60, 60, 'equal')).toBe(60);
    expect(getSolfegePlaybackMidi(line, 1, 60, 60, 'equal')).toBe(60);
    expect(getSolfegePlaybackMidi(line, 1.02, 60, 60, 'equal')).toBeCloseTo(61.875);
    expect(getSolfegePlaybackMidi(line, 1.04, 60, 60, 'equal')).toBeCloseTo(66);
    expect(getSolfegePlaybackMidi(line, 1.08, 60, 60, 'equal')).toBe(72);
    expect(getSolfegePlaybackMidi(line, 2.04, 60, 60, 'equal')).toBeCloseTo(66);
    expect(getSolfegePlaybackMidi(line, 2.08, 60, 60, 'equal')).toBe(60);
  });

  it('uses the same real-time glide at different tempos', () => {
    expect(getSolfegePlaybackMidi(line, 1.08, 60, 120, 'equal')).toBeCloseTo(66);
    expect(getSolfegePlaybackMidi(line, 1.16, 60, 120, 'equal')).toBe(72);
  });

  it('does not bridge explicit rests, timing gaps, or the ends of playback', () => {
    const withRest = { ...line, notes: line.notes.map((note, index) => index === 1 ? { ...note, midi: null } : note) };
    expect(getSolfegePlaybackMidi(withRest, 1.04, 60, 60, 'equal')).toBeNull();
    expect(getSolfegePlaybackMidi(withRest, 2, 60, 60, 'equal')).toBe(60);
    const withGap = { ...line, notes: [{ ...line.notes[0]!, durationBeats: 0.5 }, ...line.notes.slice(1)] };
    expect(getSolfegePlaybackMidi(withGap, 0.75, 60, 60, 'equal')).toBeNull();
    expect(getSolfegePlaybackMidi(withGap, 1, 60, 60, 'equal')).toBe(72);
    expect(getSolfegePlaybackMidi(line, -1, 60, 60, 'equal')).toBeNull();
    expect(getSolfegePlaybackMidi(line, 3, 60, 60, 'equal')).toBeNull();
  });

  it('interpolates tuned and transposed pitches separately for each part', () => {
    const otherPart = { ...line, notes: [{ beat: 1, durationBeats: 1, midi: 64 }] };
    const expected = (solfegeMidi(60, 55, 'just') + solfegeMidi(72, 55, 'just')) / 2;
    expect(getSolfegePlaybackMidi(line, 1.04, 55, 60, 'just')).toBeCloseTo(expected);
    expect(getSolfegePlaybackMidi(otherPart, 1.04, 55, 60, 'just')).toBe(solfegeMidi(64, 55, 'just'));
  });

  it('finishes within a short note before another transition begins', () => {
    const short = { ...line, notes: [line.notes[0]!, { beat: 1, durationBeats: 0.1, midi: 72 }] };
    expect(getSolfegePlaybackMidi(short, 1.05, 60, 60, 'equal')).toBe(72);
  });
});
