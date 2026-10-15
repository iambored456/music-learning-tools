import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FREEPLAY_DEGREES, FreeplaySession, normalizeFreeplaySettings, type FreeplayAudio, type SoundPreset } from '../src/index.ts';

class AudioMock implements FreeplayAudio {
  held: { midi: number; released: boolean }[] = [];
  played: number[][] = [];
  presets: SoundPreset[] = [];
  melodyVolume = 0;
  drones: { midi: number | null; volume: number }[] = [];
  unlocks = 0;
  async unlock() { this.unlocks++; }
  volume(value: number) { this.melodyVolume = value; }
  preset(value: SoundPreset) { this.presets.push(value); }
  sustain(midi: number) {
    const voice = { midi, released: false }; this.held.push(voice);
    return () => { voice.released = true; };
  }
  async notes(midis: number[], _seconds: number, signal: AbortSignal) { signal.throwIfAborted(); this.played.push(midis); }
  drone(midi: number | null, volume: number) { this.drones.push({ midi, volume }); }
  stop() { for (const voice of this.held) voice.released = true; }
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function setup(extra = {}) {
  const audio = new AudioMock(), settings = normalizeFreeplaySettings(extra);
  const timers: { callback: () => void; ms: number; cancelled: boolean }[] = [];
  const session = new FreeplaySession(audio, settings, () => {}, undefined, (callback, ms) => {
    const timer = { callback, ms, cancelled: false }; timers.push(timer); return () => { timer.cancelled = true; };
  });
  return { audio, settings, session, timers };
}

test('Free Play normalizes sound settings and locks pitch octaves to 3–6', () => {
  assert.equal(normalizeFreeplaySettings({ octave: 2 }).octave, 3);
  assert.equal(normalizeFreeplaySettings({ octave: 9 }).octave, 6);
  assert.equal(normalizeFreeplaySettings({ soundPreset: 'bad' }).soundPreset, 'synth');
  assert.equal(normalizeFreeplaySettings({ melodyVolume: NaN }).melodyVolume, 0.9);
  assert.equal(normalizeFreeplaySettings({ droneVolume: 4 }).droneVolume, 1);
});

test('opening and configuring Free Play does not start audio', () => {
  const t = setup(); t.session.configure({ ...t.settings, octave: 5 });
  assert.equal(t.audio.unlocks, 0);
  assert.deepEqual(t.audio.held, []);
  assert.deepEqual(t.audio.drones, []);
  assert.equal(t.session.snapshot().awake, false);
});

test('all twelve degrees can sustain together and clicking one releases only that degree', async () => {
  const t = setup();
  for (const degree of FREEPLAY_DEGREES) t.session.press(degree).finish(true);
  await flush();
  assert.deepEqual(t.session.snapshot().sustained, FREEPLAY_DEGREES);
  assert.deepEqual(t.audio.held.map(voice => voice.midi), FREEPLAY_DEGREES.map(degree => 60 + degree));
  t.session.press(6).finish(false);
  assert.deepEqual(t.session.snapshot().sustained, FREEPLAY_DEGREES.filter(degree => degree !== 6));
  assert.equal(t.audio.held[6].released, true);
  assert.equal(t.audio.held[5].released, false);
  t.session.destroy();
  assert.ok(t.audio.held.every(voice => voice.released));
});

test('a quick click plays briefly even when pointer release precedes audio unlock', async () => {
  const t = setup(); t.session.press(3).finish(false);
  await flush();
  assert.deepEqual(t.session.snapshot().sounding, [3]);
  assert.deepEqual(t.session.snapshot().sustained, []);
  assert.equal(t.timers[0].ms, 250);
  t.timers[0].callback();
  assert.deepEqual(t.session.snapshot().sounding, []);
  assert.equal(t.audio.held[0].released, true);
});

test('a cancelled pointer releases its note and stale tap timers cannot release a newer sustain', async () => {
  const t = setup();
  const cancelled = t.session.press(7); await flush(); cancelled.cancel();
  assert.deepEqual(t.session.snapshot().sounding, []);
  t.session.press(7).finish(false); await flush();
  t.session.press(7).finish(true); await flush();
  assert.ok(t.timers[0].cancelled);
  t.timers[0].callback();
  assert.deepEqual(t.session.snapshot().sustained, [7]);
});

test('stopping invalidates a pending unlock and cannot leave a stuck sustained note', async () => {
  const t = setup(); let unlock!: () => void;
  t.audio.unlock = () => new Promise<void>(resolve => { unlock = resolve; });
  t.session.press(0).finish(true); t.session.stopAll();
  unlock(); await flush();
  assert.deepEqual(t.audio.held, []);
  assert.deepEqual(t.session.snapshot().sustained, []);
  assert.equal(t.session.snapshot().awake, false);
});

test('key and octave changes transpose sustained pitches while preserving their sound preset', async () => {
  const t = setup({ tonic: 11, octave: 4, soundPreset: 'soft' });
  t.session.press(2).finish(true); await flush();
  assert.equal(t.audio.held[0].midi, 73);
  t.session.configure({ ...t.settings, tonic: 0, octave: 6 }); await flush();
  assert.equal(t.audio.held[0].released, true);
  assert.equal(t.audio.held[1].midi, 86);
  assert.deepEqual(t.session.snapshot().sustained, [2]);
  assert.ok(t.audio.presets.every(preset => preset === 'soft'));
  assert.equal(t.audio.drones.at(-1)?.midi, 48); // The drone keeps its own register.
});

test('sound and independent volume settings update without retriggering a sustained pitch', async () => {
  const t = setup(); t.session.press(4).finish(true); await flush();
  t.session.configure({ ...t.settings, soundPreset: 'hollow', melodyVolume: 0, droneVolume: 0.7 });
  assert.equal(t.audio.presets.at(-1), 'hollow');
  assert.equal(t.audio.melodyVolume, 0);
  assert.equal(t.audio.drones.at(-1)?.volume, 0.7);
  assert.equal(t.audio.held.length, 1);
  assert.equal(t.audio.held[0].released, false);
});

test('Cycle traverses all twelve degrees and can stop cleanly', async () => {
  const audio = new AudioMock(); let session: FreeplaySession;
  session = new FreeplaySession(audio, normalizeFreeplaySettings({ tonic: 2, octave: 3 }), () => {}, async (_ms, signal) => {
    if (audio.played.length === 12) session.stopAll();
    signal.throwIfAborted();
  });
  await session.toggleCycle();
  assert.deepEqual(audio.played, FREEPLAY_DEGREES.map(degree => [50 + degree]));
  assert.equal(session.snapshot().cycling, false);
  assert.deepEqual(session.snapshot().sounding, []);
});

test('turning Cycle off before unlock prevents stale playback', async () => {
  const t = setup(); let unlock!: () => void;
  t.audio.unlock = () => new Promise<void>(resolve => { unlock = resolve; });
  const cycle = t.session.toggleCycle(); await t.session.toggleCycle();
  unlock(); await cycle;
  assert.deepEqual(t.audio.played, []);
  assert.equal(t.session.snapshot().cycling, false);
});
