import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ladukhinLines } from '../constants/ladukhin.js';
import { solfegeJustMidi } from './solfegeNotation.js';

const mocks = vi.hoisted(() => ({
  notes: vi.fn(), hits: vi.fn(), dispose: vi.fn(), load: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('tone', () => ({
  start: vi.fn().mockResolvedValue(undefined), immediate: () => 10,
  Synth: class {
    toDestination() { return this; }
    triggerAttackRelease = mocks.notes;
    dispose = mocks.dispose;
  },
  Player: class {
    mute = false;
    toDestination() { return this; }
    load = mocks.load;
    start = mocks.hits;
    dispose = mocks.dispose;
  },
}));
vi.mock('@mlt/audio-samples/local-samples', () => ({ getLocalDrumSampleById: () => ({ url: 'kick.wav' }) }));
import { SolfegeAudio } from './solfegeAudio.js';

beforeEach(() => vi.clearAllMocks());

describe('solfege row audio', () => {
  it('uses just intervals across transpositions and octaves', () => {
    expect(2 ** ((solfegeJustMidi(64, 55) - 55) / 12)).toBeCloseTo(5 / 4);
    expect(solfegeJustMidi(72, 55)).toBe(67);
    expect(2 ** ((solfegeJustMidi(59, 55) - 55) / 12)).toBeCloseTo(15 / 16);
  });

  it('schedules score barlines and pitched notes against the same clock', async () => {
    const audio = new SolfegeAudio();
    await audio.init();
    const source = ladukhinLines[0]!;
    const line = { ...source, notes: source.notes.map((note, index) => index === 1 ? { ...note, midi: null } : note) };
    audio.schedule(line, 60, 120, 3, true, true);
    expect(mocks.hits.mock.calls.map(call => call[0])).toEqual(line.barlines.map(beat => 11.6 + beat * 0.5));
    const notes = line.notes.filter(note => note.midi !== null);
    expect(mocks.notes).toHaveBeenCalledTimes(notes.length);
    notes.forEach((note, index) => {
      expect(mocks.notes.mock.calls[index]![2]).toBeCloseTo(11.6 + note.beat * 0.5);
    });
    audio.dispose();
    expect(mocks.dispose).toHaveBeenCalledTimes(2);
  });

  it('keeps singing practice free of melody and ignores cancelled starts', async () => {
    const audio = new SolfegeAudio();
    await audio.init();
    audio.schedule(ladukhinLines[0]!, 60, 80, 2, false, true);
    expect(mocks.notes).toHaveBeenCalledTimes(0);
    audio.dispose();
    mocks.hits.mockClear();
    audio.schedule(ladukhinLines[0]!, 60, 80, 0, true, true);
    expect(mocks.hits).toHaveBeenCalledTimes(0);
    expect(mocks.notes).toHaveBeenCalledTimes(0);
  });
});
