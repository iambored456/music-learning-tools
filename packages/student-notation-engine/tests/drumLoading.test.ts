import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  players: [] as any[],
  trackVolumes: { H: { value: 0 }, M: { value: 0 }, L: { value: 0 } }
}));
vi.mock('tone', () => ({
  Players: class {
    loaded = false;
    dispose = vi.fn();
    connect() { return this; }
    stopAll() {}
    player(trackId: 'H' | 'M' | 'L') { return { volume: mocks.trackVolumes[trackId], start() {} }; }
    constructor(public options: { onload(): void; onerror(error: Error): void }) {
      mocks.players.push(this);
    }
  },
  Volume: class { toDestination() {} dispose() {} },
  gainToDb: (level: number) => level === 0 ? -Infinity : 20 * Math.log10(level),
}));
vi.mock('@mlt/audio-samples', () => ({ getDrumSampleSet: () => ({ H: 'h', M: 'm', L: 'l' }) }));

import { createDrumManager, preloadDrumSamples } from '../src/transport/drumManager';

beforeEach(() => {
  mocks.players.length = 0;
  Object.values(mocks.trackVolumes).forEach(volume => { volume.value = 0; });
});

describe('drum sample readiness', () => {
  it('controls each drum track volume independently', () => {
    const manager = createDrumManager();
    manager.setTrackVolume('H', 0.25);
    expect(manager.getTrackVolume('H')).toBe(0.25);
    expect(manager.getTrackVolume('M')).toBe(1);
    expect(mocks.trackVolumes.H.value).toBeCloseTo(-12.041, 3);
    expect(mocks.trackVolumes.M.value).toBe(0);

    manager.setTrackVolume('H', -1);
    expect(manager.getTrackVolume('H')).toBe(0);
    expect(mocks.trackVolumes.H.value).toBe(-Infinity);
    manager.dispose();
  });

  it('keeps all waiters pending until the load callback', async () => {
    const manager = createDrumManager();
    const ready = vi.fn();
    const first = manager.waitForLoad().then(ready);
    const second = manager.waitForLoad().then(ready);
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();
    mocks.players[0].loaded = true;
    mocks.players[0].options.onload();
    await Promise.all([first, second]);
    expect(ready).toHaveBeenCalledTimes(2);
    expect(manager.isLoaded()).toBe(true);
    manager.dispose();
  });

  it('propagates loading failures to current and later waiters', async () => {
    const manager = createDrumManager();
    const failed = expect(manager.waitForLoad()).rejects.toThrow('decode failed');
    mocks.players[0].options.onerror(new Error('decode failed'));
    await failed;
    await expect(manager.waitForLoad()).rejects.toThrow('decode failed');
    manager.dispose();
  });

  it('settles pending waiters when disposed', async () => {
    const manager = createDrumManager();
    const cancelled = expect(manager.waitForLoad()).rejects.toThrow('disposed');
    manager.dispose();
    await cancelled;
  });

  it('keeps preload players alive until loading finishes and retries failures', async () => {
    const first = preloadDrumSamples();
    const failed = expect(first).rejects.toThrow('network failed');
    expect(preloadDrumSamples()).toBe(first);
    await Promise.resolve();
    expect(mocks.players[0].dispose).not.toHaveBeenCalled();
    mocks.players[0].options.onerror(new Error('network failed'));
    await failed;
    expect(mocks.players[0].dispose).toHaveBeenCalledOnce();
    const retry = preloadDrumSamples();
    expect(mocks.players).toHaveLength(2);
    mocks.players[1].options.onload();
    await retry;
    expect(mocks.players[1].dispose).toHaveBeenCalledOnce();
  });
});
