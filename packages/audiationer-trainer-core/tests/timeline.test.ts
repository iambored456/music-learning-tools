import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrainerSession, defaultLessonTiming, lessonTimeline, lessonTiming, normalizeCustomPresets, normalizeLessonTiming,
  normalizeSettings, setLessonTiming, type LessonTiming, type Settings, type TrainerAudio } from '../src/index.ts';

test('old saved timing migrates without coupling the new mode profiles', () => {
  const settings = normalizeSettings({ mode: 'melody', noteGap: 1.2, autoContinueSeconds: 5 });
  assert.equal(lessonTiming(settings).noteSeconds, 0.96);
  assert.equal(lessonTiming(settings).noteGapSeconds, 0.24);
  assert.equal(lessonTiming(settings).tonicizationBpm, 60);
  assert.equal(lessonTiming(settings).correctDelaySeconds, 5);
  setLessonTiming(settings, { noteSeconds: 0.35, tonicizationBpm: 120, autoContinueCorrect: true, reviewSkip: 'none' });
  settings.mode = 'degrees';
  assert.equal(lessonTiming(settings).noteSeconds, 1.2);
  assert.equal(lessonTiming(settings).autoContinueCorrect, false);
  setLessonTiming(settings, { noteSeconds: 1.7, leadInSeconds: 0.9 });
  settings.mode = 'melody';
  assert.equal(lessonTiming(settings).noteSeconds, 0.35);
  assert.equal(lessonTiming(settings).tonicizationBpm, 120);
  const restored = normalizeSettings(JSON.parse(JSON.stringify(settings)));
  assert.deepEqual(restored, settings);
  const saved = normalizeCustomPresets([{ id: 'custom-timeline', name: 'My timing', settings: restored }]);
  assert.deepEqual(saved[0].settings.timings, settings.timings);
  saved[0].settings.timings.melody!.noteSeconds = 2;
  assert.equal(settings.timings.melody!.noteSeconds, 0.35);
});

test('timing validation bounds every numeric control and rejects non-finite values and unknown profiles', () => {
  const fallback = defaultLessonTiming();
  const timing = normalizeLessonTiming({ tonicizationBpm: 999, noteSeconds: -5, thinkSeconds: Infinity,
    leadInSeconds: NaN, nextQuestionGapSeconds: 999, reviewSkip: 'bad', autoContinueCorrect: 'yes' });
  assert.equal(timing.tonicizationBpm, 300);
  assert.equal(timing.noteSeconds, 0.05);
  assert.equal(timing.thinkSeconds, fallback.thinkSeconds);
  assert.equal(timing.leadInSeconds, fallback.leadInSeconds);
  assert.equal(timing.nextQuestionGapSeconds, 15);
  assert.equal(timing.reviewSkip, 'correct');
  assert.equal(timing.autoContinueCorrect, false);
  assert.deepEqual(Object.keys(normalizeSettings({ timings: { unknown: timing } }).timings), []);
});

type Event = { kind: 'note'; seconds: number; midis: number[]; tonicizing: boolean } | { kind: 'gap'; seconds: number };
function setup(patch: Partial<LessonTiming>, extra: Partial<Settings> = {}) {
  let now = 1000;
  const events: Event[] = [];
  const timers: { ms: number; callback: () => void; cancelled: boolean }[] = [];
  let session: TrainerSession;
  const audio: TrainerAudio = {
    async unlock() {},
    async notes(midis, seconds, signal) { signal.throwIfAborted(); events.push({ kind: 'note', midis, seconds, tonicizing: session.snapshot().tonicizing }); now += seconds * 1000; },
    drone() {}, volume() {}, async speak() {}, stop() {},
  };
  session = new TrainerSession(audio, () => {}, () => 0, async (ms, signal) => {
    signal.throwIfAborted(); events.push({ kind: 'gap', seconds: ms / 1000 }); now += ms;
  }, () => now, (callback, ms) => { const timer = { callback, ms, cancelled: false }; timers.push(timer); return () => { timer.cancelled = true; }; });
  const settings = normalizeSettings({ mode: 'melody', cadence: false, resolve: false, degrees: [0, 4], melodyLength: 3,
    rounds: 2, reviewSkip: 'none', ...extra });
  setLessonTiming(settings, patch);
  return { session, audio, settings, events, timers, now: () => now };
}

test('question duration, between-note gap, answer gap and next-question gap reach playback independently', async () => {
  const t = setup({ leadInSeconds: 0.2, noteSeconds: 0.45, noteGapSeconds: 0.1, answerGapSeconds: 0.3,
    feedbackGapSeconds: 0.6, nextQuestionGapSeconds: 0.7 }, { answerSeconds: 2 });
  await t.session.start(t.settings);
  assert.deepEqual(t.events.map(event => [event.kind, event.seconds]), [['gap', 0.2], ['note', 0.45], ['gap', 0.1], ['note', 0.45], ['gap', 0.1], ['note', 0.45], ['gap', 0.3]]);
  assert.equal(t.session.snapshot().answerDeadline, t.now() + 2000);
  t.events.length = 0;
  for (const value of [4, 4, 4]) await t.session.answer(value);
  assert.deepEqual(t.events[0], { kind: 'gap', seconds: 0.6 });
  assert.equal(t.session.snapshot().phase, 'feedback');
  t.events.length = 0;
  await t.session.next();
  assert.deepEqual(t.events.slice(0, 2), [{ kind: 'gap', seconds: 0.7 }, { kind: 'gap', seconds: 0.2 }]);
  assert.equal(t.session.snapshot().results.length, 1);
  t.session.destroy();
});

test('tonicization BPM stays independent of question sound duration and spacing', async () => {
  const t = setup({ tonicizationEnabled: true, tonicizationBpm: 120, noteSeconds: 0.55, noteGapSeconds: 0.25 });
  await t.session.start(t.settings);
  const cadence = t.events.filter(event => event.kind === 'note').filter(event => event.tonicizing);
  assert.equal(cadence.length, 7);
  assert.deepEqual(cadence.map(event => event.seconds), [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.4]);
  const preview = lessonTimeline(t.settings, { correct: false, keyChange: true, freeplayCycle: true })[0];
  assert.equal(preview.beats, 4);
  assert.equal(preview.seconds, 2);
  assert.deepEqual(preview.notes!.map(note => note.seconds), cadence.map(event => event.seconds));
  assert.equal(preview.notes!.reduce((sum, note) => sum + note.seconds + note.gapSeconds, 0), preview.seconds);
  const question = t.events.filter(event => event.kind === 'note').filter(event => !event.tonicizing);
  assert.ok(question.every(event => event.seconds === 0.55));
  assert.deepEqual(cadence.map(event => event.midis[0]), [60, 64, 67, 65, 62, 59, 60]);
  t.session.destroy();
});

test('mode-specific auto-continue supports arbitrary delay values and starts after feedback', async () => {
  const t = setup({ autoContinueCorrect: true, correctDelaySeconds: 0.65, feedbackGapSeconds: 0.35,
    feedbackNoteSeconds: 0.8, feedbackNoteGapSeconds: 0.2 }, { mode: 'degrees', degrees: [4], resolve: true });
  assert.equal(t.settings.autoContinueCorrect, false); // The saved mode profile supplies the actual choice.
  await t.session.start(t.settings);
  await t.session.answer(4);
  assert.equal(t.session.snapshot().autoContinueDeadline, t.now() + 650);
  assert.equal(t.timers[0].ms, 650);
  assert.deepEqual(t.events.slice(-3).map(event => [event.kind, event.seconds]), [['gap', 0.35], ['note', 0.8], ['gap', 0.2]]);
  t.session.stop();
  assert.equal(t.timers[0].cancelled, true);
});

test('timeline displays fixed-order timing controls, conditional tonicization and difficulty/manual waits', () => {
  const settings = normalizeSettings({ mode: 'melody', degrees: [0, 4], melodyLength: 3, reviewSkip: 'none' });
  const options = { correct: false, keyChange: true, freeplayCycle: true };
  const stages = lessonTimeline(settings, options);
  assert.equal(stages[0].field, 'tonicizationBpm');
  assert.equal(stages.filter(stage => stage.field === 'noteSeconds').length, 6); // Question and wrong-answer replay.
  assert.equal(stages.find(stage => stage.name === 'Your answer')!.seconds, null);
  assert.equal(stages.find(stage => stage.name === 'Answer review')!.seconds, null);
  assert.equal(stages.at(-1)!.field, 'nextQuestionGapSeconds');
  assert.ok(!lessonTimeline(settings, { ...options, keyChange: false }).some(stage => stage.field === 'tonicizationBpm'));
  const timed = lessonTimeline(normalizeSettings({ ...settings, answerSeconds: 5 }), options).find(stage => stage.name === 'Your answer')!;
  assert.equal(timed.seconds, 5);
  assert.equal(timed.field, undefined);
  setLessonTiming(settings, { reviewSkip: 'all' });
  assert.ok(!lessonTimeline(settings, options).some(stage => stage.name === 'Answer review'));
});

test('Pocket timeline and playback honor independent repeat, think, feedback, replay and next gaps', async () => {
  let session: TrainerSession;
  const pauses: number[] = [], notes: number[] = [];
  const audio: TrainerAudio = { async unlock() {}, async notes(_midis, seconds, signal) { signal.throwIfAborted(); notes.push(seconds); },
    drone() {}, volume() {}, async speak() {}, stop() {} };
  let feedback = false;
  session = new TrainerSession(audio, state => {
    if (state.phase === 'feedback') feedback = true;
    if (feedback && state.phase === 'listening') session.stop();
  }, () => 0, async (ms, signal) => { signal.throwIfAborted(); pauses.push(ms / 1000); });
  const settings = normalizeSettings({ mode: 'pocket', cadence: false, degrees: [0], pocket: { exercise: 'melody', melodyLength: 2, repeats: 2, replays: 1 } });
  setLessonTiming(settings, { leadInSeconds: 0.05, noteSeconds: 0.2, noteGapSeconds: 0.1, answerGapSeconds: 0.13,
    repeatGapSeconds: 0.17, thinkSeconds: 0.23, feedbackGapSeconds: 0.31, replayGapSeconds: 0.29, nextQuestionGapSeconds: 0.41 });
  await session.start(settings);
  assert.deepEqual(notes, Array(6).fill(0.2));
  assert.deepEqual(pauses, [0.05, 0.1, 0.13, 0.17, 0.1, 0.13, 0.23, 0.31, 0.29, 0.1, 0.13, 0.41]);
  const stages = lessonTimeline(settings, { correct: false, keyChange: true, freeplayCycle: true });
  for (const field of ['repeatGapSeconds', 'thinkSeconds', 'feedbackGapSeconds', 'replayGapSeconds', 'nextQuestionGapSeconds']) assert.ok(stages.some(stage => stage.field === field));
  session.destroy();
});

test('Pocket preview uses the same spoken chord words and tonicization conditions as playback', () => {
  const settings = normalizeSettings({ mode: 'pocket', degrees: [4], pocket: { exercise: 'chords' } });
  const options = { correct: false, keyChange: true, freeplayCycle: true };
  const stages = lessonTimeline(settings, options);
  assert.equal(stages.find(stage => stage.speech)!.speech, 'three minor');
  settings.pocket.exercise = 'quality';
  assert.ok(lessonTimeline(settings, options).some(stage => stage.field === 'tonicizationBpm'));
});
