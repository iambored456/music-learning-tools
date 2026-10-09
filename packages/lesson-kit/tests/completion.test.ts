import assert from 'node:assert/strict';
import test from 'node:test';
import { completeLessonExercise, lessonPacing } from '../src/index';

test('completion waits for playback to finish before starting the shared pause', async () => {
  const events: string[] = [];
  let finishPlayback!: () => void;
  const playback = new Promise<void>(resolve => { finishPlayback = resolve; });
  const completed = completeLessonExercise({
    isCurrent: () => true,
    replay: async () => { events.push('play'); await playback; events.push('ended'); },
    wait: async ms => { events.push(`pause:${ms}`); return true; },
  });
  assert.deepEqual(events, ['play']);
  finishPlayback();
  assert.equal(await completed, true);
  assert.deepEqual(events, ['play', 'ended', `pause:${lessonPacing.afterExerciseMs}`]);
});

test('restarting during playback prevents the old completion pause and advance', async () => {
  let current = true;
  assert.equal(await completeLessonExercise({
    isCurrent: () => current,
    replay: async () => { current = false; },
    wait: async () => { assert.fail('stale exercise must not wait'); },
  }), false);
});

test('cancelling the completion pause prevents advance even without replay', async () => {
  assert.equal(await completeLessonExercise({
    isCurrent: () => true,
    wait: async () => false,
  }), false);
});

test('restarting during the completion pause prevents advance', async () => {
  let current = true;
  assert.equal(await completeLessonExercise({
    isCurrent: () => current,
    wait: async () => { current = false; return true; },
  }), false);
});
