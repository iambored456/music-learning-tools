import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DetectedPitch, PitchHistoryPoint, StablePitch } from '../stores/pitchState.svelte.js';

vi.mock('../stores/pitchState.svelte.js', () => {
  function createState() {
    const state = {
      currentPitch: null as DetectedPitch | null,
      history: [] as PitchHistoryPoint[],
      stablePitch: { highlights: [], size: 1 } as StablePitch,
      inputLevelDb: null as number | null,
      error: null as string | null,
      activeDeviceId: null as string | null,
      activeGroupId: null as string | null,
    };
    return {
      state,
      setCurrentPitch: (pitch: DetectedPitch | null) => { state.currentPitch = pitch; },
      addHistoryPoint: (point: PitchHistoryPoint) => { state.history.push(point); },
      setStablePitch: (pitch: StablePitch) => { state.stablePitch = pitch; },
      setInputLevelDb: (level: number | null) => { state.inputLevelDb = level; },
      setError: (error: string | null) => { state.error = error; },
      setActiveDevice: (device: string | null, group: string | null = null) => {
        state.activeDeviceId = device;
        state.activeGroupId = group;
      },
      clearHistory: () => { state.history = []; },
      reset: () => {
        state.currentPitch = null;
        state.history = [];
        state.inputLevelDb = null;
        state.error = null;
        state.activeDeviceId = null;
        state.activeGroupId = null;
      },
    };
  }
  return { pitchState: createState(), secondPitchState: createState(), duetState: { enabled: false } };
});
vi.mock('../stores/highwayState.svelte.js', () => ({ highwayState: { recordPitchInput: vi.fn() } }));
vi.mock('./referenceAudio.js', () => ({ referenceAudio: { isPlaying: false } }));
vi.mock('pitchy', () => ({
  PitchDetector: { forFloat32Array: () => ({ findPitch: (data: Float32Array) => [data[0], 0.99] }) },
}));

import * as capture from './pitchDetection.js';
import { pitchState, secondPitchState } from '../stores/pitchState.svelte.js';
import { highwayState } from '../stores/highwayState.svelte.js';

function makeStream(deviceId: string, frequency = 440, groupId = deviceId) {
  const track = new EventTarget();
  Object.assign(track, { stop: vi.fn(), getSettings: () => ({ deviceId, groupId }) });
  return {
    frequency,
    track: track as EventTarget & { stop: ReturnType<typeof vi.fn> },
    getTracks: () => [track],
    getAudioTracks: () => [track],
  };
}

class FakeNode {
  frequency = 440;
  fftSize = 2048;
  gain = { value: 1 };
  connect(node: FakeNode) { node.frequency = this.frequency; }
  disconnect() {}
  getFloatTimeDomainData(data: Float32Array) { data.fill(this.frequency); }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = 'running';
  sampleRate = 48000;
  destination = new FakeNode();
  close = vi.fn(async () => { this.state = 'closed'; });
  constructor() { FakeAudioContext.instances.push(this); }
  async resume() { this.state = 'running'; }
  createMediaStreamSource(stream: ReturnType<typeof makeStream>) {
    const node = new FakeNode();
    node.frequency = stream.frequency;
    return node;
  }
  createAnalyser() { return new FakeNode(); }
  createGain() { return new FakeNode(); }
}

const getUserMedia = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  getUserMedia.mockReset();
  FakeAudioContext.instances = [];
  vi.stubGlobal('window', { AudioContext: FakeAudioContext });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  pitchState.reset();
  secondPitchState.reset();
  capture.setPreferredInputDeviceId('mic-a');
  capture.setPreferredInputDeviceId('mic-b', 2);
  capture.setDuetEnabled(true);
});

afterEach(() => {
  capture.stopDetection();
  capture.setDuetEnabled(false);
  vi.unstubAllGlobals();
});

describe('two microphone capture', () => {
  it('requests two exact devices and keeps pitch, history, and meters separate', async () => {
    getUserMedia.mockResolvedValueOnce(makeStream('mic-a', 440)).mockResolvedValueOnce(makeStream('mic-b', 660));
    await capture.startDetection();
    expect(getUserMedia.mock.calls.map(([constraints]) => constraints.audio.deviceId)).toEqual([
      { exact: 'mic-a' }, { exact: 'mic-b' },
    ]);
    expect(pitchState.state.currentPitch?.frequency).toBe(440);
    expect(secondPitchState.state.currentPitch?.frequency).toBe(660);
    expect(pitchState.state.history.length).toBe(1);
    expect(secondPitchState.state.history.length).toBe(1);
    expect(pitchState.state.inputLevelDb === secondPitchState.state.inputLevelDb).toBe(false);
    // Part assignment and scoring for Input 2 are intentionally deferred.
    expect(vi.mocked(highwayState.recordPitchInput).mock.calls.length).toBe(1);
  });

  it('leaves Input 1 running when Input 2 cannot open, without falling back', async () => {
    const first = makeStream('mic-a');
    getUserMedia.mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('Device busy'));
    await capture.startDetection();
    expect(capture.isDetecting()).toBe(true);
    expect(first.track.stop.mock.calls.length).toBe(0);
    expect(secondPitchState.state.error).toBe('Device busy');
    expect(getUserMedia.mock.calls.length).toBe(2);
  });

  it('rejects aliases resolving to the same physical microphone', async () => {
    const duplicate = makeStream('alias-a', 440, 'physical-a');
    getUserMedia.mockResolvedValueOnce(makeStream('mic-a', 440, 'physical-a')).mockResolvedValueOnce(duplicate);
    await capture.startDetection();
    expect(secondPitchState.state.error).toBe('Choose a different microphone for each input.');
    expect(duplicate.track.stop.mock.calls.length).toBe(1);
    expect(pitchState.state.activeDeviceId).toBe('mic-a');
  });

  it('switches and removes Input 2 without interrupting Input 1', async () => {
    const first = makeStream('mic-a');
    const second = makeStream('mic-b');
    const replacement = makeStream('mic-c');
    getUserMedia.mockResolvedValueOnce(first).mockResolvedValueOnce(second).mockResolvedValueOnce(replacement);
    await capture.startDetection();
    capture.setPreferredInputDeviceId('mic-c', 2);
    await capture.restartInputDetection(2);
    expect(second.track.stop.mock.calls.length).toBe(1);
    expect(secondPitchState.state.activeDeviceId).toBe('mic-c');
    capture.setDuetEnabled(false);
    expect(replacement.track.stop.mock.calls.length).toBe(1);
    expect(first.track.stop.mock.calls.length).toBe(0);
    expect(secondPitchState.state.history.length).toBe(0);
  });

  it('releases a late permission result after Input 2 has been removed', async () => {
    const lateStream = makeStream('mic-b');
    let resolveSecond!: (stream: ReturnType<typeof makeStream>) => void;
    getUserMedia.mockResolvedValueOnce(makeStream('mic-a')).mockImplementationOnce(
      () => new Promise((resolve) => { resolveSecond = resolve; }),
    );
    const starting = capture.startDetection();
    await vi.waitFor(() => expect(getUserMedia.mock.calls.length).toBe(2));
    capture.setDuetEnabled(false);
    resolveSecond(lateStream);
    await starting;
    expect(lateStream.track.stop.mock.calls.length).toBe(1);
    expect(secondPitchState.state.currentPitch).toBe(null);
    expect(secondPitchState.state.error).toBe(null);
    expect(capture.isDetecting()).toBe(true);
  });

  it('clears disconnected input state and stops all tracks and contexts on shutdown', async () => {
    const first = makeStream('mic-a');
    const second = makeStream('mic-b');
    getUserMedia.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await capture.startDetection();
    second.track.dispatchEvent(new Event('ended'));
    expect(secondPitchState.state.currentPitch).toBe(null);
    expect(secondPitchState.state.inputLevelDb).toBe(null);
    expect(secondPitchState.state.error?.includes('disconnected')).toBe(true);
    expect(first.track.stop.mock.calls.length).toBe(0);
    capture.stopDetection();
    expect(first.track.stop.mock.calls.length).toBe(1);
    expect(FakeAudioContext.instances.every((context) => context.state === 'closed')).toBe(true);
    expect(capture.isDetecting()).toBe(false);
  });
});
