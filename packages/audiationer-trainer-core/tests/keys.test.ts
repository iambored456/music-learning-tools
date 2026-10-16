import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrainerSession, normalizeSettings, type SessionState, type TrainerAudio } from '../src/index.ts';

class AudioMock implements TrainerAudio {
  played: number[][] = [];
  async unlock() {}
  async notes(midis: number[], _seconds: number, signal: AbortSignal) { signal.throwIfAborted(); this.played.push(midis); }
  drone() {} volume() {} async speak() {} stop() {}
}
const instant = async (_ms: number, signal: AbortSignal) => { signal.throwIfAborted(); };

test('all exercises migrate fixed-key saves to random keys with five questions per key by default', () => {
  for (const mode of ['degrees', 'melody', 'chords', 'quality', 'pocket'] as const) {
    const settings = normalizeSettings({ mode, tonic: 9, randomTonic: false });
    assert.equal(settings.randomTonic, true, mode);
    assert.equal(settings.questionsPerKey, 5);
    assert.equal(settings.pocket.questionsPerKey, 5);
    assert.equal(normalizeSettings({ ...settings, questionsPerKey: NaN }).questionsPerKey, 5);
    const configured = normalizeSettings({ ...settings, questionsPerKey: 10 });
    assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(configured))), configured);
  }
});

test('each scored mode holds a key for five submitted answers and always picks a different next key', async () => {
  for (const mode of ['degrees', 'melody', 'chords', 'quality'] as const) {
    const audio = new AudioMock(), states: SessionState[] = [], keys: number[] = [];
    const session = new TrainerSession(audio, state => states.push(state), () => 0, instant);
    await session.start(normalizeSettings({ mode, rounds: 11, degrees: [0], qualities: [0], melodyLength: 2, resolve: false, drone: false }));
    assert.equal(session.snapshot().results.length, 0);
    for (let question = 0; question < 11; question++) {
      const tonic = session.snapshot().tonic;
      keys.push(tonic);
      await session.repeat();
      assert.equal(session.snapshot().tonic, tonic);
      assert.equal(session.snapshot().results.length, question);
      for (let note = 0; note < (mode === 'melody' ? 2 : 1); note++) await session.answer(0);
      assert.equal(session.snapshot().results.length, question + 1);
      if (session.snapshot().phase === 'feedback') {
        await session.answer(0); // Exploring a retained review cannot count another answer.
        assert.equal(session.snapshot().results.length, question + 1);
        await session.next();
      }
    }
    assert.deepEqual(keys, [...Array(5).fill(0), ...Array(5).fill(1), 2], mode);
    assert.equal(session.snapshot().phase, 'finished');
    assert.equal(session.snapshot().results.filter(result => result.correct).length, 11);
    if (mode !== 'quality') {
      const cadences = states.filter((state, index) => state.message === 'Establishing the tonic: 1 · 4 · 5 · 1' && states[index - 1]?.message !== state.message);
      assert.equal(cadences.length, 3);
    }
    session.destroy();
  }
});

test('a custom questions-per-key setting changes key at the configured boundary', async () => {
  const session = new TrainerSession(new AudioMock(), () => {}, () => 0, instant);
  await session.start(normalizeSettings({ mode: 'degrees', degrees: [0], rounds: 4, questionsPerKey: 2, cadence: false, resolve: false, degreeOptions: { reviewSkip: 'all' } }));
  const keys: number[] = [];
  for (let question = 0; question < 4; question++) { keys.push(session.snapshot().tonic); await session.answer(0); }
  assert.deepEqual(keys, [0, 0, 1, 1]);
  session.destroy();
});
