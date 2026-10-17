import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TrainerSession, allowedDegrees, applyPreset, challengePresets, isScored, normalizeCustomPresets,
  normalizeProgress, normalizeSettings, pathPresets, questionLength, recordProgress, settingsError,
  type Settings, type TrainerAudio,
} from '../src/index.ts';

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function trainer(extra: Partial<Settings> = {}) {
  let now = 1000;
  const played: number[][] = [];
  const timers: { callback: () => void; ms: number; cancelled: boolean }[] = [];
  const audio: TrainerAudio = {
    async unlock() {},
    async notes(midis, seconds, signal) { signal.throwIfAborted(); played.push(midis); now += seconds * 1000; },
    drone() {}, volume() {}, async speak() {}, stop() {},
  };
  const session = new TrainerSession(audio, () => {}, () => 0, async (ms, signal) => {
    signal.throwIfAborted(); now += ms;
  }, () => now, (callback, ms) => {
    const timer = { callback, ms, cancelled: false }; timers.push(timer);
    return () => { timer.cancelled = true; };
  });
  const settings = normalizeSettings({ mode: 'chord-progressions', degrees: [0, 4, 7], cadence: false,
    resolve: false, drone: false, rounds: 1, reviewSkip: 'none', ...extra });
  return { session, settings, played, timers, now: () => now, elapse: (ms: number) => { now += ms; } };
}
const majorQuestion = [[60, 64, 67], [64, 67, 71], [60, 64, 67]];

test('each progression length plays and accepts exactly the configured number of chords', async () => {
  for (let progressionLength = 2; progressionLength <= 8; progressionLength++) {
    const t = trainer({ degrees: [0], progressionLength });
    await t.session.start(t.settings);
    assert.deepEqual(t.played, Array.from({ length: progressionLength }, () => [60, 64, 67]));
    for (let chord = 0; chord < progressionLength - 1; chord++) {
      await t.session.answer(0);
      assert.equal(t.session.snapshot().results.length, 0);
    }
    await t.session.answer(0);
    assert.equal(t.session.snapshot().results.length, 1);
    assert.equal(t.session.snapshot().results[0].correct, true);
    t.session.destroy();
  }
});

test('progression length defaults to three, is independent of Melody, and survives old saves and custom presets', () => {
  const defaults = normalizeSettings({ mode: 'chords', melodyLength: 8 });
  assert.equal(defaults.mode, 'chords');
  assert.equal(defaults.progressionLength, 3);
  assert.equal(questionLength(defaults), 1);
  for (const [value, expected] of [[0, 2], [4, 4], [99, 8], [NaN, 3]]) {
    const settings = normalizeSettings({ ...defaults, mode: 'chord-progressions', progressionLength: value });
    assert.equal(questionLength(settings), expected);
    assert.equal(settings.melodyLength, 8);
    assert.equal(settings.randomTonic, true);
    assert.equal(isScored(settings.mode), true);
    assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(settings))), settings);
  }
  const custom = normalizeCustomPresets([{ id: 'custom-progression', name: 'My progression',
    settings: { mode: 'chord-progressions', progressionLength: 6 } }]);
  assert.equal(custom[0].settings.progressionLength, 6);
  assert.equal(normalizeSettings({ mode: 'pocket', pocket: { exercise: 'chord-progressions', progressionLength: 7 } }).pocket.progressionLength, 7);
});

test('Chords and Chord Progressions share their level pools and reject non-diatonic chord roots', () => {
  assert.deepEqual(pathPresets('chord-progressions'), pathPresets('chords'));
  assert.deepEqual(challengePresets('chord-progressions'), challengePresets('chords'));
  for (const preset of [...pathPresets('chord-progressions'), ...challengePresets('chord-progressions')]) {
    const settings = applyPreset(normalizeSettings({ mode: 'chord-progressions' }), preset);
    assert.equal(settingsError(settings), null, preset.id);
    assert.deepEqual(allowedDegrees(settings), settings.degrees, preset.id);
  }
  assert.deepEqual(allowedDegrees(normalizeSettings({ mode: 'chord-progressions', degrees: [0, 1, 2, 6] })), [0, 2]);
  assert.ok(settingsError(normalizeSettings({ mode: 'chord-progressions', degrees: [1, 6] })));
});

test('a progression plays successive complete triads and grades only the completed ordered answer', async () => {
  const t = trainer();
  await t.session.start(t.settings);
  assert.deepEqual(t.played, majorQuestion);
  assert.equal(t.session.snapshot().phase, 'answering');
  await t.session.answer(1); // Outside the chord pool.
  assert.deepEqual(t.session.snapshot().input, []);
  await t.session.answer(0);
  await t.session.answer(7);
  assert.equal(t.session.snapshot().results.length, 0);
  t.session.undoAnswer();
  assert.deepEqual(t.session.snapshot().input, [0]);
  await t.session.answer(4);
  await t.session.answer(0);
  assert.equal(t.session.snapshot().results.length, 1);
  assert.equal(t.session.snapshot().results[0].correct, true);
  assert.equal(t.session.snapshot().results[0].expected, 'I · iii · I');
  assert.equal(t.session.snapshot().results[0].received, 'I · iii · I');
  await t.session.next();
  assert.equal(t.session.snapshot().phase, 'finished');
  t.session.destroy();
});

test('incorrect progression reviews replay the actual chords and the answer separately without rescoring', async () => {
  const t = trainer();
  await t.session.start(t.settings);
  for (const degree of [0, 0, 4]) await t.session.answer(degree);
  assert.equal(t.session.snapshot().results[0].correct, false);
  assert.deepEqual(t.played.slice(3), majorQuestion);
  t.played.length = 0;
  await t.session.replaySequence('input');
  assert.deepEqual(t.played, [majorQuestion[0], majorQuestion[0], majorQuestion[1]]);
  t.played.length = 0;
  await t.session.replaySequence('revealed');
  assert.deepEqual(t.played, majorQuestion);
  t.played.length = 0;
  await t.session.answer(7);
  assert.deepEqual(t.played, [[67, 71, 74]]);
  assert.equal(t.session.snapshot().results.length, 1);
  t.session.destroy();
});

test('minor progressions preserve chord qualities in both audio and Roman-numeral results', async () => {
  const t = trainer({ scale: '6', degrees: [0, 3] });
  await t.session.start(t.settings);
  assert.deepEqual(t.played, [[60, 63, 67], [63, 67, 70], [60, 63, 67]]);
  for (const degree of [0, 3, 0]) await t.session.answer(degree);
  assert.equal(t.session.snapshot().results[0].expected, 'i · III · i');
  assert.equal(t.session.snapshot().results[0].correct, true);
  t.session.destroy();
});

test('the progression timer starts after all chords, repeat resets it, and a partial timeout counts once', async () => {
  const t = trainer({ answerSeconds: 2 });
  await t.session.start(t.settings);
  assert.equal(t.session.snapshot().answerDeadline, t.now() + 2000);
  await t.session.answer(0);
  await t.session.repeat();
  assert.deepEqual(t.played, [...majorQuestion, ...majorQuestion]);
  assert.equal(t.timers[0].cancelled, true);
  assert.equal(t.session.snapshot().answerDeadline, t.now() + 2000);
  t.elapse(2000); t.timers[1].callback(); await flush();
  assert.equal(t.session.snapshot().results.length, 1);
  assert.equal(t.session.snapshot().results[0].received, 'Time out');
  assert.deepEqual(t.session.snapshot().input, [0]);
  await t.session.answer(0);
  assert.equal(t.session.snapshot().results.length, 1);
  t.session.destroy();
});

test('auto-continue waits for a full correct progression, and key changes count questions rather than chords', async () => {
  const t = trainer({ degrees: [0], rounds: 3, questionsPerKey: 2, autoContinueCorrect: true, autoContinueSeconds: 0.5 });
  await t.session.start(t.settings);
  const keys: number[] = [];
  for (let question = 0; question < 3; question++) {
    keys.push(t.session.snapshot().tonic);
    await t.session.answer(0);
    assert.equal(t.session.snapshot().autoContinueDeadline, null);
    await t.session.answer(0); await t.session.answer(0);
    assert.equal(t.session.snapshot().autoContinueDeadline, t.now() + 500);
    assert.equal(t.session.snapshot().results.length, question + 1);
    t.elapse(500); t.timers[question].callback(); await flush();
  }
  assert.deepEqual(keys, [0, 0, 1]);
  assert.equal(t.session.snapshot().phase, 'finished');
  t.session.destroy();
});

test('progression gems survive persistence and remain separate from existing Chords gems', async () => {
  const t = trainer({ answerSeconds: 5, reviewSkip: 'correct' });
  await t.session.start(t.settings);
  for (const degree of [0, 4, 0]) await t.session.answer(degree);
  const progress = recordProgress({ 'chords:sun-1': 3 }, t.settings, 'sun-1', t.session.snapshot().results);
  assert.deepEqual(progress, { 'chords:sun-1': 3, 'chord-progressions:sun-1': 2 });
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(progress))), progress);
  assert.deepEqual(normalizeProgress({ 'chords:custom-a': 1, 'chord-progressions:custom-a': 2 }),
    { 'chords:custom-a': 1, 'chord-progressions:custom-a': 2 });
  t.session.destroy();
});

test('stopping during progression playback prevents the rest of the question and its answer timer', async () => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let chords = 0;
  const audio: TrainerAudio = {
    async unlock() {},
    async notes(_midis, _seconds, signal) { chords++; await held; signal.throwIfAborted(); },
    drone() {}, volume() {}, async speak() {}, stop() {},
  };
  const session = new TrainerSession(audio, () => {}, () => 0, async () => {});
  const started = session.start(normalizeSettings({ mode: 'chord-progressions', cadence: false, answerSeconds: 2 }));
  await flush(); session.stop(); release(); await started;
  assert.equal(chords, 1);
  assert.equal(session.snapshot().phase, 'idle');
  assert.equal(session.snapshot().answerDeadline, null);
  session.destroy();
});
