import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserTrainerAudio } from '../src/audio.ts';

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
class Filter extends Node { type = ''; frequency = new Param(); Q = new Param(); }
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
  assert.equal(ctx.sources.length, 6);
  const output = ctx.gains[1], master = ctx.gains[0];
  assert.deepEqual(output.connections, [master]);
  audio.separateDroneVolume(true);
  assert.deepEqual(output.connections, [ctx.destination]);
  audio.volume(0);
  assert.equal(master.gain.value, 0);
  assert.equal(ctx.sources.length, 6);
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
  assert.equal(ctx.sources.length, 6);
  assert.ok(ctx.sources.every(voice => voice.loop && !voice.stopped));
  release(); audio.dispose();
  assert.equal(ctx.state, 'closed');
  assert.ok(ctx.sources.every(voice => voice.stopped));
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
