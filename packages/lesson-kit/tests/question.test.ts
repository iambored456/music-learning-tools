import assert from 'node:assert/strict';
import test from 'node:test';
import { createLessonQuestion } from '../src/question';

test('input opens before narration; an early answer cancels and invalidates pending speech', async () => {
  const events: string[] = [];
  let finish!: () => void;
  let isOpen!: () => boolean;
  const question = createLessonQuestion(() => { events.push('cancel'); finish(); });
  const speaking = question.start(async valid => {
    isOpen = valid;
    events.push('speak');
    await new Promise<void>(resolve => { finish = resolve; });
  }, () => events.push('unlock'));
  assert.deepEqual(events, ['unlock', 'speak']);
  question.submit();
  assert.equal(isOpen(), false);
  await speaking;
  question.submit();
  assert.deepEqual(events, ['unlock', 'speak', 'cancel']);
});

test('an answer after narration does not cancel subsequent feedback speech', async () => {
  const question = createLessonQuestion(() => assert.fail('no question speech remains'));
  await question.start(async () => {}, () => {});
  question.submit();
});

test('an old speech completion cannot clear a new question cancellation', async () => {
  let oldFinish!: () => void;
  let newFinish!: () => void;
  let cancelled = 0;
  const question = createLessonQuestion(() => { cancelled++; newFinish(); });
  const old = question.start(() => new Promise<void>(resolve => { oldFinish = resolve; }), () => {});
  const next = question.start(() => new Promise<void>(resolve => { newFinish = resolve; }), () => {});
  oldFinish();
  await old;
  question.submit();
  await next;
  assert.equal(cancelled, 1);
});

test('the waiting expression begins after narration, clears on submission and resumes on retry', async () => {
  const waiting: boolean[] = [];
  let finish!: () => void;
  const question = createLessonQuestion(() => assert.fail('narration already finished'), value => waiting.push(value));
  const speech = question.start(() => new Promise<void>(resolve => { finish = resolve; }), () => {});
  assert.deepEqual(waiting, [false]);
  finish();
  await speech;
  assert.deepEqual(waiting, [false, true]);
  question.submit();
  question.wait();
  question.submit();
  assert.deepEqual(waiting, [false, true, false, true, false]);
});

test('an early answer or replay cannot restore a stale thinking expression', async () => {
  const waiting: boolean[] = [];
  let oldFinish!: () => void;
  let newFinish!: () => void;
  const question = createLessonQuestion(() => {}, value => waiting.push(value));
  const old = question.start(() => new Promise<void>(resolve => { oldFinish = resolve; }), () => {});
  question.submit();
  const next = question.start(() => new Promise<void>(resolve => { newFinish = resolve; }), () => {});
  oldFinish();
  await old;
  assert.ok(waiting.every(value => !value));
  newFinish();
  await next;
  assert.equal(waiting.at(-1), true);
});

test('failed narration never marks a question as narrated', async () => {
  const waiting: boolean[] = [];
  const question = createLessonQuestion(() => {}, value => waiting.push(value));
  await assert.rejects(question.start(async () => { throw new Error('speech failed'); }, () => {}));
  assert.deepEqual(waiting, [false]);
});
