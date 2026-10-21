import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrainerSession, normalizeSettings, type Settings, type TrainerAudio } from '../src/index.ts';

type Event = { kind: 'pause'; ms: number; tonicizing: boolean } | { kind: 'note'; seconds: number; tonicizing: boolean; midis: number[] };
function setup(extra: Partial<Settings> = {}) {
  let now = 1000;
  let session: TrainerSession;
  const events: Event[] = [];
  const activeDegrees: number[] = [];
  const audio: TrainerAudio = {
    async unlock() {},
    async notes(midis, seconds, signal) {
      signal.throwIfAborted();
      events.push({ kind: 'note', seconds, midis, tonicizing: session.snapshot().tonicizing });
      now += seconds * 1000;
    },
    drone() {}, volume() {}, async speak() {}, stop() {},
  };
  session = new TrainerSession(audio, state => {
    if (state.tonicizing && state.activeDegree !== null) activeDegrees.push(state.activeDegree);
  }, () => 0, async (ms, signal) => {
    signal.throwIfAborted();
    events.push({ kind: 'pause', ms, tonicizing: session.snapshot().tonicizing });
    now += ms;
  }, () => now, () => () => {});
  const settings = normalizeSettings({ mode: 'degrees', degrees: [0], qualities: [0], cadence: false, resolve: false, rounds: 10, ...extra });
  return { audio, session, settings, events, activeDegrees, now: () => now };
}

test('every scored mode waits half a second before the first question and every subsequent question', async () => {
  for (const mode of ['degrees', 'melody', 'chords', 'quality'] as const) {
    const t = setup({ mode, melodyLength: 2 });
    await t.session.start(t.settings);
    assert.deepEqual(t.events[0], { kind: 'pause', ms: 500, tonicizing: false }, mode);
    assert.equal(t.events[1].kind, 'note');
    t.events.length = 0;
    for (let note = 0; note < (mode === 'melody' ? 2 : 1); note++) await t.session.answer(0);
    assert.deepEqual(t.events.slice(0, 2), [
      { kind: 'pause', ms: 400, tonicizing: false }, // Skipped correct review.
      { kind: 'pause', ms: 500, tonicizing: false },
    ]);
    assert.equal(t.events[2].kind, 'note');
    assert.equal(t.session.snapshot().phase, 'answering');
    t.session.destroy();
  }
});

test('major Degrees and Melody tonicize at 60 BPM with eighth notes and a quarter-note final tonic', async () => {
  for (const mode of ['degrees', 'melody'] as const) {
    for (const noteGap of [0.6, 1.2]) {
      const t = setup({ mode, cadence: true, octaveCount: 2, noteGap, answerSeconds: 2 });
      await t.session.start(t.settings);
      const notes = t.events.filter(event => event.kind === 'note').filter(event => event.tonicizing);
      assert.deepEqual(notes.map(event => event.midis), [[48], [52], [55], [53], [50], [47], [48]]);
      assert.deepEqual(notes.map(event => event.seconds), [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.8]);
      assert.deepEqual(t.events.filter(event => event.kind === 'pause').filter(event => event.tonicizing).map(event => event.ms), [100, 100, 100, 100, 100, 100, 200]);
      assert.deepEqual(t.activeDegrees, [0, 4, 7, 5, 2, 11, 0]);
      assert.equal(t.session.snapshot().answerDeadline, t.now() + 2000);
      t.session.destroy();
    }
  }
});

test('non-major scales and chord exercises keep their context phrase with a doubled final tonic at 60 BPM', async () => {
  for (const extra of [{ mode: 'degrees', scale: '6' }, { mode: 'melody', scale: '6' }, { mode: 'chords' }, { mode: 'chord-progressions' }] as const) {
    const t = setup({ ...extra, cadence: true });
    await t.session.start(t.settings);
    const notes = t.events.filter(event => event.kind === 'note').filter(event => event.tonicizing);
    assert.deepEqual(notes.map(event => event.midis), [[60], [65], [67], [60]]);
    assert.deepEqual(notes.map(event => event.seconds), [0.8, 0.8, 0.8, 1.6]);
    t.session.destroy();
  }
});

test('tonicization marks only cadence notes, followed by a half-second gap and a longer Degrees question', async () => {
  const t = setup({ cadence: true });
  await t.session.start(t.settings);
  for (let question = 1; question <= 5; question++) await t.session.answer(0);
  const notes = t.events.filter(event => event.kind === 'note');
  const cadenceNotes = notes.filter(event => event.tonicizing);
  assert.deepEqual(cadenceNotes.map(event => event.midis), [[60], [64], [67], [65], [62], [59], [60], [61], [65], [68], [66], [63], [60], [61]]);
  assert.deepEqual(cadenceNotes.map(event => event.seconds), [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.8, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.8]);
  assert.equal(notes.filter(event => !event.tonicizing).length, 6);
  for (let index = 0; index < t.events.length; index++) {
    const event = t.events[index];
    if (event.kind === 'note' && !event.tonicizing) {
      assert.equal(event.seconds, 1.2);
      assert.deepEqual(t.events[index - 1], { kind: 'pause', ms: 500, tonicizing: false });
    }
  }
  assert.equal(t.session.snapshot().tonicizing, false);
  t.session.destroy();
});

test('Degrees replay uses the same longer note and lead-in; the answer timer starts only after playback', async () => {
  const t = setup({ answerSeconds: 2 });
  await t.session.start(t.settings);
  assert.equal(t.now(), 2860); // 500 ms lead-in + 1200 ms note + 160 ms existing note gap.
  assert.equal(t.session.snapshot().answerDeadline, 4860);
  t.events.length = 0;
  await t.session.repeat();
  assert.deepEqual(t.events, [
    { kind: 'pause', ms: 500, tonicizing: false },
    { kind: 'note', seconds: 1.2, midis: [60], tonicizing: false },
    { kind: 'pause', ms: 160, tonicizing: false },
  ]);
  assert.equal(t.session.snapshot().answerDeadline, t.now() + 2000);
  const slower = setup({ noteGap: 2 });
  await slower.session.start(slower.settings);
  const note = slower.events.find(event => event.kind === 'note');
  assert.ok(note?.kind === 'note');
  assert.equal(note.seconds, 1.6); // Existing slower playback preferences still take effect.
  slower.session.destroy(); t.session.destroy();
});

test('cancelling in the pre-question gap prevents any question playback', async () => {
  for (const mode of ['degrees', 'melody', 'chords', 'quality'] as const) {
    let session: TrainerSession;
    let notes = 0;
    const audio: TrainerAudio = { async unlock() {}, async notes() { notes++; }, drone() {}, volume() {}, async speak() {}, stop() {} };
    session = new TrainerSession(audio, () => {}, () => 0, async (ms, signal) => {
      assert.equal(ms, 500);
      session.stop(); signal.throwIfAborted();
    });
    await session.start(normalizeSettings({ mode, cadence: false }));
    assert.equal(notes, 0);
    assert.equal(session.snapshot().phase, 'idle');
    assert.equal(session.snapshot().tonicizing, false);
    session.destroy();
  }
});

test('a cancelled cadence cannot clear tonicization state in a newer session', async () => {
  const t = setup({ cadence: true });
  const original = t.audio.notes.bind(t.audio);
  const releases: (() => void)[] = [];
  t.audio.notes = async (midis, seconds, signal) => {
    if (releases.length < 2) await new Promise<void>(resolve => { releases.push(resolve); });
    signal.throwIfAborted();
    await original(midis, seconds, signal);
  };
  const old = t.session.start(t.settings);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(t.session.snapshot().tonicizing, true);
  const current = t.session.start(t.settings);
  await new Promise<void>(resolve => setImmediate(resolve));
  releases[0](); await old;
  assert.equal(t.session.snapshot().tonicizing, true);
  releases[1](); await current;
  assert.equal(t.session.snapshot().tonicizing, false);
  assert.equal(t.session.snapshot().phase, 'answering');
  t.session.destroy();
});
