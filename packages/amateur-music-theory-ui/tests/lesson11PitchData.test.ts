import assert from 'node:assert/strict';
import test from 'node:test';
import { fullRowData } from '@mlt/pitch-data';
import { lesson11PitchRange, lowIntroToneNotes, highIntroToneNotes, comparisonPairs } from '../src/lesson11PitchData';

const row = (tone: string) => {
  const index = fullRowData.findIndex(item => item.toneNote === tone);
  assert.notEqual(index, -1, `Unknown pitch: ${tone}`);
  return index;
};

test('all high/low and comparison examples fit the shared A3–A5 viewport', () => {
  const high = row(lesson11PitchRange.high);
  const low = row(lesson11PitchRange.low);
  const midpoint = (high + low) / 2;
  for (const tone of [...lowIntroToneNotes, ...highIntroToneNotes, ...comparisonPairs.flatMap(pair => [...pair.toneNotes])]) {
    assert.ok(row(tone) >= high && row(tone) <= low, `${tone} must be visible`);
  }
  assert.ok(lowIntroToneNotes.every(tone => row(tone) > midpoint));
  assert.ok(highIntroToneNotes.every(tone => row(tone) < midpoint));
});

test('comparison revision preserves correct answer positions and gives every pair a different lower pitch', () => {
  const answers = comparisonPairs.map(pair => {
    const [first, second] = pair.toneNotes.map(row);
    assert.notEqual(first, second);
    return (pair.mode === 'higher' ? first < second : first > second) ? 0 : 1;
  });
  assert.deepEqual(answers, [0, 0, 1, 1, 0, 0, 1]);
  const lowerRows = comparisonPairs.map(pair => Math.max(...pair.toneNotes.map(row)));
  assert.equal(new Set(lowerRows).size, comparisonPairs.length);
});
