import assert from 'node:assert/strict';
import test from 'node:test';
import { squareGridViewDurationMs } from '../src/lib/components/pitchGridAppearance';

test('1:1 keeps a quarter note as wide as its height across viewport sizes and tempos', () => {
  for (const [width, height, tempo] of [[700, 28, 87], [320, 20, 120], [1200, 40, 60]]) {
    const duration = squareGridViewDurationMs(width!, height!, tempo!);
    const pixelsPerSecond = width! / duration * 1000;
    assert.ok(Math.abs(pixelsPerSecond * 60 / tempo! - height!) < 0.00001);
  }
});
