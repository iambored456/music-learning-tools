import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANGLE_STEP, MODE_SCALE_DEGREES, wheelPitchClasses, wheelSegmentAngles, wheelSegmentPath } from '@mlt/compass-core';
import { CHORD_QUALITIES, GAME_MODES, TrainerSession, allowedDegrees, chordLabel, degreeLabel, melody, midiFrequency, midiNote, normalizeSettings, settingsError, triad, type SessionState, type TrainerAudio } from '../src/index.ts';

class AudioMock implements TrainerAudio {
  played: number[][] = [];
  spoken: string[] = [];
  stops = 0;
  async unlock() {}
  async notes(midis: number[], _seconds: number, signal: AbortSignal) { signal.throwIfAborted(); this.played.push(midis); }
  drone() {}
  volume() {}
  async speak(text: string) { this.spoken.push(text); }
  stop() { this.stops++; }
}
const instant = async (_ms: number, signal: AbortSignal) => { signal.throwIfAborted(); };
function setup(extra = {}, initialRandom = 0) {
  const audio = new AudioMock();
  let state: SessionState;
  let firstRandom = true;
  const session = new TrainerSession(audio, next => { state = next; }, () => { if (firstRandom) { firstRandom = false; return initialRandom; } return 0; }, instant, () => 1000);
  const settings = normalizeSettings({ mode: 'degrees', cadence: false, drone: false, rounds: 1, resolve: false, degreeOptions: { reviewSkip: 'all' }, ...extra });
  return { audio, session, settings, state: () => state! };
}

test('all seven modes have the requested public names', () => {
  assert.deepEqual(GAME_MODES.map(m => m.name), ['Free Play', 'Degrees', 'Melody', 'Chord Progressions', 'Chord Quality', 'Pocket Mode', 'Cycle']);
});
test('wheel order preserves pitch identity and shares 30-degree sectors', () => {
  assert.deepEqual(wheelPitchClasses('fifths'), [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]);
  assert.deepEqual(wheelPitchClasses('chromatic'), Array.from({ length: 12 }, (_, i) => i));
  const { start, end } = wheelSegmentAngles(0);
  assert.equal(end - start, ANGLE_STEP);
  assert.ok(!wheelSegmentPath(110, 225, 0).includes('NaN'));
});
test('all modes produce scale-contained ascending triads across octave boundaries', () => {
  for (const mode of Object.keys(MODE_SCALE_DEGREES) as (keyof typeof MODE_SCALE_DEGREES)[]) {
    const scale = MODE_SCALE_DEGREES[mode];
    for (const degree of scale) {
      const notes = triad(degree, mode);
      assert.ok(notes[0] < notes[1] && notes[1] < notes[2]);
      assert.ok(notes.every(n => scale.includes(n % 12)));
    }
  }
  assert.deepEqual(triad(11, '1'), [11, 14, 17]);
  assert.equal(chordLabel(11, '1'), 'vii°');
  assert.equal(chordLabel(0, '6'), 'i');
  assert.equal(degreeLabel(6, '7'), '♭5');
  assert.throws(() => triad(1, '1'));
});
test('transposition crosses C correctly and maps A4 to 440 Hz', () => {
  assert.equal(midiNote(11, 4, 2), 73);
  assert.equal(midiFrequency(69), 440);
});
test('saved settings reject invalid data and empty selections block a session', () => {
  const settings = normalizeSettings({ mode: 'bad', tonic: 80, octave: -10, degrees: [0, 0, 2, -1, 99, '7'], volume: NaN });
  assert.equal(settings.mode, 'freeplay');
  assert.equal(settings.tonic, 11);
  assert.equal(settings.octave, 2);
  assert.deepEqual(settings.degrees, [0, 2]);
  assert.equal(settings.volume, 0.65);
  assert.ok(settingsError(normalizeSettings({ degrees: [] })));
  assert.ok(settingsError(normalizeSettings({ mode: 'quality', qualities: [] })));
  assert.deepEqual(allowedDegrees(normalizeSettings({ mode: 'chords', degrees: [0, 1, 2] })), [0, 2]);
});
test('melodies contain only allowed degrees, even with a single degree selected', () => {
  assert.deepEqual(melody([7], 8), Array(8).fill(7));
  assert.ok(melody([0, 4, 7], 20).every(n => [0, 4, 7].includes(n)));
});
test('Degrees hides the target, repeats without a new question, and records a correct result', async () => {
  const t = setup({ degrees: [2] }, 11 / 12);
  await t.session.start(t.settings);
  assert.equal(t.state().phase, 'answering');
  assert.equal(t.state().activeDegree, null);
  assert.deepEqual(t.state().revealed, []);
  assert.deepEqual(t.audio.played, [[73]]);
  await t.session.repeat();
  assert.deepEqual(t.audio.played, [[73], [73]]);
  assert.equal(t.state().results.length, 0);
  await t.session.answer(2);
  assert.equal(t.state().phase, 'finished');
  assert.equal(t.state().results[0].correct, true);
});
test('wrong answers reveal and replay the target, recording confusion', async () => {
  const t = setup({ degrees: [0, 2], degreeOptions: { reviewSkip: 'none' } });
  await t.session.start(t.settings); await t.session.answer(2);
  assert.deepEqual(t.audio.played, [[60], [60]]);
  assert.equal(t.state().results[0].expected, '1');
  assert.equal(t.state().results[0].received, '2');
  assert.equal(t.state().results[0].correct, false);
});
test('Melody waits for the whole answer and supports undo', async () => {
  const t = setup({ mode: 'melody', degrees: [0], melodyLength: 3, reviewSkip: 'none' });
  await t.session.start(t.settings);
  await t.session.answer(0); await t.session.answer(0);
  assert.equal(t.state().results.length, 0);
  t.session.undoAnswer(); assert.deepEqual(t.state().input, [0]);
  await t.session.answer(0); await t.session.answer(0);
  assert.equal(t.state().results[0].expected, '1 · 1 · 1');
  assert.equal(t.state().phase, 'feedback');
  await t.session.next();
  assert.equal(t.state().phase, 'finished');
});

test('Melody feedback supports comparing both melodies and free play without changing the score', async () => {
  const t = setup({ mode: 'melody', degrees: [0, 4, 7], melodyLength: 2, rounds: 2, reviewSkip: 'none' });
  await t.session.start(t.settings);
  await t.session.next(); // Next cannot skip an unanswered question.
  assert.equal(t.state().phase, 'answering');
  await t.session.answer(7); await t.session.answer(4);
  assert.equal(t.state().phase, 'feedback');
  assert.equal(t.state().round, 1);
  assert.deepEqual(t.state().input, [7, 4]);
  assert.deepEqual(t.state().revealed, [0, 4]);
  assert.equal(t.state().results[0].correct, false);

  t.audio.played = [];
  await t.session.replayMelody('input');
  await t.session.replayMelody('revealed');
  await t.session.answer(7);
  await t.session.answer(2); // Outside this preset's note pool.
  assert.deepEqual(t.audio.played, [[67], [64], [60], [64], [67]]);
  assert.deepEqual(t.state().input, [7, 4]);
  assert.deepEqual(t.state().revealed, [0, 4]);
  assert.equal(t.state().results.length, 1);
  assert.equal(t.state().phase, 'feedback');

  await Promise.all([t.session.next(), t.session.next()]);
  assert.equal(t.state().phase, 'answering');
  assert.equal(t.state().round, 2);
  assert.deepEqual(t.state().input, []);
  assert.deepEqual(t.state().revealed, []);
  await t.session.answer(0); await t.session.answer(4);
  assert.equal(t.state().phase, 'feedback');
  assert.equal(t.state().results.length, 2);
  await t.session.next();
  assert.equal(t.state().phase, 'finished');
  assert.deepEqual(t.state().results.map(r => r.correct), [false, true]);
});

test('Melody feedback octave controls affect exploration and reset for the next question', async () => {
  const t = setup({ mode: 'melody', degrees: [0], melodyLength: 2, rounds: 2, reviewSkip: 'none' });
  await t.session.start(t.settings);
  t.session.setFeedbackOctave(6);
  assert.equal(t.state().octave, 4);
  await t.session.answer(0); await t.session.answer(0);
  t.session.setFeedbackOctave(20);
  assert.equal(t.state().octave, 6);
  await t.session.answer(0);
  assert.deepEqual(t.audio.played.at(-1), [84]);
  t.session.setFeedbackOctave(1);
  assert.equal(t.state().octave, 2);
  await t.session.next();
  assert.equal(t.state().octave, 4);
  assert.equal(t.state().results.length, 1);
});

test('Next cancels a melody replay without allowing stale playback to alter the next question', async () => {
  const t = setup({ mode: 'melody', degrees: [0], melodyLength: 2, rounds: 2, reviewSkip: 'none' });
  await t.session.start(t.settings);
  await t.session.answer(0); await t.session.answer(0);
  const originalNotes = t.audio.notes.bind(t.audio);
  let release!: () => void;
  let block = true;
  t.audio.notes = async (midis, seconds, signal) => {
    if (block) {
      block = false;
      await new Promise<void>(resolve => { release = resolve; });
    }
    await originalNotes(midis, seconds, signal);
  };
  const replay = t.session.replayMelody('revealed');
  await t.session.next();
  release(); await replay;
  assert.equal(t.state().phase, 'answering');
  assert.equal(t.state().round, 2);
  assert.equal(t.state().activeDegree, null);
  assert.deepEqual(t.state().input, []);
  assert.equal(t.state().results.length, 1);
});
test('Chords uses modal triads and Chord Quality uses the selected voicing', async () => {
  const chord = setup({ mode: 'chords', scale: '6', degrees: [0] });
  await chord.session.start(chord.settings);
  assert.deepEqual(chord.audio.played[0], [60, 63, 67]);
  await chord.session.answer(0); assert.equal(chord.state().results[0].expected, 'i');
  for (let quality = 0; quality < CHORD_QUALITIES.length; quality++) {
    const t = setup({ mode: 'quality', qualities: [quality] });
    await t.session.start(t.settings);
    assert.deepEqual(t.audio.played[0], CHORD_QUALITIES[quality].intervals.map(n => 60 + n));
    await t.session.answer(quality); assert.equal(t.state().results[0].correct, true);
  }
});
test('cadence establishes a tonic once; configured sessions advance and end', async () => {
  const t = setup({ cadence: true, rounds: 2, degrees: [0] });
  await t.session.start(t.settings);
  assert.deepEqual(t.audio.played.slice(0, 4), [[60], [65], [67], [60]]);
  await t.session.answer(0);
  assert.equal(t.state().round, 2);
  assert.equal(t.audio.played.length, 6);
  await t.session.answer(0); assert.equal(t.state().phase, 'finished');
});
test('Freeplay plays selected notes without scoring', async () => {
  const t = setup({ mode: 'freeplay', degrees: [0, 7] });
  await t.session.start(t.settings); await t.session.answer(7);
  assert.deepEqual(t.audio.played, [[67]]);
  assert.equal(t.state().results.length, 0);
  t.session.stop(); assert.equal(t.state().phase, 'idle');
});
test('stop while unlocking never starts a stale session', async () => {
  let unlock!: () => void;
  const t = setup();
  t.audio.unlock = () => new Promise<void>(resolve => { unlock = resolve; });
  const start = t.session.start(t.settings);
  t.session.stop(); unlock(); await start;
  assert.equal(t.audio.played.length, 0);
  assert.equal(t.state().phase, 'idle');
});
test('randomized key and octave determine both playback and the answer identity', async () => {
  const audio = new AudioMock();
  const session = new TrainerSession(audio, () => {}, () => 0.99, instant);
  await session.start(normalizeSettings({ mode: 'degrees', randomTonic: true, randomOctave: true, degrees: [2], cadence: false, resolve: false, rounds: 1 }));
  assert.equal(session.snapshot().tonic, 11);
  assert.equal(session.snapshot().octave, 5);
  assert.deepEqual(audio.played, [[85]]);
  await session.answer(2);
  assert.equal(session.snapshot().results[0].correct, true);
});
test('a newer session wins if an older audio unlock completes late', async () => {
  const audio = new AudioMock(); let unlockOld!: () => void; let first = true;
  audio.unlock = () => first ? (first = false, new Promise<void>(resolve => { unlockOld = resolve; })) : Promise.resolve();
  const session = new TrainerSession(audio, () => {}, () => 0, instant);
  const old = session.start(normalizeSettings({ mode: 'degrees', degrees: [0], cadence: false }));
  await session.start(normalizeSettings({ mode: 'degrees', degrees: [7], cadence: false }));
  unlockOld(); await old;
  assert.deepEqual(audio.played, [[67]]);
  assert.equal(session.snapshot().phase, 'answering');
});
test('stop cancels scheduled feedback and prevents the next question', async () => {
  const audio = new AudioMock(); let session: TrainerSession;
  session = new TrainerSession(audio, () => {}, () => 0, async (ms, signal) => { if (ms === 400) session.stop(); signal.throwIfAborted(); });
  await session.start(normalizeSettings({ mode: 'chords', cadence: false, resolve: false, rounds: 5, degrees: [0] }));
  await session.answer(0);
  assert.equal(session.snapshot().phase, 'finished');
  assert.equal(audio.played.length, 1);
});
test('Pocket mode speaks answers and Cycle walks selected degrees until stopped', async () => {
  for (const mode of ['pocket', 'cycle'] as const) {
    const audio = new AudioMock(); let session: TrainerSession; let rounds = 0;
    session = new TrainerSession(audio, () => {}, () => 0, async (ms, signal) => {
      if (ms === (mode === 'pocket' ? 1500 : 800) && ++rounds === 2) session.stop();
      signal.throwIfAborted();
    });
    await session.start(normalizeSettings({ mode, cadence: false, degrees: [0, 7], pocket: { replays: 0 } }));
    assert.equal(audio.played.length, 2);
    assert.deepEqual(audio.played, mode === 'cycle' ? [[60], [67]] : [[60], [60]]);
    assert.equal(audio.spoken.length, mode === 'pocket' ? 2 : 0);
    assert.equal(session.snapshot().phase, 'idle');
  }
});
