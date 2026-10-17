import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrainerSession, allowedDegrees, normalizePocketSettings, normalizeSettings, settingsError, type PocketSettings, type SessionState, type Settings, type SoundPreset, type TrainerAudio } from '../src/index.ts';

class PocketAudio implements TrainerAudio {
  events: { kind: 'notes' | 'speech'; midis?: number[]; seconds?: number; text?: string; volume?: number }[] = [];
  volumes: number[] = [];
  drones: { midi: number | null; volume: number }[] = [];
  presets: SoundPreset[] = [];
  independent: boolean[] = [];
  stops = 0;
  async unlock() {}
  async notes(midis: number[], seconds: number, signal: AbortSignal) {
    signal.throwIfAborted(); this.events.push({ kind: 'notes', midis, seconds });
  }
  async speak(text: string, signal: AbortSignal, volume?: number) {
    signal.throwIfAborted(); this.events.push({ kind: 'speech', text, volume });
  }
  volume(volume: number) { this.volumes.push(volume); }
  drone(midi: number | null, volume: number) { this.drones.push({ midi, volume }); }
  preset(value: SoundPreset) { this.presets.push(value); }
  separateDroneVolume(value: boolean) { this.independent.push(value); }
  stop() { this.stops++; }
  get notesPlayed() { return this.events.filter(e => e.kind === 'notes'); }
  get spoken() { return this.events.filter(e => e.kind === 'speech'); }
}

async function run(pocket: Partial<PocketSettings> = {}, extra: Partial<Settings> = {}, rounds = 1) {
  const audio = new PocketAudio(), states: SessionState[] = [], pauses: { ms: number; phase: string; spoken: number }[] = [];
  const keys = new Map<number, number>();
  let session: TrainerSession;
  session = new TrainerSession(audio, state => {
    const previousPhase = states.at(-1)?.phase;
    states.push(state);
    if (state.round && !keys.has(state.round)) keys.set(state.round, state.tonic);
    if (state.phase === 'listening' && previousPhase === 'feedback' && state.round >= rounds) session.stop();
  }, () => 0, async (ms, signal) => {
    signal.throwIfAborted(); pauses.push({ ms, phase: session.snapshot().phase, spoken: audio.spoken.length });
  });
  const settings = normalizeSettings({ cadence: false, drone: false, degrees: [0, 2], ...extra, mode: 'pocket', pocket: { replays: 0, ...pocket } });
  await session.start(settings);
  return { audio, session, states, pauses, keys, settings };
}

test('Pocket settings migrate old saves, validate limits and do not share defaults', () => {
  const old = normalizeSettings({ mode: 'pocket', degrees: [0, 4] });
  assert.deepEqual(old.pocket, normalizePocketSettings({}));
  assert.equal(old.pocket.tempo, 40);
  assert.equal(old.pocket.questionsPerKey, 5);
  assert.equal(old.pocket.replays, 1);
  const values = normalizePocketSettings({ exercise: 'bad', tempo: NaN, melodyLength: 90, repeats: 0, waitSeconds: -4, replays: 99, answerVolume: 2, droneVolume: 3, melodyVolume: 'bad', questionsPerKey: 7, soundPreset: 'bad' });
  assert.deepEqual(values, { ...normalizePocketSettings({}), tempo: 40, melodyLength: 5, repeats: 1, waitSeconds: 0, replays: 4, answerVolume: 1, droneVolume: 1 });
  old.pocket.tempo = 80;
  assert.equal(normalizeSettings({}).pocket.tempo, 40);
  assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(old))), old);
});

test('Pocket wraps all exercises with matching spoken answers', async () => {
  const cases = [
    { exercise: 'degrees', extra: { degrees: [3], scale: '6' }, notes: [[63]], speech: ['flat 3'] },
    { exercise: 'melody', extra: { degrees: [0, 2] }, notes: [[60], [62], [60]], speech: ['1', '2', '1'] },
    { exercise: 'chords', extra: { degrees: [1, 2] }, notes: [[62, 65, 69]], speech: ['two minor'] },
    { exercise: 'chord-progressions', extra: { degrees: [1, 2] }, notes: [[62, 65, 69], [62, 65, 69], [62, 65, 69]], speech: ['two minor', 'two minor', 'two minor'] },
    { exercise: 'quality', extra: { degrees: [], qualities: [2] }, notes: [[60, 63, 66]], speech: ['Diminished'] },
  ] as const;
  for (const item of cases) {
    const t = await run({ exercise: item.exercise, melodyLength: 3 }, { ...item.extra, degrees: [...item.extra.degrees], ...('qualities' in item.extra ? { qualities: [...item.extra.qualities] } : {}) } as Partial<Settings>);
    assert.deepEqual(t.audio.notesPlayed.map(e => e.midis), item.notes, item.exercise);
    assert.deepEqual(t.audio.spoken.map(e => e.text), item.speech, item.exercise);
    assert.equal(settingsError(t.settings), null);
    assert.equal(t.session.snapshot().phase, 'idle');
    assert.equal(t.session.snapshot().results.length, 0);
    assert.ok(t.states.every(s => s.answerDeadline === null));
    if (item.exercise === 'chords') assert.deepEqual(allowedDegrees(t.settings), [2]);
  }
});

test('Pocket repeats the same melody before the silent wait and replays it after the answer', async () => {
  const t = await run({ exercise: 'melody', melodyLength: 2, repeats: 3, replays: 2, waitSeconds: 2.5 });
  assert.deepEqual(t.audio.notesPlayed.map(e => e.midis), Array.from({ length: 5 }, () => [[60], [62]]).flat());
  assert.deepEqual(t.audio.events.map(e => e.kind), [...Array(6).fill('notes'), 'speech', 'speech', ...Array(4).fill('notes')]);
  assert.ok(t.pauses.some(p => p.ms === 2500 && p.phase === 'answering' && p.spoken === 0));
  assert.ok(t.states.some(s => s.phase === 'feedback' && s.message === '1 · 2'));
});

test('Pocket tempo controls note durations and playback gaps without changing thinking time', async () => {
  for (const tempo of [40, 120]) {
    const t = await run({ tempo, waitSeconds: 7.5 });
    assert.ok(Math.abs(t.audio.notesPlayed[0].seconds! - 60 / tempo * 0.8) < 0.00001);
    assert.ok(t.pauses.some(p => p.ms === 60 / tempo * 200));
    assert.ok(t.pauses.some(p => p.ms === 60 / tempo * 1000 && p.phase === 'feedback'));
    assert.ok(t.pauses.some(p => p.ms === 7500 && p.phase === 'answering'));
  }
});

test('Pocket uses independent answer, drone and melody volumes and the selected sound', async () => {
  const t = await run({ soundPreset: 'bright', answerVolume: 0.2, droneVolume: 0.7, melodyVolume: 0.9 }, { drone: true, volume: 0.1, droneVolume: 0.05 });
  assert.deepEqual(t.audio.presets, ['bright']);
  assert.deepEqual(t.audio.independent, [true]);
  assert.deepEqual(t.audio.volumes, [0.9]);
  assert.deepEqual(t.audio.spoken.map(e => e.volume), [0.2]);
  assert.ok(t.audio.drones.some(d => d.midi === 48 && d.volume === 0.7));
});

test('notes can accompany each spoken melody note; answers can be disabled independently of replays', async () => {
  const accompanied = await run({ exercise: 'melody', melodyLength: 2, notesWithAnswer: true });
  assert.deepEqual(accompanied.audio.notesPlayed.map(e => e.midis), [[60], [62], [60], [62]]);
  assert.deepEqual(accompanied.audio.spoken.map(e => e.text), ['1', '2']);
  const silent = await run({ notesWithAnswer: true, speakAnswer: false, replays: 2 });
  assert.equal(silent.audio.spoken.length, 0);
  assert.deepEqual(silent.audio.notesPlayed.map(e => e.midis), [[60], [60], [60]]);
  assert.ok(silent.states.every(s => s.revealed.length === 0));
});

test('Pocket holds a random key for the selected number of questions and plays context only on key changes', async () => {
  const random = await run({ questionsPerKey: 5 }, { randomTonic: true, cadence: true, degrees: [0] }, 11);
  assert.deepEqual([...random.keys.values()], [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2]);
  assert.equal(random.states.filter((s, index) => s.message === 'Establishing the tonic: 1 · 4 · 5 · 1' && random.states[index - 1]?.message !== s.message).length, 3);
  const migrated = await run({ questionsPerKey: 10 }, { tonic: 9, randomTonic: false, cadence: true, degrees: [0] }, 11);
  assert.equal(migrated.settings.randomTonic, true);
  assert.deepEqual([...migrated.keys.values()], [...Array(10).fill(0), 1]);
  assert.equal(migrated.audio.notesPlayed.length, 19);
});

test('stopping Pocket during repeats, thinking, speech or replay prevents any subsequent playback', async () => {
  for (const stage of ['repeat', 'think', 'speech', 'replay']) {
    const audio = new PocketAudio(); let session: TrainerSession;
    session = new TrainerSession(audio, () => {}, () => 0, async (ms, signal) => {
      const phase = session.snapshot().phase;
      if ((stage === 'repeat' && phase === 'listening' && ms === 1500)
        || (stage === 'think' && phase === 'answering')
        || (stage === 'replay' && phase === 'feedback' && ms === 1500)) session.stop();
      signal.throwIfAborted();
    });
    if (stage === 'speech') audio.speak = async (_text, signal) => { session.stop(); signal.throwIfAborted(); };
    await session.start(normalizeSettings({ mode: 'pocket', cadence: false, drone: false, degrees: [0], pocket: { repeats: stage === 'repeat' ? 2 : 1, replays: 1 } }));
    assert.equal(audio.notesPlayed.length, 1, stage);
    assert.equal(session.snapshot().phase, 'idle', stage);
    assert.equal(session.snapshot().answerDeadline, null);
  }
});
