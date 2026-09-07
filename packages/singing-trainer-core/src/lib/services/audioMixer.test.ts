import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ created: vi.fn() }));
vi.mock('tone', () => ({
  Gain: class {
    gain = { rampTo: vi.fn() };
    constructor(value: number) { mocks.created(value); }
    toDestination() { return this; }
  },
}));

let storage: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('audio master mixer', () => {
  it('shows 100% on every slider while preserving the approved five-channel balance', async () => {
    storage.set('singingTrainer.audioMasterLevels.v3', JSON.stringify({ tanpura: 100, droneSynth: 80, synth: 100, countIn: 100, bassDrum: 165 }));
    const mixer = await import('./audioMixer.js');
    expect(mixer.getAudioMasterLevels()).toEqual({ tanpura: 100, droneSynth: 100, synth: 100, countIn: 100, bassDrum: 100 });
    mixer.AUDIO_MASTER_CHANNELS.forEach(channel => mixer.getAudioMasterOutput(channel));
    expect(mocks.created.mock.calls).toEqual([[1.9], [0.56], [1.3], [0.25], [4.95]]);
  });
  it('preserves other saved levels when normalizing the two changed channels', async () => {
    storage.set('singingTrainer.audioMasterLevels.v3', JSON.stringify({ tanpura: 110, droneSynth: 80, synth: 120, countIn: 90, bassDrum: 165 }));
    const mixer = await import('./audioMixer.js');
    expect(mixer.getAudioMasterLevels()).toEqual({ tanpura: 110, droneSynth: 100, synth: 120, countIn: 90, bassDrum: 100 });
  });
  it('saves settings without creating audio nodes and restores them next visit', async () => {
    const mixer = await import('./audioMixer.js');
    expect(mixer.setAudioMasterLevel('countIn', 42)).toBe(true);
    expect(mocks.created).toHaveBeenCalledTimes(0);
    vi.resetModules();
    const reloaded = await import('./audioMixer.js');
    expect(reloaded.getAudioMasterLevels()).toEqual({ tanpura: 100, droneSynth: 100, synth: 100, countIn: 42, bassDrum: 100 });
    reloaded.getAudioMasterOutput('countIn');
    expect(mocks.created).toHaveBeenCalledWith(0.105);
  });

  it('reuses each channel and ramps only its live output, including mute', async () => {
    const mixer = await import('./audioMixer.js');
    const synth = mixer.getAudioMasterOutput('synth');
    const drum = mixer.getAudioMasterOutput('droneSynth');
    expect(mixer.getAudioMasterOutput('synth')).toBe(synth);
    expect(mocks.created).toHaveBeenCalledTimes(2);
    mixer.setAudioMasterLevel('synth', 125);
    expect(synth.gain.rampTo).toHaveBeenCalledWith(1.625, 0.05);
    mixer.setAudioMasterLevel('synth', 0);
    expect(synth.gain.rampTo).toHaveBeenCalledWith(0, 0.05);
    expect(drum.gain.rampTo).toHaveBeenCalledTimes(0);
  });

  it('validates saved and edited values', async () => {
    storage.set('singingTrainer.audioMasterLevels.v4', JSON.stringify({ tanpura: -5, synth: 999, countIn: 'loud' }));
    const mixer = await import('./audioMixer.js');
    expect(mixer.getAudioMasterLevels()).toEqual({ tanpura: 0, droneSynth: 100, synth: 300, countIn: 100, bassDrum: 100 });
    expect(mixer.setAudioMasterLevel('countIn', NaN)).toBe(false);
    expect(mixer.getAudioMasterLevels().countIn).toBe(100);
    const snapshot = mixer.getAudioMasterLevels();
    snapshot.synth = 0;
    expect(mixer.getAudioMasterLevels().synth).toBe(300);
  });

  it('applies changes even when persistence is unavailable', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('unavailable'); },
      setItem: () => { throw new Error('unavailable'); },
    });
    const mixer = await import('./audioMixer.js');
    expect(mixer.setAudioMasterLevel('tanpura', 60)).toBe(false);
    expect(mixer.getAudioMasterLevels().tanpura).toBe(60);
  });
});
