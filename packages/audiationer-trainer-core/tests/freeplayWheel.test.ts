import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wheelPitchClasses } from '@mlt/compass-core';
import { freeplayDragOctave, freeplayWheelPosition } from '../src/index.ts';

test('drag hit testing follows every visible sector in both wheel orders', () => {
  for (const order of ['chromatic', 'fifths'] as const) {
    wheelPitchClasses(order).forEach((degree, index) => {
      const angle = index * Math.PI / 6 - Math.PI / 2;
      assert.deepEqual(freeplayWheelPosition(204 * Math.cos(angle), 204 * Math.sin(angle), order), { degree, index });
    });
  }
});

test('the centre, outside the ring and invalid coordinates never select a degree', () => {
  for (const [x, y] of [[0, 0], [139, 0], [234, 0], [NaN, 100], [0, Infinity]]) assert.equal(freeplayWheelPosition(x, y, 'chromatic'), null);
  assert.equal(freeplayWheelPosition(0, -140, 'chromatic')?.degree, 0);
  assert.equal(freeplayWheelPosition(0, -233, 'chromatic')?.degree, 0);
});

test('clockwise 7-to-1 raises the octave, reversing lowers it, and ordinary movement stays in register', () => {
  assert.equal(freeplayDragOctave(11, 0, 4), 5);
  assert.equal(freeplayDragOctave(0, 11, 5), 4);
  assert.equal(freeplayDragOctave(10, 1, 4), 5); // A fast movement can skip a sector.
  assert.equal(freeplayDragOctave(1, 10, 4), 3);
  assert.equal(freeplayDragOctave(2, 5, 4), 4);
  assert.equal(freeplayDragOctave(5, 2, 4), 4);
});

test('octave carries respect the existing 3–6 range and reset after leaving the ring', () => {
  assert.equal(freeplayDragOctave(11, 0, 6), 6);
  assert.equal(freeplayDragOctave(0, 11, 3), 3);
  assert.equal(freeplayDragOctave(null, 0, 4), 4);
  assert.equal(freeplayDragOctave(null, 11, 4), 4);
});
