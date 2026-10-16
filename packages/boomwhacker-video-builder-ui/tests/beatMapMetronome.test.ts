import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BeatMapMetronome } from '../src/browser/beatMapMetronome.js';

class FakeGain {
  gain = { value: 1 };
  connect() {}
  disconnect() {}
}

class FakeSource {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  gain: FakeGain | null = null;
  startArgs: number[] = [];
  stopped = false;
  connect(gain: FakeGain) { this.gain = gain; }
  disconnect() {}
  start(...args: number[]) { this.startArgs = args; }
  stop() { this.stopped = true; }
}

class FakeContext {
  currentTime = 10;
  state = 'running';
  sampleRate = 44100;
  destination = {};
  sources: FakeSource[] = [];
  createGain() { return new FakeGain(); }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  createBufferSource() {
    const source = new FakeSource(); this.sources.push(source); return source;
  }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
}

const audioBuffer = { duration: 2 } as AudioBuffer;
const options = () => ({ audioBuffer, beats: [{ timeSec: 0, accent: true }, { timeSec: 0.1, accent: false }, { timeSec: 0.8, accent: false }],
  startTimeSec: 0, endTimeSec: 2, audioVolume: 0.5, clickVolume: 0.7 });
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('metronome and original audio start on one clock, preserving irregular beat spacing', async () => {
  const context = new FakeContext();
  const metronome = new BeatMapMetronome(() => context as unknown as AudioContext);
  try {
    await metronome.start(options());
    assert.equal(context.sources.length, 3); // original audio plus two clicks within lookahead
    assert.equal(context.sources[0].buffer, audioBuffer);
    near(context.sources[0].startArgs[0], 10.03);
    near(context.sources[1].startArgs[0], context.sources[0].startArgs[0]);
    near(context.sources[2].startArgs[0] - context.sources[1].startArgs[0], 0.1);
    assert.notEqual(context.sources[1].buffer, context.sources[2].buffer); // downbeat accent
    context.currentTime = 10.53;
    near(metronome.getCurrentTime(), 0.5);
  } finally { metronome.dispose(); }
});

test('source audio and click volume are independent', async () => {
  const context = new FakeContext();
  const metronome = new BeatMapMetronome(() => context as unknown as AudioContext);
  try {
    await metronome.start(options());
    const audioGain = context.sources[0].gain!;
    const clickGain = context.sources[1].gain!;
    assert.notEqual(audioGain, clickGain);
    metronome.setAudioVolume(0);
    assert.equal(audioGain.gain.value, 0);
    assert.equal(clickGain.gain.value, 0.7);
    metronome.setClickVolume(0.3);
    assert.equal(clickGain.gain.value, 0.3);
    assert.equal(audioGain.gain.value, 0);
  } finally { metronome.dispose(); }
});

test('seeking cancels old clicks and starts at the requested audio offset', async () => {
  const context = new FakeContext();
  const metronome = new BeatMapMetronome(() => context as unknown as AudioContext);
  try {
    await metronome.start(options());
    const previous = [...context.sources];
    context.currentTime = 11;
    await metronome.start({ ...options(), startTimeSec: 0.1 });
    assert.ok(previous.every(source => source.stopped));
    const next = context.sources.slice(previous.length);
    assert.equal(next.length, 2); // source plus beat at the seek position; earlier beat omitted
    near(next[0].startArgs[1], 0.1);
    near(next[1].startArgs[0], next[0].startArgs[0]);
    metronome.stop();
    assert.ok(next.every(source => source.stopped));
    assert.equal(metronome.isPlaying, false);
  } finally { metronome.dispose(); }
});

test('silent lead-in delays original audio without adding early beat-map clicks', async () => {
  const context = new FakeContext();
  const metronome = new BeatMapMetronome(() => context as unknown as AudioContext);
  try {
    await metronome.start({ ...options(), startTimeSec: -2 });
    assert.equal(context.sources.length, 1);
    near(context.sources[0].startArgs[0], 12.03);
    assert.equal(context.sources[0].startArgs[1], 0);
    assert.equal(metronome.getCurrentTime(), -2);
  } finally { metronome.dispose(); }
});

test('click-only playback does not require notes or a source audio buffer', async () => {
  const context = new FakeContext();
  const metronome = new BeatMapMetronome(() => context as unknown as AudioContext);
  try {
    await metronome.start({ ...options(), audioBuffer: null });
    assert.equal(context.sources.length, 2);
    assert.equal(metronome.isPlaying, true);
  } finally { metronome.dispose(); }
});

test('pause during audio unlock cancels pending playback', async () => {
  const context = new FakeContext();
  context.state = 'suspended';
  let unlock!: () => void;
  context.resume = () => new Promise<void>(resolve => { unlock = () => { context.state = 'running'; resolve(); }; });
  const metronome = new BeatMapMetronome(() => context as unknown as AudioContext);
  try {
    const pending = metronome.start(options());
    metronome.stop();
    unlock();
    await pending;
    assert.equal(context.sources.length, 0);
    assert.equal(metronome.isPlaying, false);
  } finally { metronome.dispose(); }
});
