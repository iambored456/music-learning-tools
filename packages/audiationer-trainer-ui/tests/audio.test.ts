import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserTrainerAudio } from '../src/audio.ts';
import { FreeplaySession, TrainerSession, normalizeFreeplaySettings, normalizeSettings, questionLength } from '@mlt/audiationer-trainer-core';

class Param {
  value = 0;
  setValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  cancelScheduledValues() {}
}
class Node {
  connections: unknown[] = [];
  connect(output: unknown) { this.connections.push(output); return output; }
  disconnect() { this.connections = []; }
}
class Gain extends Node { gain = new Param(); }
class Source extends Node {
  buffer: unknown;
  loop = false;
  playbackRate = new Param();
  frequency = new Param();
  type = 'sine';
  stopped = false;
  onended: (() => void) | null = null;
  start() {}
  stop() { this.stopped = true; this.onended?.(); }
}
class Filter extends Node { type = ''; frequency = new Param(); Q = new Param(); gain = new Param(); }
class Context {
  static instances: Context[] = [];
  currentTime = 10;
  state = 'suspended';
  destination = new Node();
  gains: Gain[] = [];
  sources: Source[] = [];
  oscillators: Source[] = [];
  constructor() { Context.instances.push(this); }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
  async decodeAudioData() { return {} as AudioBuffer; }
  createGain() { const node = new Gain(); this.gains.push(node); return node; }
  createBufferSource() { const node = new Source(); this.sources.push(node); return node; }
  createOscillator() { const node = new Source(); this.oscillators.push(node); return node; }
  createBiquadFilter() { return new Filter(); }
}
function environment(t: TestContext) {
  const originalContext = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context });
  Context.instances = [];
  const fetch = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) as Response);
  t.after(() => {
    if (originalContext) Object.defineProperty(globalThis, 'AudioContext', originalContext);
    else Reflect.deleteProperty(globalThis, 'AudioContext');
  });
  return fetch;
}

test('Free Play dragging and octave crossings retain the same sampled tanpura voices', async t => {
  environment(t);
  const audio = new BrowserTrainerAudio(true), settings = normalizeFreeplaySettings({});
  const session = new FreeplaySession(audio, settings, () => {});
  t.after(() => { session.destroy(); audio.dispose(); });
  const drag = session.press(11);
  await new Promise<void>(resolve => setImmediate(resolve));
  const ctx = Context.instances[0], drone = [...ctx.sources];
  assert.equal(drone.length, 7);
  drag.move(0, 5);
  session.configure({ ...settings, octave: 5 });
  drag.move(2, 5); drag.move(11, 4); drag.finish(true);
  assert.deepEqual(ctx.sources, drone);
  assert.ok(drone.every(source => !source.stopped));
  assert.deepEqual(session.snapshot().sustained, [11]);
  session.stopAll();
  assert.ok(drone.every(source => source.stopped));
});

test('Audiation Trainer starts the tanpura only after unlock and keeps drone and note volumes independent', async t => {
  const fetch = environment(t), audio = new BrowserTrainerAudio();
  t.after(() => audio.dispose());
  assert.equal(Context.instances.length, 0);
  assert.equal(fetch.mock.calls.length, 0);
  await audio.unlock();
  const ctx = Context.instances[0];
  assert.equal(ctx.state, 'running');
  assert.equal(fetch.mock.calls.length, 1);
  assert.match(String(fetch.mock.calls[0].arguments[0]), /01-Tanpura-Sample\.mp3$/);
  assert.equal(ctx.sources.length, 0);
  audio.drone(48, 0.8);
  assert.equal(ctx.sources.length, 7);
  const output = ctx.gains[1], master = ctx.gains[0];
  assert.deepEqual(output.connections, [master]);
  audio.separateDroneVolume(true);
  assert.deepEqual(output.connections, [ctx.destination]);
  audio.volume(0);
  assert.equal(master.gain.value, 0);
  assert.equal(ctx.sources.length, 7);
  audio.separateDroneVolume(false);
  assert.deepEqual(output.connections, [master]);
  audio.stop();
  assert.ok(ctx.sources.every(voice => voice.stopped));
});

test('melody presets affect the degree synth while the tanpura keeps its sampled sound', async t => {
  environment(t);
  const audio = new BrowserTrainerAudio(true);
  t.after(() => audio.dispose());
  await audio.unlock(); audio.drone(55, 0.8);
  const ctx = Context.instances[0];
  const release = audio.sustain(67);
  assert.equal(ctx.oscillators.at(-1)?.type, 'triangle');
  audio.preset('bright');
  assert.equal(ctx.oscillators.at(-1)?.type, 'sawtooth');
  assert.equal(ctx.sources.length, 7);
  assert.ok(ctx.sources.every(voice => voice.loop && !voice.stopped));
  release(); audio.dispose();
  assert.equal(ctx.state, 'closed');
  assert.ok(ctx.sources.every(voice => voice.stopped));
});

test('cancelling notes can preserve the playing tanpura, while a full stop still stops everything', async t => {
  environment(t);
  const audio = new BrowserTrainerAudio();
  t.after(() => audio.dispose());
  await audio.unlock(); audio.drone(48, 0.8);
  const ctx = Context.instances[0], droneVoices = [...ctx.sources];
  audio.sustain(64);
  const note = ctx.oscillators.at(-1)!;
  audio.stop({ preserveDrone: true });
  assert.equal(note.stopped, true);
  assert.ok(droneVoices.every(voice => !voice.stopped));
  audio.drone(48, 0.8);
  assert.equal(ctx.sources.length, droneVoices.length);
  audio.stop();
  assert.ok(droneVoices.every(voice => voice.stopped));
});

test('all compass review modes preserve the same drone voices through previews, replays and Next', async t => {
  environment(t);
  for (const mode of ['degrees', 'melody', 'chords', 'chord-progressions'] as const) {
    const audio = new BrowserTrainerAudio();
    // Keep note playback instantaneous while exercising the real audio cancellation and drone nodes.
    t.mock.method(audio, 'notes', async (midis: number[], _seconds: number, signal: AbortSignal) => {
      signal.throwIfAborted();
      for (const midi of midis) audio.sustain(midi)();
    });
    const session = new TrainerSession(audio, () => {}, () => 0, async (_ms, signal) => { signal.throwIfAborted(); });
    t.after(() => { session.destroy(); audio.dispose(); });
    const settings = normalizeSettings({ mode, degrees: [0, 4], melodyLength: 2, progressionLength: 2,
      rounds: 2, reviewSkip: 'none', cadence: false, resolve: false });
    await session.start(settings);
    const ctx = Context.instances.at(-1)!, droneVoices = [...ctx.sources];
    assert.equal(droneVoices.length, 7);
    for (let answer = 0; answer < questionLength(settings); answer++) await session.answer(4);
    assert.equal(session.snapshot().phase, 'feedback', mode);
    assert.equal(session.snapshot().results[0].correct, false, mode);
    const expectContinuousDrone = () => {
      assert.equal(ctx.sources.length, droneVoices.length, mode);
      assert.ok(droneVoices.every(voice => !voice.stopped), mode);
    };
    await session.answer(0); await session.answer(4);
    expectContinuousDrone();
    if (mode === 'melody' || mode === 'chord-progressions') {
      await session.replaySequence('input'); await session.replaySequence('revealed');
      session.setFeedbackOctave(5);
      expectContinuousDrone();
    }
    assert.equal(session.snapshot().results.length, 1, mode);
    await session.next();
    assert.equal(session.snapshot().round, 2, mode);
    expectContinuousDrone();
    session.stop();
    assert.ok(droneVoices.every(voice => voice.stopped), mode);
    session.destroy(); audio.dispose();
  }
});

test('disposing while the sample loads cannot leave a late tanpura playing', async t => {
  const fetch = environment(t);
  let release!: (response: Response) => void;
  fetch.mock.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  const audio = new BrowserTrainerAudio(), unlocking = audio.unlock();
  await new Promise<void>(resolve => setImmediate(resolve));
  audio.dispose();
  release({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) } as Response);
  await unlocking;
  assert.equal(Context.instances[0].state, 'closed');
  assert.equal(Context.instances[0].sources.length, 0);
});
