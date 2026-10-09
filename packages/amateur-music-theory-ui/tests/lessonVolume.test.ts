import assert from 'node:assert/strict';
import test from 'node:test';
import { createLessonVolume, lessonVolumeKey } from '../src/lessonVolume';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test('every new lesson and page load restores the same volume, including mute', () => {
  const saved = storage();
  const preference = createLessonVolume(() => saved);
  assert.equal(preference.read(), 72);
  for (const value of [35, 0, 100]) {
    preference.set(value);
    assert.equal(preference.read(), value);
    assert.equal(createLessonVolume(() => saved).read(), value);
  }
});

test('saved and selected values stay within the slider range and malformed values retain the default', () => {
  const saved = storage();
  for (const value of ['broken', '', 'NaN', 'Infinity']) {
    saved.setItem(lessonVolumeKey, value);
    assert.equal(createLessonVolume(() => saved).read(), 72);
  }
  const preference = createLessonVolume(() => saved);
  preference.set(120); assert.equal(preference.read(), 100);
  preference.set(-1); assert.equal(preference.read(), 0);
  preference.set(NaN); assert.equal(preference.read(), 0);
});

test('blocked storage still shares volume for the session', () => {
  const preference = createLessonVolume(() => { throw new Error('blocked'); });
  assert.equal(preference.read(), 72);
  preference.set(18); assert.equal(preference.read(), 18);
});

test('failed persistence does not overwrite the new volume with an old saved value', () => {
  const preference = createLessonVolume(() => ({
    getItem: () => '72', setItem: () => { throw new Error('quota'); },
  }));
  preference.set(0);
  assert.equal(preference.read(), 0);
});
