import assert from 'node:assert/strict';
import test from 'node:test';
import { createLessonProgress, lessonProgressKey } from '../src/lessonProgress';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

test('completion persists across instances and repeated completion stays unique', () => {
  const storage = createStorage();
  const progress = createLessonProgress(() => storage);
  assert.deepEqual(progress.read(), []);
  progress.complete('1.1');
  progress.complete('1.1');
  progress.complete('1.2');
  assert.deepEqual(createLessonProgress(() => storage).read(), ['1.1', '1.2']);
  const copy = progress.read();
  copy.push('1.3');
  assert.deepEqual(progress.read(), ['1.1', '1.2']);
});

test('clear removes only Amateur Music Theory completion history', () => {
  const storage = createStorage();
  storage.setItem('other-tool', 'preserve');
  const progress = createLessonProgress(() => storage);
  progress.complete('1.4');
  progress.clear();
  assert.deepEqual(progress.read(), []);
  assert.deepEqual(createLessonProgress(() => storage).read(), []);
  assert.equal(storage.getItem(lessonProgressKey), null);
  assert.equal(storage.getItem('other-tool'), 'preserve');
});

test('malformed saved progress does not prevent completion or clearing', () => {
  const storage = createStorage();
  storage.setItem(lessonProgressKey, '{broken');
  const progress = createLessonProgress(() => storage);
  assert.deepEqual(progress.read(), []);
  progress.complete('1.2');
  assert.deepEqual(progress.read(), ['1.2']);
  progress.clear();
  assert.deepEqual(progress.read(), []);
});

test('unavailable storage retains session progress and allows clearing', () => {
  const progress = createLessonProgress(() => { throw new Error('blocked'); });
  progress.complete('1.1');
  progress.complete('1.2');
  assert.deepEqual(progress.read(), ['1.1', '1.2']);
  progress.clear();
  assert.deepEqual(progress.read(), []);
});

test('failed writes do not overwrite new session completion with stale storage', () => {
  const progress = createLessonProgress(() => ({
    getItem: () => '["1.1"]',
    setItem: () => { throw new Error('quota'); },
    removeItem: () => { throw new Error('blocked'); },
  }));
  progress.complete('1.2');
  assert.deepEqual(progress.read(), ['1.1', '1.2']);
  progress.clear();
  assert.deepEqual(progress.read(), []);
});

test('saved values are filtered and external changes are read', () => {
  const storage = createStorage();
  const progress = createLessonProgress(() => storage);
  storage.setItem(lessonProgressKey, '["1.1", null, 5, "1.1", "1.3"]');
  assert.deepEqual(progress.read(), ['1.1', '1.3']);
  storage.removeItem(lessonProgressKey);
  assert.deepEqual(progress.read(), []);
});
