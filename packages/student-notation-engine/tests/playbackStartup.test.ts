import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransportConfig, TransportServiceInstance } from '../src/audio/types';

const audio = vi.hoisted(() => ({
  start: vi.fn(), stop: vi.fn(), cancel: vi.fn(),
  context: { state: 'running', resume: vi.fn(), rawContext: {}, lookAhead: 0.1 },
}));
vi.mock('tone', () => ({
  now: () => Date.now() / 1000 + audio.context.lookAhead,
  immediate: () => Date.now() / 1000,
  context: audio.context,
  Transport: {
    start: audio.start, stop: audio.stop, cancel: audio.cancel,
    pause: vi.fn(), on: vi.fn(), off: vi.fn(), schedule: vi.fn(),
    bpm: { value: 120 }, seconds: 0, loop: false, state: 'stopped',
  },
  Draw: { schedule: vi.fn(), cancel: vi.fn() },
}));
vi.mock('../src/transport/timeMapCalculator.js', () => ({
  createTimeMapCalculator: () => ({
    calculate() {}, getMusicalEndTime: () => 1, getTimeMap: () => [0, 0.5, 1],
    setLoopBounds() {}, getConfiguredLoopBounds: () => ({ loopEnd: 1 }),
    findNonAnacrusisStart: () => 0, applyModulationToTime: (time: number) => time,
    reapplyConfiguredLoopBounds() {},
  }),
}));
vi.mock('@mlt/audio-samples', () => ({ getDrumSampleSet: () => ({}) }));

import { createTransportService } from '../src/audio/transportService';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

let transport: TransportServiceInstance;
function setup(withDrums = false) {
  const init = deferred();
  const drums = deferred();
  const emit = vi.fn();
  const setPlaybackState = vi.fn();
  const waitForLoad = vi.fn(() => drums.promise);
  transport = createTransportService({
    audioInit: () => init.promise,
    synthEngine: { releaseAll: vi.fn() },
    drumManager: { isLoaded: () => false, waitForLoad, reset: vi.fn() },
    stateCallbacks: { getState: () => ({
      tempo: 120, isLooping: false, isPaused: false, playbackStartMacrobeatIndex: null,
      placedNotes: withDrums ? [{ isDrum: true, startColumnIndex: 0, endColumnIndex: 0 }] : [],
    }) },
    eventCallbacks: { on: vi.fn(), emit, setPlaybackState },
  } as unknown as TransportConfig);
  transport.init();
  return { init, drums, emit, setPlaybackState, waitForLoad };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { transport?.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe.each([0.1, 0.25])('playback buffering lifecycle with %s seconds lookahead', (lookAhead) => {
  const startupMs = Math.round((lookAhead + 0.1) * 1000);
  beforeEach(() => { audio.context.lookAhead = lookAhead; });
  it('covers audio init, sample loading and the complete scheduled lead time', async () => {
    const { init, drums, emit } = setup(true);
    transport.start();
    expect(transport.isBuffering).toBe(true);
    expect(emit).toHaveBeenCalledWith('playbackBufferingChanged', true);
    init.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.start).not.toHaveBeenCalled();
    drums.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.start).toHaveBeenCalledWith(lookAhead + 0.1, 0);
    await vi.advanceTimersByTimeAsync(startupMs - 1);
    expect(transport.isBuffering).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(transport.isBuffering).toBe(false);
    expect(emit).toHaveBeenLastCalledWith('playbackBufferingChanged', false);
  });

  it('does not wait for drums in a score without drum notes or start twice', async () => {
    const { init, waitForLoad } = setup();
    transport.start();
    transport.start();
    init.resolve();
    await vi.advanceTimersByTimeAsync(startupMs);
    expect(waitForLoad).not.toHaveBeenCalled();
    expect(audio.start).toHaveBeenCalledOnce();
    expect(transport.isBuffering).toBe(false);
  });

  it('cancels a pending load without allowing a stale startup', async () => {
    const { init, drums } = setup(true);
    transport.start();
    init.resolve();
    await vi.advanceTimersByTimeAsync(0);
    transport.stop();
    expect(transport.isBuffering).toBe(false);
    drums.resolve();
    await vi.advanceTimersByTimeAsync(startupMs + 100);
    expect(audio.start).not.toHaveBeenCalled();
  });

  it('clears buffering and resets playback state when loading fails', async () => {
    const { init, drums, setPlaybackState } = setup(true);
    transport.start();
    init.resolve();
    await vi.advanceTimersByTimeAsync(0);
    drums.reject(new Error('network failed'));
    await vi.advanceTimersByTimeAsync(0);
    expect(transport.isBuffering).toBe(false);
    expect(setPlaybackState).toHaveBeenCalledWith(false, false);
    expect(audio.start).not.toHaveBeenCalled();
  });

  it('clears the pending lead-time timer on Stop', async () => {
    const { init, emit } = setup();
    transport.start();
    init.resolve();
    await vi.advanceTimersByTimeAsync(0);
    transport.stop();
    expect(transport.isBuffering).toBe(false);
    const eventCount = emit.mock.calls.length;
    await vi.advanceTimersByTimeAsync(startupMs + 100);
    expect(emit).toHaveBeenCalledTimes(eventCount);
  });

  it('shows buffering on resume through its configured lookahead', async () => {
    const { init } = setup();
    transport.resume();
    init.resolve();
    await vi.advanceTimersByTimeAsync(Math.round(lookAhead * 1000) - 1);
    expect(transport.isBuffering).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(transport.isBuffering).toBe(false);
  });
});
