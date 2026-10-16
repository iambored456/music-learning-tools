import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKIPPED_CORRECT_FLASH_MS, TrainerSession, applyPreset, challengePresets, hasAnswerReview, migrateSettingsDefaults, normalizeSettings, pathPresets, type Settings, type TrainerAudio } from '../src/index.ts';

const modes = ['degrees', 'melody', 'chords', 'quality'] as const;
class AudioMock implements TrainerAudio {
  played: number[][] = [];
  async unlock() {}
  async notes(midis: number[], _seconds: number, signal: AbortSignal) { signal.throwIfAborted(); this.played.push(midis); }
  drone() {} volume() {} async speak() {} stop() {}
}
function setup(extra: Partial<Settings> = {}, holdFlash = false) {
  const audio = new AudioMock();
  const flashes: { ms: number; release: () => void }[] = [];
  const session = new TrainerSession(audio, () => {}, () => 0, async (ms, signal) => {
    signal.throwIfAborted();
    if (holdFlash && ms === SKIPPED_CORRECT_FLASH_MS) await new Promise<void>(resolve => { flashes.push({ ms, release: resolve }); });
    signal.throwIfAborted();
  });
  const settings = normalizeSettings({ mode: 'degrees', degrees: [0], qualities: [0], melodyLength: 2, cadence: false, ...extra });
  return {
    audio, session, settings, flashes,
    async correct() { for (let i = 0; i < (settings.mode === 'melody' ? 2 : 1); i++) await session.answer(0); },
  };
}

test('every built-in level starts with ten questions and Skip correct while configured choices remain available', () => {
  for (const mode of modes) {
    const defaults = normalizeSettings({ mode });
    for (const preset of [...pathPresets(mode), ...challengePresets(mode)]) {
      const settings = applyPreset(defaults, preset);
      assert.equal(settings.rounds, 10, `${mode}: ${preset.name}`);
      assert.equal(settings.reviewSkip, 'correct', `${mode}: ${preset.name}`);
      const changed = applyPreset(normalizeSettings({ ...settings, rounds: 5, reviewSkip: 'none' }), preset);
      assert.equal(changed.rounds, 5);
      assert.equal(changed.reviewSkip, 'none');
      assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(changed))), changed);
    }
  }
});

test('old app defaults upgrade once, preserving sound and other saved preferences', () => {
  const upgraded = migrateSettingsDefaults({ mode: 'melody', rounds: 20, degreeOptions: { reviewSkip: 'none', melodyVolume: 0.35 }, wheelStyle: 'minimal' });
  assert.equal(upgraded.rounds, 10);
  assert.equal(upgraded.reviewSkip, 'correct');
  assert.equal(upgraded.degreeOptions.melodyVolume, 0.35);
  assert.equal(upgraded.wheelStyle, 'minimal');
  const customized = migrateSettingsDefaults({ rounds: 40, degreeOptions: { reviewSkip: 'all' } });
  assert.equal(customized.rounds, 40);
  assert.equal(customized.reviewSkip, 'all');
  const newSave = normalizeSettings({ rounds: 20, reviewSkip: 'none' });
  assert.deepEqual(migrateSettingsDefaults(newSave), newSave);
  assert.equal(normalizeSettings({ degreeOptions: { reviewSkip: 'all' } }).reviewSkip, 'all');
  assert.equal(normalizeSettings({ reviewSkip: 'correct', degreeOptions: { reviewSkip: 'all' } }).reviewSkip, 'correct');
});

test('skipped correct reviews produce only a brief flash, then advance without answer playback or a countdown', async () => {
  for (const mode of modes) {
    const t = setup({ mode, rounds: 2, resolve: true }, true);
    await t.session.start(t.settings);
    const played = t.audio.played.length;
    const answering = t.correct();
    // Melody needs one microtask to submit its second note.
    await new Promise<void>(resolve => setImmediate(resolve));
    const flash = t.session.snapshot();
    assert.equal(flash.phase, 'feedback', mode);
    assert.equal(flash.reviewSkipped, true);
    assert.equal(hasAnswerReview(flash), false);
    assert.equal(flash.autoContinueDeadline, null);
    assert.equal(flash.activeDegree, null);
    assert.deepEqual(flash.revealed, []);
    assert.equal(flash.results.length, 1);
    assert.equal(t.audio.played.length, played);
    assert.equal(t.flashes[0].ms, 400);
    await t.session.next(); // Review controls cannot interrupt the skipped-review flash.
    await t.session.answer(0);
    await t.session.replayMelody('input');
    t.session.setFeedbackOctave(6);
    assert.deepEqual(t.session.snapshot(), flash);
    t.flashes[0].release(); await answering;
    assert.equal(t.session.snapshot().phase, 'answering');
    assert.equal(t.session.snapshot().round, 2);
    assert.equal(t.session.snapshot().reviewSkipped, false);
    t.session.destroy();
  }
});

test('all four modes retain incorrect reviews under Skip correct and wait for Next without rescoring', async () => {
  for (const mode of modes) {
    const t = setup({ mode, degrees: [0, 4], qualities: [0, 1] });
    await t.session.start(t.settings);
    await t.session.answer(mode === 'quality' ? 1 : 4);
    if (mode === 'melody') await t.session.answer(0);
    const feedback = t.session.snapshot();
    assert.equal(feedback.phase, 'feedback', mode);
    assert.equal(feedback.reviewSkipped, false);
    assert.equal(feedback.results[0].correct, false);
    assert.equal(hasAnswerReview(feedback), true);
    await t.session.answer(0); // Previewing a retained review cannot add another result.
    assert.equal(t.session.snapshot().results.length, 1);
    await t.session.next();
    assert.equal(t.session.snapshot().round, 2);
    t.session.destroy();
  }
});

test('No skip retains correct reviews and Skip all bypasses incorrect reviews in every mode', async () => {
  for (const mode of modes) {
    const retained = setup({ mode, reviewSkip: 'none' });
    await retained.session.start(retained.settings); await retained.correct();
    assert.equal(hasAnswerReview(retained.session.snapshot()), true);
    retained.session.destroy();
    const skipped = setup({ mode, reviewSkip: 'all', degrees: [0, 4], qualities: [0, 1], rounds: 1 });
    await skipped.session.start(skipped.settings);
    await skipped.session.answer(mode === 'quality' ? 1 : 4);
    if (mode === 'melody') await skipped.session.answer(0);
    assert.equal(skipped.session.snapshot().phase, 'finished');
    assert.equal(skipped.session.snapshot().results[0].correct, false);
    skipped.session.destroy();
  }
});

test('default sessions finish after ten correct answers in every mode', async () => {
  for (const mode of modes) {
    const t = setup({ mode });
    await t.session.start(t.settings);
    for (let answer = 0; answer < 10; answer++) {
      assert.equal(t.session.snapshot().phase, 'answering');
      await t.correct();
    }
    assert.equal(t.session.snapshot().phase, 'finished', mode);
    assert.equal(t.session.snapshot().results.length, 10);
    t.session.destroy();
  }
});

test('leaving or restarting during a green flash cancels its pending advance', async () => {
  for (const action of ['stop', 'reset', 'restart', 'destroy'] as const) {
    const t = setup({}, true);
    await t.session.start(t.settings);
    const answer = t.correct();
    if (action === 'restart') await t.session.start(t.settings);
    else t.session[action]();
    const state = t.session.snapshot();
    t.flashes[0].release(); await answer;
    assert.deepEqual(t.session.snapshot(), state, action);
    t.session.destroy();
  }
});
