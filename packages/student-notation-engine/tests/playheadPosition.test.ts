import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransportConfig, TransportServiceInstance, TransportState } from '../src/audio/types';

const audio = vi.hoisted(() => ({
  transport: {
    bpm: { value: 120 }, seconds: 0, loop: false, loopStart: 0, loopEnd: 4, state: 'started',
    start: vi.fn(), stop: vi.fn(), cancel: vi.fn(), pause: vi.fn(), on: vi.fn(), off: vi.fn(), schedule: vi.fn()
  }
}));
vi.mock('tone', () => ({
  now: () => 0, immediate: () => 0,
  context: { state: 'running', resume: vi.fn(), rawContext: {}, lookAhead: 0.1 },
  Transport: audio.transport,
  Time: (value: number) => ({ toSeconds: () => value }),
  Draw: { schedule: (callback: () => void) => callback(), cancel: vi.fn() }
}));
vi.mock('../src/transport/timeMapCalculator.js', () => ({
  createTimeMapCalculator: () => ({
    calculate() {}, getMusicalEndTime: () => 4, getTimeMap: () => [0, 1, 2, 3, 4],
    setLoopBounds() {}, getConfiguredLoopBounds: () => ({ loopEnd: 4 }),
    findNonAnacrusisStart: () => 0, applyModulationToTime: (time: number) => time,
    reapplyConfiguredLoopBounds() {}
  })
}));
vi.mock('@mlt/audio-samples', () => ({ getDrumSampleSet: () => ({}) }));

import { createTransportService } from '../src/audio/transportService';

let service: TransportServiceInstance;
let frame: FrameRequestCallback;
let state: TransportState;
const updatePosition = vi.fn();

beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  audio.transport.seconds = 0;
  audio.transport.loopStart = 0;
  audio.transport.state = 'started';
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  state = {
    tempo: 120, isLooping: false, isPaused: false, placedNotes: [], columnWidths: [1, 1, 1, 1],
    tempoModulationMarkers: [], playheadMode: 'cursor', playbackStartMacrobeatIndex: null
  } as unknown as TransportState;
  service = createTransportService({
    audioInit: async () => {}, synthEngine: { releaseAll: vi.fn() }, drumManager: { reset: vi.fn() },
    stateCallbacks: {
      getState: () => state, getColumnStartX: (index: number) => index * 100,
      getColumnWidth: () => 100, getCanvasWidth: () => 400
    },
    eventCallbacks: { on: vi.fn(), emit: vi.fn() },
    visualCallbacks: { updatePlayheadPosition: updatePosition }
  } as unknown as TransportConfig);
  service.init();
  service.start();
  await vi.advanceTimersByTimeAsync(0);
});

afterEach(() => {
  service.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('continuous playhead position callback', () => {
  it.each(['cursor', 'microbeat', 'macrobeat'] as const)('follows fractional progress in %s display mode', mode => {
    state.playheadMode = mode;
    expect(updatePosition).toHaveBeenLastCalledWith(0);
    audio.transport.seconds = 1.25;
    frame(0);
    expect(updatePosition).toHaveBeenLastCalledWith(125);
    audio.transport.seconds = 1.5;
    frame(0);
    expect(updatePosition).toHaveBeenLastCalledWith(150);
  });

  it('does not move the view while paused', () => {
    updatePosition.mockClear();
    state.isPaused = true;
    audio.transport.seconds = 2;
    frame(0);
    expect(updatePosition).not.toHaveBeenCalled();
  });

  it('follows a loop back to its configured start', () => {
    state.isLooping = true;
    audio.transport.loopStart = 1;
    audio.transport.seconds = 3.75;
    frame(0);
    expect(updatePosition).toHaveBeenLastCalledWith(375);
    audio.transport.seconds = 4.25;
    frame(0);
    expect(updatePosition).toHaveBeenLastCalledWith(125);
  });

  it('stops at the musical end without sending the view back to zero', () => {
    audio.transport.seconds = 3.9;
    frame(0);
    updatePosition.mockClear();
    audio.transport.seconds = 4;
    frame(0);
    expect(audio.transport.stop).toHaveBeenCalled();
    expect(updatePosition).not.toHaveBeenCalled();
  });
});
