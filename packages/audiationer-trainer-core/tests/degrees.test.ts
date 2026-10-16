import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrainerSession, normalizeDegreeSettings, normalizeSettings, type DegreeSettings, type Settings, type SoundPreset, type TrainerAudio } from '../src/index.ts';

class DegreeAudio implements TrainerAudio {
  played: number[][] = [];
  presets: SoundPreset[] = [];
  volumes: number[] = [];
  drones: { midi: number | null; volume: number }[] = [];
  independent: boolean[] = [];
  async unlock() {}
  async notes(midis: number[], _seconds: number, signal: AbortSignal) { signal.throwIfAborted(); this.played.push(midis); }
  drone(midi: number | null, volume: number) { this.drones.push({ midi, volume }); }
  volume(value: number) { this.volumes.push(value); }
  preset(value: SoundPreset) { this.presets.push(value); }
  separateDroneVolume(value: boolean) { this.independent.push(value); }
  async speak() {}
  stop() {}
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function setup(options: Partial<DegreeSettings> = {}, extra: Partial<Settings> = {}) {
  const audio = new DegreeAudio();
  let now = 1000;
  const timers: { callback: () => void; cancelled: boolean }[] = [];
  const session = new TrainerSession(audio, () => {}, () => 0,
    async (_ms, signal) => { signal.throwIfAborted(); }, () => now, callback => {
      const timer = { callback, cancelled: false }; timers.push(timer);
      return () => { timer.cancelled = true; };
    });
  const settings = normalizeSettings({ mode: 'degrees', cadence: false, resolve: false, degrees: [0, 4], rounds: 2, ...extra, degreeOptions: { reviewSkip: 'none', ...options } });
  return { audio, session, settings, timers, advance: (ms: number) => { now += ms; } };
}

test('Degrees settings migrate old saves, validate values and persist independently', () => {
  const old = normalizeSettings({ mode: 'degrees', rounds: 10, answerSeconds: 2 });
  assert.deepEqual(old.degreeOptions, { soundPreset: 'synth', reviewSkip: 'correct', droneVolume: 0.8, melodyVolume: 0.9, showTimeLeft: false });
  assert.deepEqual(normalizeDegreeSettings({ soundPreset: 'bad', reviewSkip: 'bad', droneVolume: 2, melodyVolume: NaN, showTimeLeft: 'yes' }),
    { ...old.degreeOptions, droneVolume: 1 });
  old.degreeOptions.soundPreset = 'soft';
  old.degreeOptions.showTimeLeft = true;
  old.degreeOptions.droneVolume = 0;
  assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(old))), old);
  assert.equal(normalizeSettings({}).degreeOptions.soundPreset, 'synth');
  assert.equal(old.pocket.soundPreset, 'synth');
  assert.equal(old.answerSeconds, 2);
});

test('No skip holds correct and incorrect reviews and allows exploration without rescoring', async () => {
  for (const answer of [0, 4]) {
    const t = setup();
    await t.session.start(t.settings);
    await t.session.next(); // Unanswered questions cannot be skipped.
    assert.equal(t.session.snapshot().round, 1);
    await t.session.answer(answer);
    assert.equal(t.session.snapshot().phase, 'feedback');
    const result = t.session.snapshot().results;
    assert.equal(result[0].correct, answer === 0);
    await t.session.answer(4);
    assert.deepEqual(t.session.snapshot().results, result);
    assert.equal(t.session.snapshot().phase, 'feedback');
    assert.deepEqual(t.audio.played.at(-1), [64]);
    await t.session.next();
    assert.equal(t.session.snapshot().phase, 'answering');
    assert.equal(t.session.snapshot().round, 2);
    assert.deepEqual(t.session.snapshot().input, []);
    await t.session.answer(0);
    assert.equal(t.session.snapshot().phase, 'feedback');
    await t.session.next();
    assert.equal(t.session.snapshot().phase, 'finished');
    assert.equal(t.session.snapshot().results.length, 2);
  }
});

test('Skip correct advances after a brief flash and retains incorrect reviews', async () => {
  const t = setup({ reviewSkip: 'correct' }, { resolve: true });
  await t.session.start(t.settings);
  await t.session.answer(0);
  assert.equal(t.session.snapshot().phase, 'answering');
  assert.equal(t.session.snapshot().round, 2);
  assert.deepEqual(t.audio.played, [[60], [60]]); // No resolution or review replay for the skipped answer.
  await t.session.answer(4);
  assert.equal(t.session.snapshot().phase, 'feedback');
  assert.deepEqual(t.audio.played, [[60], [60], [60]]);
  assert.equal(t.session.snapshot().results[1].correct, false);
  await t.session.next();
  assert.equal(t.session.snapshot().phase, 'finished');
});

test('Skip all skips both kinds of review and ends after the configured session length', async () => {
  for (const answer of [0, 4]) {
    const t = setup({ reviewSkip: 'all' }, { rounds: 1, resolve: true });
    await t.session.start(t.settings);
    await t.session.answer(answer);
    assert.equal(t.session.snapshot().phase, 'finished');
    assert.equal(t.session.snapshot().results[0].correct, answer === 0);
    assert.deepEqual(t.audio.played, [[60]]);
    await t.session.next();
    assert.equal(t.session.snapshot().results.length, 1);
  }
});

test('hidden and visible timers both enforce difficulty, and timeouts follow the review policy', async () => {
  for (const showTimeLeft of [false, true]) {
    for (const reviewSkip of ['none', 'correct', 'all'] as const) {
      const t = setup({ showTimeLeft, reviewSkip }, { answerSeconds: 2, rounds: 1 });
      await t.session.start(t.settings);
      assert.equal(t.session.snapshot().answerDeadline, 3000);
      t.advance(2000); t.timers[0].callback(); await flush();
      assert.equal(t.session.snapshot().answerDeadline, null);
      assert.equal(t.timers[0].cancelled, true);
      assert.equal(t.session.snapshot().results[0].received, 'Time out');
      assert.equal(t.session.snapshot().phase, reviewSkip === 'all' ? 'finished' : 'feedback');
      if (reviewSkip !== 'all') await t.session.next();
      assert.equal(t.session.snapshot().phase, 'finished');
      t.timers[0].callback(); await flush();
      assert.equal(t.session.snapshot().results.length, 1);
    }
  }
});

test('Degrees applies its chosen sound and independent volumes and restores other modes', async () => {
  const t = setup({ soundPreset: 'hollow', droneVolume: 0.35, melodyVolume: 0 }, { drone: false });
  await t.session.start(t.settings);
  assert.deepEqual(t.audio.presets, ['hollow']);
  assert.deepEqual(t.audio.volumes, [0]);
  assert.deepEqual(t.audio.independent, [true]);
  assert.deepEqual(t.audio.drones.at(-1), { midi: 48, volume: 0.35 });
  t.session.stop();
  await t.session.start({ ...t.settings, mode: 'chords', drone: true, volume: 0.6, droneVolume: 0.1 });
  assert.deepEqual(t.audio.presets, ['hollow', 'synth']);
  assert.deepEqual(t.audio.volumes, [0, 0.6]);
  assert.deepEqual(t.audio.independent, [true, false]);
  assert.deepEqual(t.audio.drones.at(-1), { midi: 48, volume: 0.1 });
  t.session.stop();
  await t.session.start({ ...t.settings, degreeOptions: { ...t.settings.degreeOptions, droneVolume: 0 } });
  assert.deepEqual(t.audio.drones.at(-1), { midi: null, volume: 0 });
  t.session.stop();
});

test('Degrees melody toggle establishes each changed tonic and can silence that introduction', async () => {
  for (const cadence of [true, false]) {
    const t = setup({ reviewSkip: 'all' }, { cadence, questionsPerKey: 1 });
    // Each prepare and question consume one random value; use a sequence with a new tonic on round two.
    const values = [0, 0, 0.5, 0];
    let index = 0;
    const changing = new TrainerSession(t.audio, () => {}, () => values[index++ % values.length], async (_ms, signal) => { signal.throwIfAborted(); });
    await changing.start(t.settings);
    await changing.answer(0);
    assert.equal(changing.snapshot().tonic, 6);
    assert.equal(t.audio.played.length, cadence ? 10 : 2);
    if (cadence) assert.deepEqual(t.audio.played.slice(5, 9), [[66], [71], [73], [66]]);
    changing.stop();
  }
});

test('Next cancels a Degrees review replay and stopping a review cannot create a new question', async () => {
  const t = setup();
  await t.session.start(t.settings);
  const original = t.audio.notes.bind(t.audio);
  let release!: () => void;
  let block = true;
  t.audio.notes = async (midis, seconds, signal) => {
    if (block) {
      block = false;
      await new Promise<void>(resolve => { release = resolve; });
    }
    await original(midis, seconds, signal);
  };
  const review = t.session.answer(4);
  await t.session.next();
  release(); await review;
  assert.equal(t.session.snapshot().phase, 'answering');
  assert.equal(t.session.snapshot().round, 2);
  assert.deepEqual(t.audio.played, [[60], [60]]);
  await t.session.answer(0);
  t.session.stop();
  await t.session.next();
  assert.equal(t.session.snapshot().phase, 'finished');
  assert.equal(t.session.snapshot().round, 2);
  assert.equal(t.session.snapshot().results.length, 2);
});
