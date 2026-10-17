import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrainerSession, applyPreset, challengePresets, normalizeSettings, pathPresets, questionLength, type TrainerAudio } from '../src/index.ts';

test('every Degrees and Melody level enables octaves 3–5 even when the previous setting was fixed', () => {
  for (const mode of ['degrees', 'melody'] as const) {
    const previous = normalizeSettings({ mode, randomOctave: false, octave: 4 });
    for (const preset of [...pathPresets(mode), ...challengePresets(mode)]) {
      const settings = applyPreset(previous, preset);
      assert.equal(settings.randomOctave, true, `${mode}/${preset.id}`);
      assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(settings))), settings);
    }
    assert.equal(previous.randomOctave, false);
  }
  for (const mode of ['chords', 'chord-progressions', 'quality', 'pocket'] as const) {
    const previous = normalizeSettings({ mode, randomOctave: false });
    assert.equal(applyPreset(previous, pathPresets(mode)[0]).randomOctave, false, mode);
  }
});

test('questions choose all three registers while repeats, melody notes and review stay in the chosen octave', async () => {
  for (const mode of ['degrees', 'melody'] as const) {
    let random = 0;
    const played: number[][] = [];
    const audio: TrainerAudio = {
      async unlock() {},
      async notes(midis, _seconds, signal) { signal.throwIfAborted(); played.push(midis); },
      drone() {}, volume() {}, async speak() {}, stop() {},
    };
    const session = new TrainerSession(audio, () => {}, () => random, async (_ms, signal) => { signal.throwIfAborted(); });
    const settings = applyPreset(normalizeSettings({ mode, randomOctave: false, degrees: [0],
      melodyLength: 3, rounds: 3, cadence: false, resolve: false, reviewSkip: 'none' }),
      { id: 'custom-octaves', name: 'Octaves', patch: { degrees: [0] } });
    await session.start(settings);
    for (const [index, octave] of [3, 4, 5].entries()) {
      const question = Array.from({ length: questionLength(settings) }, () => [12 * (octave + 1)]);
      assert.equal(session.snapshot().octave, octave);
      assert.deepEqual(played.slice(-question.length), question);
      random = [0.5, 0.99, 0][index];
      played.length = 0;
      await session.repeat();
      assert.deepEqual(played, question);
      assert.equal(session.snapshot().octave, octave);
      for (let answer = 0; answer < questionLength(settings); answer++) await session.answer(0);
      assert.equal(session.snapshot().results[index].correct, true);
      assert.equal(session.snapshot().results[index].octave, octave);
      played.length = 0;
      if (mode === 'melody') {
        await session.replaySequence('input');
        assert.deepEqual(played, question);
        played.length = 0;
      }
      await session.answer(0);
      assert.deepEqual(played, question.slice(0, 1));
      await session.next();
    }
    assert.equal(session.snapshot().phase, 'finished');
    session.destroy();
  }
});

test('all scored modes retain ten individual question contexts through key changes and review octave changes', async () => {
  for (const mode of ['degrees', 'melody', 'chords', 'chord-progressions', 'quality'] as const) {
    let random = 0, now = 1000;
    const played: number[][] = [];
    const audio: TrainerAudio = {
      async unlock() {},
      async notes(midis, _seconds, signal) { signal.throwIfAborted(); played.push(midis); },
      drone() {}, volume() {}, async speak() {}, stop() {},
    };
    const session = new TrainerSession(audio, () => {}, () => random, async (_ms, signal) => { signal.throwIfAborted(); }, () => now);
    const settings = normalizeSettings({ mode, degrees: [0], qualities: [0], melodyLength: 2, progressionLength: 2,
      randomOctave: true, questionsPerKey: 1, rounds: 10, cadence: false, resolve: false, reviewSkip: 'none' });
    const contexts: { tonic: number; octave: number; seconds: number }[] = [];
    await session.start(settings);
    for (let index = 0; index < 10; index++) {
      const { tonic, octave } = session.snapshot();
      assert.equal(played.at(-1)![0], 12 * (octave + 1) + tonic);
      now += (index + 1) * 100;
      for (let answer = 0; answer < questionLength(settings); answer++) await session.answer(0);
      contexts.push({ tonic, octave, seconds: (index + 1) / 10 });
      if (mode === 'melody' || mode === 'chord-progressions') {
        session.setFeedbackOctave(6);
        assert.equal(session.snapshot().octave, 6);
        await session.replaySequence('revealed');
      }
      random = [0, 0.5, 0.99][(index + 1) % 3];
      await session.next();
    }
    const results = session.snapshot().results;
    assert.equal(session.snapshot().phase, 'finished');
    assert.equal(results.length, 10);
    assert.deepEqual(results.map(({ tonic, octave, seconds }) => ({ tonic, octave, seconds })), contexts);
    assert.equal(new Set(results.map(result => result.expected)).size, 1); // Repeated answers keep separate rows.
    assert.equal(new Set(results.map(result => result.octave)).size, 3);
    assert.ok(new Set(results.map(result => result.tonic)).size > 1);
    session.destroy();
  }
});
