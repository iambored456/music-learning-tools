import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_MODES, allowedDegrees, applyPreset, challengePresetGroups, challengePresets, degreeLabel, nextPreset, normalizeCustomPresets, normalizeProgress, normalizeSettings, pathPresetGroups, pathPresets, recordProgress, setWheelView, settingsError, wheelView, TrainerSession, type Result, type TrainerAudio } from '../src/index.ts';

test('every built-in preset has a usable answer pool for its mode', () => {
  for (const mode of GAME_MODES) {
    for (const preset of [...pathPresets(mode.id), ...challengePresets(mode.id)]) {
      const settings = applyPreset(normalizeSettings({ mode: mode.id }), preset);
      assert.equal(settingsError(settings), null, `${mode.id}/${preset.id}`);
      assert.equal(settings.mode, mode.id);
      if (mode.id === 'melody' || mode.id === 'chords') assert.deepEqual(allowedDegrees(settings), settings.degrees);
    }
  }
  assert.deepEqual(pathPresets('degrees')[0].patch.degrees, [0, 4]);
  assert.deepEqual(pathPresets('degrees')[1].patch.degrees, [0, 4, 7]);
});

test('preset application preserves sound, difficulty and wheel preferences', () => {
  const source = normalizeSettings({ mode: 'degrees', answerSeconds: 2, wheelStyle: 'minimal', volume: 0.25, tonic: 9 });
  const next = applyPreset(source, challengePresets('degrees').find(p => p.id === 'mode-6')!);
  assert.equal(next.scale, '6');
  assert.deepEqual(next.degrees, [0, 2, 3, 5, 7, 8, 10]);
  assert.equal(next.answerSeconds, 2); assert.equal(next.wheelStyle, 'minimal');
  assert.equal(next.volume, 0.25); assert.equal(next.tonic, 9);
  assert.deepEqual(source.degrees, [0, 2, 4, 5, 7, 9, 11]);
});

test('Next Level follows each exercise’s displayed levels and returns to selection at the end', () => {
  for (const mode of ['degrees', 'melody', 'chords', 'chord-progressions', 'quality'] as const) {
    const levels = [...pathPresets(mode), ...challengePresets(mode)];
    for (let index = 0; index < levels.length - 1; index++) {
      const next = nextPreset(mode, levels[index].id)!;
      assert.equal(next.id, levels[index + 1].id);
      const settings = applyPreset(normalizeSettings({ mode, answerSeconds: 5 }), next);
      assert.equal(settings.mode, mode);
      assert.equal(settings.answerSeconds, 5);
      assert.equal(settingsError(settings), null);
    }
    assert.equal(nextPreset(mode, levels.at(-1)!.id), null);
    assert.equal(nextPreset(mode, 'custom-my-level'), null);
    assert.equal(nextPreset(mode, null), null);
  }
  assert.equal(nextPreset('freeplay', 'sun-1'), null);
});

test('Minimal Chromatic survives level selection and storage and remains distinct from Minimal', () => {
  const settings = normalizeSettings({ mode: 'degrees' });
  setWheelView(settings, 'minimal-chromatic');
  const preset = applyPreset(settings, pathPresets('degrees')[0]);
  const restored = normalizeSettings(JSON.parse(JSON.stringify(preset)));
  assert.equal(restored.wheelStyle, 'minimal');
  assert.equal(restored.order, 'chromatic');
  assert.equal(wheelView(restored), 'minimal-chromatic');
  setWheelView(restored, 'minimal');
  assert.equal(restored.order, 'fifths');
  assert.equal(wheelView(restored), 'minimal');
  setWheelView(restored, 'chromatic');
  assert.equal(restored.wheelStyle, 'compass');
  assert.equal(wheelView(restored), 'chromatic');
});

test('Degrees and Melody include the screenshot paths and named challenges with their full note sets', () => {
  const expected = {
    'Minor Levels': [
      ['Minor I', '1 ♭3'], ['Minor II', '1 ♭3 5'], ['Minor III', '1 2 ♭3 5'],
      ['Minor IV', '1 2 ♭3 5 ♭6'], ['Minor V', '1 2 ♭3 5 ♭6 ♭7'],
      ['Minor VI', '1 2 ♭3 4 5 ♭6 ♭7'], ['Minor VII', '1 ♭2 2 ♭3 4 5 ♭6 ♭7'],
    ],
    'Chromatic Levels': [
      ['Chromatic I', '1 ♭3 3 5'], ['Chromatic II', '1 ♭2 2 ♭3 3 5'],
      ['Chromatic III', '1 ♭2 2 ♭3 3 5 ♭6 6'], ['Chromatic IV', '1 ♭2 2 ♭3 3 5 ♭6 6 ♭7 7'],
      ['Chromatic V', '1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7'],
    ],
    Modes: [
      ['Major', '1 2 3 4 5 6 7'], ['Minor', '1 2 ♭3 4 5 ♭6 ♭7'],
      ['② Dorian', '1 2 ♭3 4 5 6 ♭7'], ['③ Phrygian', '1 ♭2 ♭3 4 5 ♭6 ♭7'],
      ['④ Lydian', '1 2 3 ♯4 5 6 7'], ['⑤ Mixolydian', '1 2 3 4 5 6 ♭7'],
      ['⑦ Locrian', '1 ♭2 ♭3 4 ♭5 ♭6 ♭7'],
    ],
    'Other Scales': [
      ['Pentatonic', '1 2 3 5 6'], ['Minor Pentatonic', '1 ♭3 4 5 ♭7'],
      ['Melodic Minor', '1 2 ♭3 4 5 6 7'], ['Harmonic Minor', '1 2 ♭3 4 5 ♭6 7'],
      ['Whole-Tone Scale', '1 2 3 ♯4 ♭6 ♭7'], ['Half-Whole Scale', '1 ♭2 ♭3 3 ♯4 5 6 ♭7'],
      ['Chromatic', '1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7'],
    ],
    Tricky: [
      ['Clean', '1 2 4 5'], ['Threes and Sixes', '♭3 3 ♭6 6'],
      ['Twos and Sevens', '♭2 2 ♭7 7'], ['The Dark Side', '♭2 ♭3 ♯4 ♭6 ♭7'],
    ],
    Oddball: [['Bad Dream', '♭2 4 ♯4 6'], ['Dimwit', '2 4 ♭6 7'], ['Cluster', '4 ♯4 5 ♭6 6']],
    Chords: [
      ['Major', '1 3 5'], ['Minor', '1 ♭3 5'], ['maj6', '1 3 5 6'], ['m6', '1 ♭3 5 6'],
      ['maj7', '1 3 5 7'], ['m7', '1 ♭3 5 ♭7'], ['7', '1 3 5 ♭7'], ['m(maj7)', '1 ♭3 5 7'],
    ],
  };
  for (const mode of ['degrees', 'melody'] as const) {
    const path = pathPresetGroups(mode), challenges = challengePresetGroups(mode);
    assert.deepEqual(path.map(group => group.name), ['Major Levels', 'Minor Levels', 'Chromatic Levels']);
    assert.deepEqual(challenges.map(group => group.name), ['Modes', 'Other Scales', 'Tricky', 'Oddball', 'Chords']);
    for (const [name, notes] of Object.entries(expected)) {
      const group = [...path, ...challenges].find(group => group.name === name)!;
      assert.deepEqual(group.presets.map(preset => {
        const settings = applyPreset(normalizeSettings({ mode }), preset);
        return [preset.name, allowedDegrees(settings).map(degree => degreeLabel(degree, settings.scale)).join(' ')];
      }), notes, `${mode}/${name}`);
    }
    const all = [...pathPresets(mode), ...challengePresets(mode)];
    assert.equal(new Set(all.map(preset => preset.id)).size, all.length);
  }
});

test('new level progress survives storage and stays separate by level and game mode', () => {
  let progress = {};
  for (const mode of ['degrees', 'melody'] as const) {
    for (const preset of [...pathPresets(mode), ...challengePresets(mode)]) {
      const settings = applyPreset(normalizeSettings({ mode, octaveCount: 2, rounds: 1, answerSeconds: mode === 'degrees' ? 5 : 2 }), preset);
      progress = recordProgress(progress, settings, preset.id, [{ expected: '1', received: '1', tonic: 0, octave: 4, correct: true, seconds: 1 }]);
    }
  }
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(progress))), progress);
  assert.equal(normalizeProgress(progress)['degrees:moon-1'], 2);
  assert.equal(normalizeProgress(progress)['melody:moon-1'], 3);
  assert.deepEqual(normalizeProgress({ 'degrees:moon-8': 1, 'melody:union-6': 2, 'chords:union-1': 3, 'degrees:chromatic': 99, 'pocket:chromatic': 2 }), {});
  assert.deepEqual(normalizeProgress({ 'degrees:sun-1': 1, 'melody:mode-6': 2, 'quality:triads-1': 3, 'melody:custom-a': 1 }),
    { 'degrees:sun-1': 1, 'melody:mode-6': 2, 'quality:triads-1': 3, 'melody:custom-a': 1 });
});

test('Melody keeps chromatic selections while Chords keeps its diatonic note restriction', () => {
  const notes = Array.from({ length: 12 }, (_, i) => i);
  assert.deepEqual(allowedDegrees(normalizeSettings({ mode: 'melody', degrees: notes })), notes);
  assert.deepEqual(allowedDegrees(normalizeSettings({ mode: 'chords', degrees: notes })), [0, 2, 4, 5, 7, 9, 11]);
  const custom = normalizeCustomPresets([{ id: 'custom-chromatic', name: 'Chromatic melody', settings: { mode: 'melody', degrees: [1, 3, 6] } }]);
  assert.deepEqual(custom[0].settings.degrees, [1, 3, 6]);
  assert.deepEqual(allowedDegrees(custom[0].settings), [1, 3, 6]);
});

test('custom preset storage round-trips safely and rejects malformed or unusable presets', () => {
  const settings = normalizeSettings({ mode: 'melody', degrees: [0, 7], melodyLength: 4 });
  const input = [null, { id: 'custom-a', name: '  My melody  ', settings },
    { id: 'custom-a', name: 'Duplicate', settings }, { id: 'bad', name: 'Bad id', settings },
    { id: 'custom-b', name: 'Bad mode', settings: { mode: 'voice' } },
    { id: 'custom-c', name: 'Empty', settings: { mode: 'degrees', degrees: [] } }];
  const saved = normalizeCustomPresets(JSON.parse(JSON.stringify(input)));
  assert.equal(saved.length, 1); assert.equal(saved[0].name, 'My melody');
  assert.deepEqual(saved[0].settings, settings);
  assert.deepEqual(normalizeCustomPresets({}), []);
});

test('progress requires a complete scored session and preserves highest earned difficulty', () => {
  const settings = normalizeSettings({ mode: 'degrees', octaveCount: 2, rounds: 5, answerSeconds: 5 });
  const results: Result[] = Array.from({ length: 5 }, (_, i) => ({ expected: '1', received: '1', tonic: 0, octave: 4, correct: i < 4, seconds: 1 }));
  const earned = recordProgress({}, settings, 'sun-1', results);
  assert.equal(earned['degrees:sun-1'], 2);
  assert.deepEqual(recordProgress(earned, { ...settings, answerSeconds: 0 }, 'sun-1', results), earned);
  assert.deepEqual(recordProgress({}, settings, 'sun-1', results.slice(0, 4)), {});
  assert.deepEqual(recordProgress({}, settings, null, results), {});
  assert.deepEqual(recordProgress({}, { ...settings, mode: 'freeplay' }, 'sun-1', results), {});
  assert.deepEqual(recordProgress({}, settings, 'sun-1', results.map(r => ({ ...r, correct: false }))), {});
  assert.deepEqual(normalizeProgress({ ...earned, 'degrees:bad': 2, 'pocket:sun-1': 3, 'melody:sun-2': 99 }), earned);
});

class AudioMock implements TrainerAudio {
  played: number[][] = [];
  async unlock() {}
  async notes(midis: number[], _seconds: number, signal: AbortSignal) { signal.throwIfAborted(); this.played.push(midis); }
  drone() {} volume() {} async speak() {} stop() {}
}
test('new Degrees and Melody levels play and accept notes outside the original major scale', async () => {
  for (const mode of ['degrees', 'melody'] as const) {
    for (const [id, target] of [['moon-1', 3], ['union-1', 3], ['half-whole', 6], ['bad-dream', 1], ['chord-minor-maj7', 11]] as const) {
      const preset = [...pathPresets(mode), ...challengePresets(mode)].find(preset => preset.id === id)!;
      const t = timed({ mode, melodyLength: 2, answerSeconds: 0 });
      const settings = applyPreset(t.settings, preset);
      // Select a single note from the level to make both playback and grading deterministic.
      assert.ok(allowedDegrees(settings).includes(target));
      await t.session.start({ ...settings, degrees: [target] });
      assert.equal(t.session.snapshot().phase, 'answering');
      assert.equal(t.session.snapshot().octave, 4);
      assert.deepEqual(t.audio.played, Array.from({ length: mode === 'melody' ? 2 : 1 }, () => [60 + target]));
      for (let i = 0; i < (mode === 'melody' ? 2 : 1); i++) await t.session.answer(target);
      assert.equal(t.session.snapshot().results[0].correct, true);
      if (mode === 'melody') await t.session.next();
      assert.equal(t.session.snapshot().phase, 'finished');
    }
  }
});
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function timed(extra = {}) {
  const audio = new AudioMock();
  let now = 1000;
  const timers: { callback: () => void; ms: number; cancelled: boolean }[] = [];
  const session = new TrainerSession(audio, () => {}, () => 0, async (_ms, signal) => { signal.throwIfAborted(); }, () => now, (callback, ms) => {
    const timer = { callback, ms, cancelled: false }; timers.push(timer); return () => { timer.cancelled = true; };
  });
  const settings = normalizeSettings({ mode: 'degrees', degrees: [0], cadence: false, resolve: false, rounds: 1, answerSeconds: 2, degreeOptions: { reviewSkip: 'all' }, ...extra });
  return { session, audio, timers, settings, advance: (ms: number) => { now += ms; } };
}

test('timed questions start the deadline after playback and score an unanswered question exactly once', async () => {
  const t = timed();
  await t.session.start(t.settings);
  assert.equal(t.session.snapshot().answerDeadline, 3000);
  assert.equal(t.timers[0].ms, 2000);
  t.advance(2000); t.timers[0].callback(); await flush();
  assert.equal(t.session.snapshot().phase, 'finished');
  assert.deepEqual(t.session.snapshot().results, [{ expected: '1', received: 'Time out', tonic: 0, octave: 4, correct: false, seconds: 2 }]);
  assert.equal(t.session.snapshot().answerDeadline, null);
  await t.session.answer(0); assert.equal(t.session.snapshot().results.length, 1);
});

test('timeouts count toward answered totals and the five-question key boundary', async () => {
  const t = timed({ rounds: 6 }); await t.session.start(t.settings);
  const keys: number[] = [];
  for (let question = 0; question < 6; question++) {
    keys.push(t.session.snapshot().tonic);
    t.advance(2000); t.timers[question].callback(); await flush();
    assert.equal(t.session.snapshot().results.length, question + 1);
    assert.equal(t.session.snapshot().results.filter(result => result.correct).length, 0);
  }
  assert.deepEqual(keys, [0, 0, 0, 0, 0, 1]);
  assert.equal(t.session.snapshot().phase, 'finished');
});

test('late clicks cannot beat an expired clock, and partial melody answers time out', async () => {
  const t = timed({ mode: 'melody', melodyLength: 3, reviewSkip: 'correct' });
  await t.session.start(t.settings); await t.session.answer(0);
  t.advance(2001); await t.session.answer(0);
  const result = t.session.snapshot();
  assert.equal(result.phase, 'feedback'); assert.equal(result.results[0].received, 'Time out');
  assert.deepEqual(result.input, [0]); assert.equal(result.results[0].correct, false);
  assert.ok(t.timers[0].cancelled);
  await t.session.replayMelody('input');
  assert.equal(t.session.snapshot().results.length, 1);
  await t.session.next();
  assert.equal(t.session.snapshot().phase, 'finished');
});

test('replay resets the clock after playback; a complete answer cancels its deadline', async () => {
  const t = timed({ answerSeconds: 5 });
  await t.session.start(t.settings); t.advance(3000); await t.session.repeat();
  assert.ok(t.timers[0].cancelled); assert.equal(t.timers[1].ms, 5000);
  assert.equal(t.session.snapshot().answerDeadline, 9000);
  t.advance(1000); await t.session.answer(0);
  assert.ok(t.timers[1].cancelled); assert.equal(t.session.snapshot().results[0].seconds, 1);
});

test('stopping, restarting, and leaving a screen invalidate old timers', async () => {
  const t = timed(); await t.session.start(t.settings);
  t.session.stop(); assert.ok(t.timers[0].cancelled);
  await t.session.start(t.settings);
  t.timers[0].callback(); await flush();
  assert.equal(t.session.snapshot().phase, 'answering'); assert.equal(t.session.snapshot().results.length, 0);
  t.session.reset(); assert.ok(t.timers[1].cancelled);
  t.timers[1].callback(); await flush();
  assert.equal(t.session.snapshot().phase, 'idle'); assert.equal(t.session.snapshot().answerDeadline, null);
});

test('Novice is untimed, missing views use Minimal Chromatic, and explicit views are preserved', async () => {
  const t = timed({ answerSeconds: 0 }); await t.session.start(t.settings);
  assert.equal(t.timers.length, 0); assert.equal(t.session.snapshot().answerDeadline, null);
  assert.equal(normalizeSettings({ order: 'chromatic' }).wheelStyle, 'minimal');
  assert.equal(normalizeSettings({ order: 'fifths', wheelStyle: 'compass' }).wheelStyle, 'compass');
  assert.equal(normalizeSettings({ order: 'chromatic' }).order, 'chromatic');
  assert.equal(normalizeSettings({ answerSeconds: 99, wheelStyle: 'invalid' }).answerSeconds, 0);
});

test('Freeplay can change tonic and octave without losing the session or transposing twice', async () => {
  const t = timed({ mode: 'freeplay', degrees: [0, 7] }); await t.session.start(t.settings);
  t.session.setFreeplayPitch(11, 5); await t.session.answer(7);
  assert.deepEqual(t.audio.played, [[90]]);
  assert.equal(t.session.snapshot().phase, 'exploring'); assert.equal(t.session.snapshot().octave, 5);
});
