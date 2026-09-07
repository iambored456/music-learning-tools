import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ladukhinLines } from '../constants/ladukhin.js';
import { solfegeJustMidi } from './solfegeNotation.js';
import { SOLFEGE_COUNT_IN_BEATS } from './solfegePractice.js';

const mocks = vi.hoisted(() => ({
  notes: vi.fn(), hits: vi.fn(), dispose: vi.fn(), load: vi.fn().mockResolvedValue(undefined),
  cues: vi.fn(), connect: vi.fn(),
}));
vi.mock('tone', () => ({
  start: vi.fn().mockResolvedValue(undefined), immediate: () => 10,
  Synth: class {
    connect(output: unknown) { mocks.connect('synth', output); return this; }
    triggerAttackRelease = mocks.notes;
    dispose = mocks.dispose;
  },
  Player: class {
    mute = false;
    url = '';
    connect(output: unknown) { mocks.connect('player', output); return this; }
    load(url: string) { this.url = url; return mocks.load(url); }
    start(time: number) {
      if (this.url.includes('congah')) mocks.cues(this.url, time, this.mute);
      else mocks.hits(time);
    }
    dispose = mocks.dispose;
  },
}));
vi.mock('@mlt/audio-samples/local-samples', () => ({ getLocalDrumSampleById: (id: string) => ({ url: `${id}.wav` }) }));
import { SolfegeAudio } from './solfegeAudio.js';
vi.mock('./audioMixer.js', () => ({ getAudioMasterOutput: (channel: string) => channel }));

beforeEach(() => vi.clearAllMocks());

describe('solfege row audio', () => {
  it('routes melody, drums and both count-in samples to their master channels', async () => {
    const audio = new SolfegeAudio();
    await audio.init();
    expect(mocks.connect.mock.calls).toEqual([
      ['synth', 'synth'], ['player', 'bassDrum'], ['player', 'countIn'], ['player', 'countIn'],
    ]);
    audio.dispose();
  });
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
    expect(mocks.dispose).toHaveBeenCalledTimes(4);
  });

  it('keeps singing practice free of melody and ignores cancelled starts', async () => {
    const audio = new SolfegeAudio();
    await audio.init();
    audio.schedule(ladukhinLines[0]!, 60, 80, 2, false, true);
    expect(mocks.notes).toHaveBeenCalledTimes(0);
    audio.dispose();
    mocks.hits.mockClear();
    mocks.cues.mockClear();
    audio.schedule(ladukhinLines[0]!, 60, 80, 0, true, true);
    expect(mocks.hits).toHaveBeenCalledTimes(0);
    expect(mocks.notes).toHaveBeenCalledTimes(0);
    expect(mocks.cues).toHaveBeenCalledTimes(0);
  });

  it('uses the selected temperament for exercise feedback', async () => {
    const audio = new SolfegeAudio();
    await audio.init();
    const fourth = { ...ladukhinLines[0]!, durationBeats: 1, barlines: [0], notes: [{ beat: 0, durationBeats: 1, midi: 65 }] };
    audio.schedule(fourth, 60, 60, 0, true, false, 'equal');
    const equalFrequency = mocks.notes.mock.calls.at(-1)![0];
    audio.schedule(fourth, 60, 60, 0, true, false, 'just');
    const justFrequency = mocks.notes.mock.calls.at(-1)![0];
    expect(equalFrequency / 440).toBeCloseTo(2 ** ((65 - 69) / 12));
    expect(justFrequency / (440 * 2 ** ((60 - 69) / 12))).toBeCloseTo(4 / 3);
    expect(justFrequency).toBeLessThan(equalFrequency);
    audio.dispose();
  });

  it.each([60, 80, 120])('plays four count-in beats at %i BPM even with drums muted', async (bpm) => {
    const audio = new SolfegeAudio();
    await audio.init();
    audio.schedule(ladukhinLines[0]!, 60, bpm, SOLFEGE_COUNT_IN_BEATS, false, false);
    expect(mocks.cues).toHaveBeenCalledTimes(4);
    mocks.cues.mock.calls.forEach(([url, time, muted], index) => {
      expect(url).toBe(`linn-lm-1-linndrum-linndrum-${index === 3 ? 'congahh' : 'congah'}.wav`);
      expect(time).toBeCloseTo(10.1 + index * 60 / bpm);
      expect(muted).toBe(false);
    });
    expect(mocks.hits.mock.calls[0]![0]).toBeCloseTo(10.1 + 4 * 60 / bpm);
    audio.dispose();
  });

  it('omits count-in audio when no count-in is requested', async () => {
    const audio = new SolfegeAudio();
    await audio.init();
    audio.schedule(ladukhinLines[0]!, 60, 80, 0, true, false);
    expect(mocks.cues).toHaveBeenCalledTimes(0);
    audio.dispose();
  });
});
