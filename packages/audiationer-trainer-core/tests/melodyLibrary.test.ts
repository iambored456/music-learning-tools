import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EARLY_MELODY_DEGREES, MAX_MELODY_LEAP, MelodySampler, enumerateMelodies, melodyContour, melodySpan } from '../src/melodyLibrary.ts';
import { TrainerSession, normalizeSettings, pathPresets, challengePresets, type Settings, type TrainerAudio } from '../src/index.ts';

function seeded(seed: number) {
  return () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 2 ** 32);
}

test('early libraries enumerate every permitted pitch combination exactly once, including the requested example', () => {
  for (const degrees of EARLY_MELODY_DEGREES) {
    for (const octaves of [[3, 4], [3, 4, 5]]) {
      const pool = octaves.flatMap(octave => degrees.map(degree => octave * 12 + degree));
      const expected = pool.flatMap(a => pool.flatMap(b => pool
        .filter(c => Math.abs(b - a) <= 12 && Math.abs(c - b) <= 12).map(c => [a, b, c])));
      const actual = enumerateMelodies(degrees, octaves);
      assert.deepEqual(actual, expected);
      assert.equal(new Set(actual.map(notes => notes.join(','))).size, actual.length);
      assert.ok(actual.some(notes => notes.join(',') === '52,48,40')); // E4 C4 E3, before adding MIDI's +12.
      assert.ok(actual.some(notes => notes[0] === notes[1]));
      assert.ok(actual.some(notes => Math.abs(notes[1] - notes[0]) === 12));
    }
  }
});

test('libraries balance narrow/wide spans and contours, exhausting unused patterns before recycling', () => {
  for (const degrees of EARLY_MELODY_DEGREES) {
    const sampler = new MelodySampler(), random = seeded(19);
    const library = enumerateMelodies(degrees, [3, 4]);
    const heard = new Set<string>();
    const first: number[][] = [];
    for (let i = 0; i < library.length; i++) {
      const notes = sampler.next(degrees, [3, 4], 3, 0, random);
      const key = notes.join(',');
      assert.ok(!heard.has(key), `${degrees}: repeated ${key} before library exhaustion`);
      heard.add(key);
      if (i < 6) first.push(notes);
    }
    assert.deepEqual(first.map(notes => melodySpan(notes) >= 12), [true, false, true, false, true, false]);
    assert.deepEqual(first.map(melodyContour), ['ascending', 'ascending', 'descending', 'descending', 'turning', 'turning']);
    assert.ok(heard.has(sampler.next(degrees, [3, 4], 3, 0, random).join(',')));
  }
});

test('all pitch vocabularies and longer questions use allowed pitches with no adjacent leap over an octave', () => {
  const random = seeded(31);
  for (const preset of [...pathPresets('melody'), ...challengePresets('melody')]) {
    for (const length of [2, 3, 5, 8]) {
      const degrees = preset.patch.degrees!;
      for (const octaves of [[3, 4], [3, 4, 5]]) {
        const sampler = new MelodySampler();
        const heard = new Set<string>();
        for (let i = 0; i < 6; i++) {
          const notes = sampler.next(degrees, octaves, length, 0, random);
          assert.equal(notes.length, length);
          assert.ok(notes.every(pitch => degrees.includes(pitch % 12) && octaves.includes(Math.floor(pitch / 12))), preset.id);
          assert.ok(notes.slice(1).every((pitch, index) => Math.abs(pitch - notes[index]) <= MAX_MELODY_LEAP), preset.id);
          assert.ok(!heard.has(notes.join(',')));
          assert.equal(melodySpan(notes) >= 12, i % 2 === 0);
          heard.add(notes.join(','));
        }
        assert.ok(heard.size > 1);
      }
    }
  }
});

test('generated melodies avoid repeats with a constant RNG, span all three registers, and recycle finite pools', () => {
  const sampler = new MelodySampler(), heard = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const notes = sampler.next([0, 2, 4, 5, 7, 9, 11], [3, 4, 5], 8, 0, () => 0);
    assert.ok(!heard.has(notes.join(',')));
    heard.add(notes.join(','));
    assert.equal(melodySpan(notes) >= 12, i % 2 === 0);
  }
  const bank = enumerateMelodies([0, 4], [3, 4, 5]);
  assert.ok(bank.some(notes => melodySpan(notes) === 24));
  const small = new MelodySampler();
  const cycle = Array.from({ length: 5 }, () => small.next([0], [3, 4], 2, 0, () => 0));
  assert.equal(new Set(cycle.slice(0, 4).map(notes => notes.join(','))).size, 4);
  assert.ok(cycle.slice(0, 4).some(notes => notes.join(',') === cycle[4].join(',')));
});

function trainer(extra: Partial<Settings> = {}, random = seeded(5)) {
  const played: number[][] = [];
  const audio: TrainerAudio = {
    async unlock() {}, async notes(midis, _seconds, signal) { signal.throwIfAborted(); played.push(midis); },
    drone() {}, volume() {}, async speak() {}, stop() {},
  };
  const session = new TrainerSession(audio, () => {}, random, async (_ms, signal) => { signal.throwIfAborted(); });
  const settings = normalizeSettings({ mode: 'melody', degrees: [0, 4], octaveCount: 2, melodyLength: 3,
    rounds: 100, questionsPerKey: 100, cadence: false, resolve: false, reviewSkip: 'none', ...extra });
  return { session, settings, played };
}

test('session playback, repeats, grading, comparison, transposition and results preserve per-note registers', async () => {
  const t = trainer();
  await t.session.start(t.settings);
  const original = t.played.slice(), state = t.session.snapshot();
  const degrees = original.map(notes => (notes[0] - state.tonic) % 12);
  const registers = original.map(notes => Math.floor((notes[0] - state.tonic) / 12) - 1);
  assert.ok(new Set(registers).size > 1);
  t.played.length = 0;
  await t.session.repeat();
  assert.deepEqual(t.played, original);
  for (const degree of degrees) await t.session.answer(degree);
  assert.equal(t.session.snapshot().results[0].correct, true);
  assert.deepEqual(t.session.snapshot().results[0].octaves, registers);
  for (const source of ['input', 'revealed'] as const) {
    t.played.length = 0;
    await t.session.replaySequence(source);
    assert.deepEqual(t.played, original);
  }
  t.session.setFeedbackOctave(state.octave + 1);
  t.played.length = 0;
  await t.session.replaySequence('revealed');
  assert.deepEqual(t.played, original.map(notes => notes.map(note => note + 12)));
  assert.deepEqual(t.session.snapshot().results[0].octaves, registers);
  const copy = t.session.snapshot(); copy.results[0].octaves![0] = 99;
  assert.deepEqual(t.session.snapshot().results[0].octaves, registers);
  t.played.length = 0;
  await t.session.next();
  assert.notDeepEqual(t.played, original);
  t.session.destroy();
});

test('all twelve keys transpose the same pattern correctly, and restarting clears used-pattern history', async () => {
  let reference: number[][] | undefined;
  for (let tonic = 0; tonic < 12; tonic++) {
    let first = true;
    const t = trainer({}, () => first ? (first = false, (tonic + 0.01) / 12) : 0);
    await t.session.start(t.settings);
    assert.equal(t.session.snapshot().tonic, tonic);
    const relative = t.played.map(notes => notes.map(note => note - tonic));
    reference ??= relative;
    assert.deepEqual(relative, reference);
    t.session.destroy();
  }
  const t = trainer({}, () => 0);
  await t.session.start(t.settings);
  const original = t.played.slice();
  for (const pitch of original.flat()) await t.session.answer(pitch % 12);
  t.played.length = 0;
  await t.session.next();
  assert.notDeepEqual(t.played, original);
  t.played.length = 0;
  await t.session.start(t.settings);
  assert.deepEqual(t.played, original);
  t.session.destroy();
});

test('correct-answer resolutions use the last melody note register rather than the question anchor', async () => {
  let first = true;
  const t = trainer({ resolve: true }, () => first ? (first = false, 0) : 0.99);
  await t.session.start(t.settings);
  let resolvedInDifferentRegister = false;
  for (let i = 0; i < 3; i++) {
    const question = t.played.slice(-3).flat(), state = t.session.snapshot();
    const degrees = question.map(pitch => (pitch - state.tonic) % 12);
    const last = question.at(-1)!, degree = degrees.at(-1)!;
    t.played.length = 0;
    for (const answer of degrees) await t.session.answer(answer);
    if (degree === 4) {
      assert.deepEqual(t.played, [[last - 4]]);
      resolvedInDifferentRegister ||= Math.floor((last - state.tonic) / 12) - 1 !== state.octave;
    }
    t.played.length = 0;
    await t.session.next();
  }
  assert.ok(resolvedInDifferentRegister);
  t.session.destroy();
});

test('the exact E4 C4 E3 melody is playable and incorrect review keeps its octaves', async () => {
  const t = trainer({}, () => 0);
  await t.session.start(t.settings);
  const heard = new Set<string>();
  let found = false;
  for (let i = 0; i < enumerateMelodies([0, 4], [3, 4]).length; i++) {
    const question = t.played.slice(-3);
    const key = question.flat().join(',');
    assert.ok(!heard.has(key)); heard.add(key);
    if (key === '64,60,52') {
      found = true;
      t.played.length = 0;
      for (const degree of [0, 0, 0]) await t.session.answer(degree);
      assert.equal(t.session.snapshot().results.at(-1)!.correct, false);
      assert.deepEqual(t.played, [[64], [60], [52]]);
      assert.deepEqual(t.session.snapshot().results.at(-1)!.octaves, [4, 4, 3]);
      break;
    }
    for (const pitch of question.flat()) await t.session.answer(pitch % 12);
    await t.session.next();
  }
  assert.ok(found);
  t.session.destroy();
});

test('Pocket Melody keeps registers in its repeated question, spoken accompaniment and replay', async () => {
  const played: number[][] = [];
  let session: TrainerSession;
  const audio: TrainerAudio = {
    async unlock() {}, async notes(midis, _seconds, signal) { signal.throwIfAborted(); played.push(midis); },
    drone() {}, volume() {}, async speak() {}, stop() {},
  };
  session = new TrainerSession(audio, () => {}, () => 0, async (_ms, signal) => {
    if (session.snapshot().phase === 'feedback' && played.length === 12) session.stop();
    signal.throwIfAborted();
  });
  await session.start(normalizeSettings({ mode: 'pocket', degrees: [0, 4], octaveCount: 2, cadence: false,
    pocket: { exercise: 'melody', melodyLength: 3, repeats: 2, notesWithAnswer: true, replays: 1 } }));
  const original = played.slice(0, 3);
  assert.equal(played.length, 12);
  assert.ok(new Set(original.map(notes => Math.floor(notes[0] / 12))).size > 1);
  assert.deepEqual(played, [...original, ...original, ...original, ...original]);
  session.destroy();
});
