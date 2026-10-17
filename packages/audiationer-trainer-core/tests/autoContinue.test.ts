import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_CONTINUE_DELAYS, TrainerSession, normalizeSettings, type Settings, type TrainerAudio } from '../src/index.ts';

class AudioMock implements TrainerAudio {
  played: number[][] = [];
  async unlock() {}
  async notes(midis: number[], _seconds: number, signal: AbortSignal) { signal.throwIfAborted(); this.played.push(midis); }
  drone() {} volume() {} async speak() {} stop() {}
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function setup(extra: Partial<Settings> = {}) {
  const audio = new AudioMock();
  let now = 1000;
  const timers: { callback: () => void; due: number; cancelled: boolean; fired: boolean }[] = [];
  const session = new TrainerSession(audio, () => {}, () => 0,
    async (_ms, signal) => { signal.throwIfAborted(); }, () => now, (callback, ms) => {
      const timer = { callback, due: now + ms, cancelled: false, fired: false }; timers.push(timer);
      return () => { timer.cancelled = true; };
    });
  const settings = normalizeSettings({ mode: 'degrees', degrees: [0], qualities: [0], melodyLength: 2, cadence: false, resolve: false, rounds: 2, autoContinueCorrect: true, degreeOptions: { reviewSkip: 'none' }, ...extra });
  return {
    audio, session, settings, timers,
    async elapse(ms: number) {
      const end = now + ms;
      let timer;
      while ((timer = timers.filter(t => !t.cancelled && !t.fired && t.due <= end).sort((a, b) => a.due - b.due)[0])) {
        now = timer.due; timer.fired = true; timer.callback(); await flush();
      }
      now = end;
    },
    async correct() { for (let i = 0; i < (settings.mode === 'melody' ? 2 : 1); i++) await session.answer(0); },
  };
}

test('auto-continue is opt-in, defaults to two seconds, validates saves and persists the selected delay', () => {
  const defaults = normalizeSettings({});
  assert.equal(defaults.autoContinueCorrect, false);
  assert.equal(defaults.autoContinueSeconds, 2);
  const invalid = normalizeSettings({ autoContinueCorrect: 'yes', autoContinueSeconds: NaN });
  assert.equal(invalid.autoContinueCorrect, false);
  assert.equal(invalid.autoContinueSeconds, 2);
  assert.equal(normalizeSettings({ autoContinueSeconds: 3 }).autoContinueSeconds, 2);
  for (const delay of AUTO_CONTINUE_DELAYS) {
    const settings = normalizeSettings({ autoContinueCorrect: true, autoContinueSeconds: delay });
    assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(settings))), settings);
    assert.equal(settings.autoContinueSeconds, delay);
  }
});

test('all four scored modes wait the selected delay, advance once, and finish after the final countdown', async () => {
  for (const mode of ['degrees', 'melody', 'chords', 'quality'] as const) {
    for (const seconds of AUTO_CONTINUE_DELAYS) {
      const t = setup({ mode, autoContinueSeconds: seconds, reviewSkip: 'correct' });
      await t.session.start(t.settings);
      assert.equal(t.session.snapshot().autoContinueDeadline, null);
      await t.correct();
      assert.equal(t.session.snapshot().phase, 'feedback', `${mode}, ${seconds}s`);
      assert.equal(t.session.snapshot().reviewSkipped, false);
      assert.equal(t.session.snapshot().autoContinueDeadline, 1000 + seconds * 1000);
      await t.elapse(seconds * 1000 - 1);
      assert.equal(t.session.snapshot().round, 1);
      await t.elapse(1);
      assert.equal(t.session.snapshot().phase, 'answering');
      assert.equal(t.session.snapshot().round, 2);
      assert.equal(t.session.snapshot().autoContinueDeadline, null);
      t.timers[0].callback(); await flush(); // A stale callback cannot skip another question.
      assert.equal(t.session.snapshot().round, 2);
      await t.correct();
      await t.elapse(seconds * 1000);
      assert.equal(t.session.snapshot().phase, 'finished');
      assert.equal(t.session.snapshot().autoContinueDeadline, null);
      assert.deepEqual(t.session.snapshot().results.map(result => result.correct), [true, true]);
      t.session.destroy();
    }
  }
});

test('disabled auto-continue retains manual reviews; incorrect answers and timeouts never start its countdown', async () => {
  for (const mode of ['degrees', 'melody'] as const) {
    const off = setup({ mode, autoContinueCorrect: false });
    await off.session.start(off.settings); await off.correct(); await off.elapse(10000);
    assert.equal(off.session.snapshot().phase, 'feedback');
    assert.equal(off.session.snapshot().autoContinueDeadline, null);
    assert.equal(off.timers.length, 0);
    off.session.destroy();
    const wrong = setup({ mode, degrees: [0, 4] });
    await wrong.session.start(wrong.settings);
    await wrong.session.answer(4);
    if (mode === 'melody') await wrong.session.answer(0);
    await wrong.elapse(10000);
    assert.equal(wrong.session.snapshot().phase, 'feedback');
    assert.equal(wrong.session.snapshot().results[0].correct, false);
    assert.equal(wrong.session.snapshot().autoContinueDeadline, null);
    assert.equal(wrong.timers.length, 0);
    wrong.session.destroy();
  }
  const timeout = setup({ answerSeconds: 2 });
  await timeout.session.start(timeout.settings); await timeout.elapse(2000);
  assert.equal(timeout.session.snapshot().results[0].received, 'Time out');
  assert.equal(timeout.session.snapshot().autoContinueDeadline, null);
  timeout.session.destroy();
});

test('the countdown takes precedence over Degrees skip-correct and skip-all without changing incorrect review policy', async () => {
  for (const reviewSkip of ['correct', 'all'] as const) {
    const t = setup({ degreeOptions: { ...normalizeSettings({}).degreeOptions, reviewSkip }, degrees: [0, 4] });
    await t.session.start(t.settings); await t.correct();
    assert.equal(t.session.snapshot().phase, 'feedback');
    await t.elapse(2000);
    assert.equal(t.session.snapshot().round, 2);
    await t.session.answer(4);
    assert.equal(t.session.snapshot().phase, reviewSkip === 'all' ? 'finished' : 'feedback');
    assert.equal(t.session.snapshot().autoContinueDeadline, null);
    t.session.destroy();
  }
});

test('manual Next and all session exits cancel the countdown and invalidate callbacks', async () => {
  for (const action of ['next', 'stop', 'reset', 'restart', 'destroy'] as const) {
    const t = setup();
    await t.session.start(t.settings); await t.correct();
    const timer = t.timers[0];
    if (action === 'restart') await t.session.start(t.settings);
    else await t.session[action]();
    assert.equal(timer.cancelled, true, action);
    assert.equal(t.session.snapshot().autoContinueDeadline, null, action);
    const expected = t.session.snapshot();
    timer.callback(); await t.elapse(10000); await flush();
    assert.deepEqual(t.session.snapshot(), expected, action);
    t.session.destroy();
  }
});

test('replay, exploration and octave changes preserve the original countdown without rescoring', async () => {
  const t = setup({ mode: 'melody' });
  await t.session.start(t.settings); await t.correct();
  const deadline = t.session.snapshot().autoContinueDeadline;
  await t.elapse(1000);
  await t.session.replayMelody('input');
  await t.session.replayMelody('revealed');
  t.session.setFeedbackOctave(5);
  await t.session.answer(0);
  assert.equal(t.session.snapshot().autoContinueDeadline, deadline);
  assert.equal(t.session.snapshot().results.length, 1);
  await t.elapse(1000);
  assert.equal(t.session.snapshot().phase, 'answering');
  assert.equal(t.session.snapshot().round, 2);
  t.session.destroy();
});

test('the countdown starts after resolution audio finishes so the timeline keeps its event order', async () => {
  const t = setup({ resolve: true, degrees: [4] });
  await t.session.start(t.settings);
  const notes = t.audio.notes.bind(t.audio);
  let release!: () => void;
  let block = true;
  t.audio.notes = async (midis, seconds, signal) => {
    if (block) { block = false; await new Promise<void>(resolve => { release = resolve; }); }
    await notes(midis, seconds, signal);
  };
  const answer = t.session.answer(4);
  assert.equal(t.session.snapshot().phase, 'feedback');
  await t.elapse(2000);
  assert.equal(t.session.snapshot().phase, 'feedback');
  assert.equal(t.session.snapshot().autoContinueDeadline, null);
  release(); await answer;
  assert.equal(t.session.snapshot().autoContinueDeadline, 5000);
  await t.elapse(2000);
  assert.equal(t.session.snapshot().round, 2);
  assert.equal(t.session.snapshot().activeDegree, null);
  assert.equal(t.session.snapshot().results.length, 1);
  t.session.destroy();
});

test('exploration during resolution still starts one countdown after the replacement feedback ends', async () => {
  for (const action of ['explore', 'replay', 'octave'] as const) {
    const t = setup({ mode: 'melody', resolve: true, degrees: [4] });
    await t.session.start(t.settings);
    const notes = t.audio.notes.bind(t.audio);
    let release!: () => void;
    let block = true;
    t.audio.notes = async (midis, seconds, signal) => {
      if (block) { block = false; await new Promise<void>(resolve => { release = resolve; }); }
      await notes(midis, seconds, signal);
    };
    await t.session.answer(4);
    const answer = t.session.answer(4);
    assert.equal(t.session.snapshot().autoContinueDeadline, null);
    if (action === 'explore') await t.session.answer(4);
    else if (action === 'replay') await t.session.replaySequence('revealed');
    else t.session.setFeedbackOctave(5);
    assert.equal(t.session.snapshot().autoContinueDeadline, 3000, action);
    release(); await answer;
    assert.equal(t.timers.length, 1, action);
    await t.elapse(2000);
    assert.equal(t.session.snapshot().round, 2, action);
    t.session.destroy();
  }
});
