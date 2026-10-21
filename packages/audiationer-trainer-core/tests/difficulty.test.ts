import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrainerSession, difficultyFor, difficultyRank, earnedRank, gemAward, levelAccess, normalizeProgress, normalizeSettings, questionOctaves, recordProgress, selectExercise, setDifficulty, type Result, type TrainerAudio } from '../src/index.ts';

const results = (correct: number, total = 10): Result[] => Array.from({ length: total }, (_, index) => ({
  expected: '1', received: index < correct ? '1' : '2', tonic: 0, octave: 4, correct: index < correct, seconds: 1,
}));

test('all nine octave/time combinations produce the requested rank and accuracy threshold', () => {
  for (const [answerSeconds, ranks] of [[0, [1, 2, 2]], [5, [1, 2, 3]], [2, [2, 3, 4]]] as const) {
    for (const octaveCount of [1, 2, 3] as const) {
      const settings = normalizeSettings({ mode: 'degrees', octaveCount, answerSeconds });
      const rank = ranks[octaveCount - 1];
      assert.equal(difficultyRank(settings), rank);
      assert.equal(earnedRank(settings, results(7)), 0);
      assert.equal(earnedRank(settings, results(8)), Math.min(rank, 3));
      assert.equal(earnedRank(settings, results(9)), Math.min(rank, 3));
      assert.equal(earnedRank(settings, results(10)), rank);
      assert.equal(earnedRank(settings, results(9, 9)), 0, 'An incomplete session earns nothing');
    }
  }
  assert.equal(gemAward(4).count, 3);
  assert.equal(gemAward(4).name, 'Gold Master');
  assert.equal(gemAward(4).colour, '#ffd43b');
});

test('gold persists, unlocks progress, and is never replaced by a lower award', () => {
  const settings = normalizeSettings({ mode: 'quality', octaveCount: 3, answerSeconds: 2 });
  const earned = recordProgress({}, settings, 'triads-1', results(10));
  assert.deepEqual(earned, { 'quality:triads-1': 4 });
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(earned))), earned);
  assert.equal(levelAccess('quality', 'triads-2', earned).unlocked, true);
  assert.deepEqual(recordProgress(earned, settings, 'triads-1', results(8)), earned);
  assert.deepEqual(recordProgress({}, settings, 'triads-1', results(9)), { 'quality:triads-1': 3 });
  assert.deepEqual(recordProgress({}, { ...settings, mode: 'pocket' }, 'triads-1', results(10)), {});
});

test('paired exercises share difficulty across selection and reload while other pages remain independent', () => {
  for (const [first, second] of [['degrees', 'melody'], ['chords', 'chord-progressions']] as const) {
    let settings = normalizeSettings({ mode: first });
    assert.deepEqual(difficultyFor(settings), { octaveCount: 1, answerSeconds: 0 });
    setDifficulty(settings, { octaveCount: 3, answerSeconds: 2 });
    assert.deepEqual(difficultyFor(settings, second), { octaveCount: 3, answerSeconds: 2 });
    selectExercise(settings, second);
    assert.equal(settings.mode, second, 'Sharing difficulty must still change the exercise');
    assert.deepEqual(difficultyFor(settings), { octaveCount: 3, answerSeconds: 2 });
    setDifficulty(settings, { octaveCount: 2, answerSeconds: 5 });
    selectExercise(settings, 'quality');
    assert.deepEqual(difficultyFor(settings), { octaveCount: 1, answerSeconds: 0 });
    settings = normalizeSettings(JSON.parse(JSON.stringify(settings)));
    selectExercise(settings, first);
    assert.deepEqual(difficultyFor(settings), { octaveCount: 2, answerSeconds: 5 });
    selectExercise(settings, 'pocket', first);
    assert.deepEqual(difficultyFor(settings), { octaveCount: 1, answerSeconds: 0 });
    setDifficulty(settings, { octaveCount: 3 });
    selectExercise(settings, 'pocket', second);
    assert.equal(settings.pocket.exercise, second);
    assert.equal(settings.octaveCount, 3);
    selectExercise(settings, 'pocket', 'quality');
    assert.equal(settings.octaveCount, 1);
    settings = normalizeSettings(JSON.parse(JSON.stringify(settings)));
    selectExercise(settings, 'pocket', first);
    assert.equal(settings.octaveCount, 3);
    selectExercise(settings, second);
    assert.deepEqual(difficultyFor(settings), { octaveCount: 2, answerSeconds: 5 });
  }
});

test('register selection stays inside the chosen range for every scored exercise', async () => {
  for (const mode of ['degrees', 'melody', 'chords', 'chord-progressions', 'quality'] as const) {
    for (const octaveCount of [1, 2, 3] as const) {
      for (const random of [0, 0.5, 0.99]) {
        const played: number[][] = [];
        const audio: TrainerAudio = {
          async unlock() {}, async notes(midis) { played.push(midis); }, drone() {}, volume() {}, async speak() {}, stop() {},
        };
        const session = new TrainerSession(audio, () => {}, () => random, async () => {});
        const settings = normalizeSettings({ mode, octaveCount, cadence: false, resolve: false, degrees: [0], qualities: [0] });
        await session.start(settings);
        const octaves = questionOctaves(settings);
        assert.ok(octaves.includes(session.snapshot().octave));
        for (const chord of played) assert.ok(octaves.includes(Math.floor(chord[0] / 12) - 1), `${mode}/${octaveCount}`);
        session.destroy();
      }
    }
  }
});

test('chord progressions jump registers and retain each chord register on repeat and answer review', async () => {
  let random = 0;
  const played: number[][] = [];
  const audio: TrainerAudio = {
    async unlock() {}, async notes(midis) { played.push(midis); }, drone() {}, volume() {}, async speak() {}, stop() {},
  };
  const session = new TrainerSession(audio, () => {}, () => { random = random === 0 ? 0.99 : 0; return random; }, async () => {});
  await session.start(normalizeSettings({ mode: 'chord-progressions', octaveCount: 3, degrees: [0],
    cadence: false, resolve: false, reviewSkip: 'none', progressionLength: 3 }));
  const original = played.map(chord => [...chord]);
  assert.equal(new Set(original.map(chord => chord[0])).size, 2, 'A progression can change octaves between chords');
  played.length = 0;
  await session.repeat();
  assert.deepEqual(played, original);
  for (let index = 0; index < 3; index++) await session.answer(0);
  const saved = session.snapshot().results[0];
  assert.deepEqual(saved.octaves, original.map(chord => Math.floor((chord[0] - saved.tonic) / 12) - 1));
  played.length = 0;
  await session.replaySequence('revealed');
  assert.deepEqual(played, original);
  session.destroy();
});

test('Pocket progressions retain register jumps in repeats, spoken-answer notes, and replays', async () => {
  let random = 0, session: TrainerSession;
  const played: number[][] = [];
  const audio: TrainerAudio = {
    async unlock() {}, async notes(midis) { played.push(midis); }, drone() {}, volume() {}, async speak() {}, stop() {},
  };
  session = new TrainerSession(audio, state => {
    if (state.round === 1 && state.phase === 'listening' && played.length === 12) session.stop();
  }, () => { random = random === 0 ? 0.99 : 0; return random; }, async (_ms, signal) => { signal.throwIfAborted(); });
  await session.start(normalizeSettings({ mode: 'pocket', octaveCount: 3, cadence: false, degrees: [0],
    pocket: { exercise: 'chord-progressions', progressionLength: 3, repeats: 2, notesWithAnswer: true, replays: 1 } }));
  assert.equal(played.length, 12);
  assert.equal(new Set(played.slice(0, 3).map(chord => chord[0])).size, 2);
  for (let offset = 3; offset < 12; offset += 3) assert.deepEqual(played.slice(offset, offset + 3), played.slice(0, 3));
  assert.equal(session.snapshot().results.length, 0);
  session.destroy();
});
