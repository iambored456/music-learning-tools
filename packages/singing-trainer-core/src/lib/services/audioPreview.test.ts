import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  unlock: vi.fn(), load: vi.fn(), hits: vi.fn(), notes: vi.fn(), attacks: vi.fn(), releases: vi.fn(),
  stops: vi.fn(), dispose: vi.fn(), connect: vi.fn(), options: vi.fn(),
}));
vi.mock('tone', () => {
  class Node {
    constructor(options: unknown) { mocks.options(options); }
    url = '';
    connect(output: unknown) { mocks.connect(output); return this; }
    dispose = mocks.dispose;
    async load(url: string) { this.url = url; await mocks.load(url); }
    start(time?: number) { if (this.url) mocks.hits(this.url, time); return this; }
    stop = mocks.stops;
    triggerAttack = mocks.attacks;
    triggerRelease = mocks.releases;
    triggerAttackRelease = mocks.notes;
  }
  return { start: mocks.unlock, now: () => 10, dbToGain: (db: number) => 10 ** (db / 20),
    Synth: Node, Player: Node, Gain: Node, Filter: Node, Tremolo: Node };
});
vi.mock('./audioMixer.js', () => ({ getAudioMasterOutput: (channel: string) => channel }));
vi.mock('@mlt/audio-samples/local-samples', () => ({ getLocalDrumSampleById: (id: string) => ({ url: id }) }));
vi.mock('@mlt/tanpura-drone', () => ({
  TANPURA_SAMPLE_URL: 'tanpura.wav', getTanpuraFilterFrequencyFromTuning: () => 2600,
  getTanpuraFilterQFromTuning: () => 1, getTanpuraTremoloDepthFromTuning: () => 0.1,
  getTanpuraTremoloFrequencyFromTuning: () => 3, getTanpuraPlaybackRateForTuning: () => 1,
  getTanpuraStringSemitoneOffset: () => 0,
}));
vi.mock('../stores/appState.svelte.js', () => ({ appState: { state: { drone: {
  volume: -12, tuning: { fineTuneCents: 0, variance: 0 },
  strings: Array.from({ length: 6 }, () => ({ enabled: true, gainDb: 0, noteIndex: 0, fineTuneCents: 0, ultraFineTuneCents: 0, variance: 0 })),
} } } }));
import { AudioPreview } from './audioPreview.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.unlock.mockResolvedValue(undefined);
  mocks.load.mockResolvedValue(undefined);
});

describe('master volume previews', () => {
  it('auditions synth at the speaking pitch through the synth master', async () => {
    const preview = new AudioPreview();
    expect(await preview.play('synth', 69)).toBe(2300);
    expect(mocks.connect).toHaveBeenCalledWith('synth');
    expect(mocks.options).toHaveBeenCalledWith(expect.objectContaining({ oscillator: { type: 'triangle' }, volume: -15 }));
    expect(mocks.notes).toHaveBeenCalledWith(440, 2, 10);
    preview.dispose();
    preview.dispose();
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });

  it('uses a sawtooth oscillator and the independent drone master for the drone preview', async () => {
    const preview = new AudioPreview();
    expect(await preview.play('droneSynth', 69)).toBe(2700);
    expect(mocks.connect.mock.calls).toEqual([['droneSynth']]);
    expect(mocks.options).toHaveBeenCalledWith(expect.objectContaining({
      oscillator: { type: 'sawtooth' }, volume: -12 + 20 * Math.log10(0.5),
    }));
    expect(mocks.notes).toHaveBeenCalledWith(440, 2, 10);
    preview.dispose();
  });

  it('fades shortcut triangle and sawtooth tones before their private previews are disposed', async () => {
    vi.useFakeTimers();
    const triangle = new AudioPreview();
    const sawtooth = new AudioPreview();
    try {
      await triangle.startSustainedTriangle(69);
      expect(mocks.connect).toHaveBeenCalledWith('synth');
      expect(mocks.attacks).toHaveBeenLastCalledWith(440);

      await sawtooth.startSustainedDrone('synth', 69);
      expect(mocks.connect).toHaveBeenLastCalledWith('droneSynth');
      expect(mocks.options).toHaveBeenLastCalledWith(expect.objectContaining({ oscillator: { type: 'sawtooth' } }));
      expect(mocks.attacks).toHaveBeenLastCalledWith(440);

      triangle.release();
      sawtooth.release();
      expect(mocks.releases).toHaveBeenCalledTimes(2);
      expect(mocks.dispose).toHaveBeenCalledTimes(0);
      await vi.advanceTimersByTimeAsync(60);
      expect(mocks.dispose).toHaveBeenCalledTimes(2);
    } finally {
      triangle.dispose();
      sawtooth.dispose();
      vi.useRealTimers();
    }
  });

  it('preserves a fractional MIDI pitch when playing a justly tuned shortcut', async () => {
    const preview = new AudioPreview();
    const c4Midi = 60;
    const justMajorThirdMidi = c4Midi + 12 * Math.log2(5 / 4);
    const c4Hz = 440 * 2 ** ((c4Midi - 69) / 12);

    await preview.startSustainedTriangle(justMajorThirdMidi);

    const playedFrequency = mocks.attacks.mock.lastCall?.[0] as number | undefined;
    expect(playedFrequency).toBeCloseTo(c4Hz * 5 / 4, 10);
    preview.dispose();
  });

  it('plays the four count-in hits with the final accent through one master', async () => {
    const preview = new AudioPreview();
    await preview.play('countIn', 60);
    expect(mocks.connect.mock.calls).toEqual([['countIn'], ['countIn']]);
    expect(mocks.hits.mock.calls).toEqual([0, 1, 2, 3].map(beat => [
      `linn-lm-1-linndrum-linndrum-${beat === 3 ? 'congahh' : 'congah'}`, 10 + beat * 0.75,
    ]));
    preview.dispose();
    expect(mocks.dispose).toHaveBeenCalledTimes(2);
  });

  it('uses the measure bass drum sample and master', async () => {
    const preview = new AudioPreview();
    await preview.play('bassDrum', 60);
    expect(mocks.connect).toHaveBeenCalledWith('bassDrum');
    expect(mocks.hits).toHaveBeenCalledWith('roland-tr-33-roland-tr-33-kick', 10);
    preview.dispose();
  });

  it('previews all six tanpura strings and disposes the entire private mix', async () => {
    const preview = new AudioPreview();
    expect(await preview.play('tanpura', 60)).toBe(5000);
    expect(mocks.connect).toHaveBeenCalledWith('tanpura');
    expect(mocks.hits).toHaveBeenCalledTimes(6);
    preview.dispose();
    expect(mocks.dispose).toHaveBeenCalledTimes(15);
  });

  it('cancels every staggered Tanpura voice when the Space shortcut is released', async () => {
    vi.useFakeTimers();
    const preview = new AudioPreview();
    try {
      await preview.startSustainedDrone('tanpura', 60);
      preview.release();
      expect(mocks.stops).toHaveBeenCalledTimes(6);
      expect(mocks.dispose).toHaveBeenCalledTimes(0);
      await vi.advanceTimersByTimeAsync(180);
      expect(mocks.dispose).toHaveBeenCalledTimes(15);
    } finally {
      preview.dispose();
      vi.useRealTimers();
    }
  });

  it('does not start a sample if stopped while it is loading', async () => {
    let finishLoad!: () => void;
    mocks.load.mockImplementation(() => new Promise<void>(resolve => { finishLoad = resolve; }));
    const preview = new AudioPreview();
    const playing = preview.play('bassDrum', 60);
    await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
    preview.dispose();
    finishLoad();
    expect(await playing).toBe(0);
    expect(mocks.hits).toHaveBeenCalledTimes(0);
  });

  it('does not start a sustained shortcut tone if released while audio is unlocking', async () => {
    let finishUnlock!: () => void;
    mocks.unlock.mockImplementation(() => new Promise<void>(resolve => { finishUnlock = resolve; }));
    const preview = new AudioPreview();
    const playing = preview.startSustainedTriangle(69);
    preview.release();
    finishUnlock();
    await playing;
    expect(mocks.attacks).toHaveBeenCalledTimes(0);
  });
});
