import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TanpuraDrone } from '../src/TanpuraDrone.ts';

class Param {
  value = 0;
  setValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
}
class Node {
  connections: unknown[] = [];
  disconnected = false;
  connect(output: unknown) { this.connections.push(output); return output; }
  disconnect() { this.disconnected = true; this.connections = []; }
}
class Gain extends Node { gain = new Param(); }
class Source extends Node {
  playbackRate = new Param();
  buffer: AudioBuffer | null = null;
  loop = false;
  starts: number[] = [];
  stops = 0;
  start(time: number) { this.starts.push(time); }
  stop() { this.stops++; }
}
class Oscillator extends Source { frequency = new Param(); }
class Filter extends Node { type = ''; frequency = new Param(); Q = new Param(); }
class Context {
  currentTime = 10;
  gains: Gain[] = [];
  sources: Source[] = [];
  oscillators: Oscillator[] = [];
  filters: Filter[] = [];
  createGain() { const node = new Gain(); this.gains.push(node); return node; }
  createBufferSource() { const node = new Source(); this.sources.push(node); return node; }
  createOscillator() { const node = new Oscillator(); this.oscillators.push(node); return node; }
  createBiquadFilter() { const node = new Filter(); this.filters.push(node); return node; }
  get nodes() { return [...this.gains, ...this.sources, ...this.oscillators, ...this.filters]; }
}
const sample = {} as AudioBuffer;
function setup(loader: (context: AudioContext) => Promise<AudioBuffer> = async () => sample) {
  const context = new Context(), output = new Node();
  const drone = new TanpuraDrone(context as unknown as AudioContext, output as unknown as AudioNode, loader);
  return { context, output, drone };
}

test('constructing and loading the tanpura creates no playing nodes and shares pending loads', async () => {
  let loads = 0, release!: (buffer: AudioBuffer) => void;
  const t = setup(() => { loads++; return new Promise(resolve => { release = resolve; }); });
  assert.equal(t.context.nodes.length, 0);
  const first = t.drone.prepare(), second = t.drone.prepare();
  assert.equal(loads, 1);
  release(sample); await Promise.all([first, second]);
  assert.equal(t.context.nodes.length, 0);
  await t.drone.prepare();
  assert.equal(loads, 1);
});

test('tanpura plays the shared six-string preset with staggered attacks and filtering', async () => {
  const t = setup(); await t.drone.prepare(); t.drone.set(48, 0.8);
  assert.equal(t.context.sources.length, 6);
  assert.ok(t.context.sources.every(voice => voice.buffer === sample && voice.loop));
  assert.deepEqual(t.context.sources.map(voice => voice.starts), [[10], [10.28], [10.58], [10.46], [10.8], [10.12]]);
  assert.deepEqual(t.context.filters.map(filter => filter.type), ['lowpass', 'lowpass']);
  assert.ok(t.context.filters.every(filter => filter.frequency.value > 300 && filter.Q.value > 0));
  assert.equal(t.context.oscillators.length, 1);
  assert.ok(t.context.oscillators[0].frequency.value > 1);
  assert.deepEqual(t.context.gains[0].connections, [t.output]);
  t.drone.dispose();
});

test('every key transposes every string including upper-octave strings without clipping pitch', async () => {
  const t = setup(); await t.drone.prepare();
  for (let tonic = 0; tonic < 12; tonic++) {
    t.drone.set(48 + tonic, 0.8);
    const pitches = t.context.sources.map(voice => 48 + 12 * Math.log2(voice.playbackRate.value));
    const fifth = 12 * Math.log2(3 / 2);
    const expected = [fifth, 12, 0, fifth, 12, 0].map(offset => 48 + tonic + offset);
    pitches.forEach((pitch, index) => assert.ok(Math.abs(pitch - expected[index]) < 0.02, `key ${tonic}, string ${index}: ${pitch}`));
  }
  assert.equal(t.context.sources.length, 6); // Retuning does not restart the strings.
  t.drone.dispose();
});

test('volume changes preserve playback, and muting or stopping releases every node', async () => {
  const t = setup(); await t.drone.prepare(); t.drone.set(50, 0.8);
  const voices = [...t.context.sources];
  const loud = t.context.gains[0].gain.value;
  t.drone.set(50, 0.4);
  assert.equal(t.context.gains[0].gain.value, loud / 2);
  assert.equal(t.context.sources.length, 6);
  assert.ok(voices.every(voice => voice.stops === 0));
  t.drone.set(50, 0);
  assert.ok(t.context.nodes.every(node => node.disconnected));
  assert.ok(voices.every(voice => voice.stops === 1));
  assert.equal(t.context.oscillators[0].stops, 1);
  t.drone.set(50, 0.8);
  assert.equal(t.context.sources.length, 12);
  t.drone.set(null, 0);
  assert.ok(t.context.sources.every(voice => voice.stops === 1));
  t.drone.dispose();
});

test('stopping or disposing during a pending load cannot start late audio', async () => {
  for (const dispose of [false, true]) {
    let release!: (buffer: AudioBuffer) => void;
    const t = setup(() => new Promise(resolve => { release = resolve; }));
    const load = t.drone.prepare();
    if (dispose) t.drone.dispose(); else t.drone.stop();
    release(sample); await load;
    assert.equal(t.context.nodes.length, 0);
    if (dispose) { t.drone.set(48, 1); assert.equal(t.context.nodes.length, 0); }
    t.drone.dispose();
  }
});

test('a failed sample load can retry on the next user action', async () => {
  let loads = 0;
  const t = setup(async () => { if (++loads === 1) throw new Error('Load failed'); return sample; });
  await assert.rejects(t.drone.prepare(), /Load failed/);
  assert.equal(t.context.nodes.length, 0);
  await t.drone.prepare(); t.drone.set(48, 0.8);
  assert.equal(loads, 2);
  assert.equal(t.context.sources.length, 6);
  t.drone.dispose();
});
