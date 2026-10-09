import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { createLessonQuestion, lessonPacing } from '@mlt/lesson-kit';
import {
  createScaleNotes, diatonicMidi, fDiatonicMidi, scaleColumn, evaluateScalePair, remainingScalePairs,
  isScalePlacementCorrect, type ScaleStep,
} from '../src/lesson14Scale';

// Run the component's actual interaction functions without browser automation.
const source = await readFile(new URL('../src/PitchLesson14Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const names = ['questionStep', 'openQuestion', 'queuePairFeedback', 'choose', 'submitPlacement', 'say', 'reset', 'playNote', 'releaseVoice', 'initialPreview', 'keyboard'];
const declarations = names.map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`);
  return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
type Question = Extract<ScaleStep, { kind: 'find' | 'place' }>;
const finding: Question = { kind: 'find', id: 'question', title: '', detail: '', distance: 2, targetTotal: 1,
  text: 'Click on two notes that are a major second apart.' };
const placing: Question = { kind: 'place', id: 'question', title: '', detail: '', index: 1, text: 'Place a note a major second above C4.' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function flush() { for (let index = 0; index < 12; index++) await Promise.resolve(); }

function harness() {
  const events: string[] = [];
  const speechDone = deferred<void>();
  const environment = {
    sequence: 1, disposed: false, isPlaying: true, answerLocked: true, currentQuestion: null as Question | null,
    continuousFinding: true, pairFeedback: Promise.resolve(), pairFeedbackPending: false, notesEntering: false, notesVersion: 0,
    notes: createScaleNotes(), found: [] as number[], activePair: null as number | null, selected: null as number | null,
    preview: null as { midi: number; column: number } | null, attempt: null, activeCue: 'first', responseResolve: null, complete: false,
    narration: '', columns: 20, volume: 72, voices: new Set(), lessonPacing,
    plan: { tonic: 'C' as 'C' | 'F', lowMidi: 60, highMidi: 72 }, scaleMidi: [...diatonicMidi] as number[], targetIndex: 1,
    createScaleNotes, diatonicMidi, scaleColumn, evaluateScalePair, remainingScalePairs, isScalePlacementCorrect,
    isCurrent: (token: number) => token === environment.sequence && !environment.disposed,
    wait: async () => true,
    questionNarration: createLessonQuestion(() => { events.push('cancel-speech'); speechDone.resolve(); },
      waiting => events.push(`thinking:${waiting}`)),
    speakWithLessonAvatar: async (text: string) => {
      events.push(`speech:${text}`);
      if (text.startsWith('Click') || text.startsWith('Place')) await speechDone.promise;
    },
    playNotes: async () => { events.push('play-answer'); },
    stopVoices: () => events.push('stop-audio'),
    cancelLessonAvatarSpeech: () => speechDone.resolve(), cancelPointer() {}, clock: { cancel() {} },
    mark() {}, inspector: { status() {}, record() {} },
    rowByMidi: new Map(diatonicMidi.map(midi => [midi, { frequency: 440 * 2 ** ((midi - 69) / 12) }])),
    ensureAudioContext: async (): Promise<unknown> => null,
    createLessonPianoVoice: () => {
      events.push('voice-created');
      return { oscillator: { start() {}, stop() {}, disconnect() {} }, gain: { disconnect() {} } };
    },
    audioOutput: { connect() {}, forget() {} },
  };
  const functions = runInNewContext(`${javascript}\n({ questionStep, choose, submitPlacement, reset, playNote, keyboard })`, environment) as {
    questionStep(question: Question, token: number, branch: string): Promise<boolean>;
    choose(index: number): Promise<void>;
    submitPlacement(midi: number, column: number): Promise<void>;
    reset(): number;
    playNote(note: { midi: number; id: string }, token: number): Promise<void>;
    keyboard(event: { key: string; preventDefault(): void }): void;
  };
  return { environment, functions, events, speechDone };
}

test('F scale placement rejects B natural and a wrong column, then accepts B♭ and preserves earlier notes', async () => {
  const { environment, functions, events } = harness();
  environment.plan.tonic = 'F'; environment.scaleMidi = [...fDiatonicMidi];
  environment.notes = createScaleNotes(3, 0, 'F'); environment.found = [0, 1];
  const question: Question = { ...placing, index: 3, text: 'Place a note a minor second above A.' };
  const response = functions.questionStep(question, 1, 'normal');
  const column = scaleColumn(3, 20);
  await functions.submitPlacement(71, column);
  assert.deepEqual(environment.notes.map(note => note.midi), [65, 67, 69]);
  assert.equal(environment.answerLocked, false);
  await functions.submitPlacement(70, column - 1);
  assert.equal(environment.notes.length, 3);
  assert.ok(events.includes('speech:Use the highlighted column. Try again.'));
  await functions.submitPlacement(70, column);
  assert.equal(await response, true);
  assert.deepEqual(environment.notes.map(note => note.midi), [65, 67, 69, 70]);
  assert.equal(environment.notes[3].label, 'B♭4');
  assert.deepEqual(Array.from(environment.found), [0, 1, 2]);
});

test('keyboard placement reaches the final F5 and keeps the exercise within C4–F5', async () => {
  const { environment, functions } = harness();
  environment.plan = { tonic: 'F', lowMidi: 60, highMidi: 77 };
  environment.scaleMidi = [...fDiatonicMidi]; environment.targetIndex = 7;
  environment.notes = createScaleNotes(7, 0, 'F'); environment.found = [0, 1, 2, 3, 4, 5];
  const response = functions.questionStep({ ...placing, index: 7, text: 'Place a note a minor second above E.' }, 1, 'normal');
  const key = (key: string) => functions.keyboard({ key, preventDefault() {} });
  key('ArrowUp'); assert.equal(environment.preview?.midi, 77);
  key('ArrowUp'); assert.equal(environment.preview?.midi, 77);
  for (let index = 0; index < 20; index++) key('ArrowDown');
  assert.equal(environment.preview?.midi, 60);
  for (let index = 0; index < 20; index++) key('ArrowUp');
  key('Enter');
  assert.equal(await response, true);
  assert.deepEqual(environment.notes.map(note => note.midi), fDiatonicMidi);
});

test('B♭ remains in the visible prompt while narration says B flat', async () => {
  const { environment, functions, events, speechDone } = harness();
  environment.plan.tonic = 'F'; environment.scaleMidi = [...fDiatonicMidi];
  environment.notes = createScaleNotes(4, 0, 'F');
  const text = 'Place a note a major second above B♭.';
  const response = functions.questionStep({ ...placing, index: 4, text }, 1, 'normal');
  await flush();
  assert.equal(environment.narration, text);
  assert.ok(events.includes('speech:Place a note a major second above B flat.'));
  speechDone.resolve(); await functions.submitPlacement(72, scaleColumn(4, 20));
  assert.equal(await response, true);
});

test('pair finding accepts an answer immediately, before question speech dispatch', async () => {
  const { environment, functions, events } = harness();
  const response = functions.questionStep(finding, 1, 'normal');
  assert.equal(environment.answerLocked, false);
  void functions.choose(0);
  await functions.choose(1);
  assert.equal(await response, true);
  assert.deepEqual(Array.from(environment.found), [0]);
  assert.ok(events.includes('play-answer'));
  assert.ok(!events.some(event => event.startsWith('speech:Click')));
});

test('an answer during narration interrupts speech before sounding the pair', async () => {
  const { functions, events } = harness();
  const response = functions.questionStep(finding, 1, 'normal');
  await flush();
  assert.ok(events.some(event => event.startsWith('speech:Click')));
  await functions.choose(1);
  await functions.choose(0);
  assert.equal(await response, true);
  assert.ok(events.indexOf('cancel-speech') < events.indexOf('play-answer'));
  assert.ok(!events.includes('thinking:true'), 'cancelled narration must not restore the thinking pose during feedback');
});

test('duplicates and incorrect pairs retry; all five unique pairs may share notes', async () => {
  const { environment, functions, events } = harness();
  environment.found = [0];
  const response = functions.questionStep({ ...finding, targetTotal: 5, text: 'Find the rest.' }, 1, 'normal');
  await functions.choose(0); await functions.choose(1);
  assert.deepEqual(Array.from(environment.found), [0]);
  assert.equal(environment.answerLocked, false);
  assert.ok(events.includes('speech:You already found that pair. Find another pair.'));
  await functions.choose(0); await functions.choose(7);
  assert.deepEqual(Array.from(environment.found), [0]);
  for (const pair of [1, 3, 4, 5]) { await functions.choose(pair + 1); await functions.choose(pair); }
  assert.equal(await response, true);
  assert.deepEqual(Array.from(environment.found), [0, 1, 3, 4, 5]);
  assert.equal(environment.notes.length, 8);
});

test('correct playback leaves the next pair answerable and preserves a new first-note selection', async () => {
  const { environment, functions, events } = harness();
  const firstPlayback = deferred<void>();
  const secondPlayback = deferred<void>();
  let playbacks = 0;
  environment.playNotes = async () => {
    playbacks++;
    await (playbacks === 1 ? firstPlayback.promise : secondPlayback.promise);
  };
  environment.ensureAudioContext = async () => ({ currentTime: 0 });
  const response = functions.questionStep({ ...finding, targetTotal: 5 }, 1, 'normal');
  await functions.choose(0);
  const firstAnswer = functions.choose(1);
  await flush();
  assert.equal(playbacks, 1);
  assert.equal(environment.answerLocked, false);
  assert.equal(events.filter(event => event === 'voice-created').length, 2, 'each selected note sounds immediately');

  await functions.choose(1);
  const secondAnswer = functions.choose(2);
  await functions.choose(3);
  await flush();
  assert.deepEqual(Array.from(environment.found), [0, 1], 'the second answer is accepted during the first playback');
  assert.equal(playbacks, 1, 'correct-pair examples play in order');
  assert.equal(events.filter(event => event === 'voice-created').length, 5, 'note clicks also sound during correct-pair playback');
  assert.ok(!events.includes('stop-audio'), 'new answers must preserve the preceding correct playback');

  firstPlayback.resolve();
  await firstAnswer; await flush();
  assert.equal(playbacks, 2);
  assert.equal(environment.selected, 3, 'the preceding feedback cannot clear the new selection');
  secondPlayback.resolve(); await secondAnswer;
  assert.equal(environment.selected, 3);
  functions.reset(); assert.equal(await response, false);
});

test('the first pair advances to Find the rest while its feedback is still playing', async () => {
  const { environment, functions } = harness();
  const playback = deferred<void>();
  environment.playNotes = async () => playback.promise;
  const firstResponse = functions.questionStep(finding, 1, 'normal');
  await functions.choose(0);
  const firstAnswer = functions.choose(1);
  assert.equal(await firstResponse, true);
  const restResponse = functions.questionStep({ ...finding, targetTotal: 5, text: 'Find the rest.' }, 1, 'normal');
  assert.equal(environment.answerLocked, false);
  await functions.choose(1);
  const nextAnswer = functions.choose(2);
  assert.deepEqual(Array.from(environment.found), [0, 1]);
  functions.reset();
  playback.resolve(); await firstAnswer; await nextAnswer;
  assert.equal(await restResponse, false);
});

test('finding the last pair waits for all queued correct playback before completing the exercise', async () => {
  const { environment, functions } = harness();
  const firstPlayback = deferred<void>();
  const lastPlayback = deferred<void>();
  let playbacks = 0;
  environment.playNotes = async () => {
    playbacks++;
    await (playbacks === 1 ? firstPlayback.promise : lastPlayback.promise);
  };
  environment.found = [0, 1, 3];
  let completed = false;
  const response = functions.questionStep({ ...finding, targetTotal: 5 }, 1, 'normal').then(correct => {
    completed = correct; return correct;
  });
  await functions.choose(4);
  const firstAnswer = functions.choose(5);
  await functions.choose(5);
  const lastAnswer = functions.choose(6);
  await flush();
  assert.deepEqual(Array.from(environment.found), [0, 1, 3, 4, 5]);
  assert.equal(completed, false);
  firstPlayback.resolve(); await firstAnswer; await flush();
  assert.equal(playbacks, 2);
  assert.equal(completed, false);
  lastPlayback.resolve(); await lastAnswer;
  assert.equal(await response, true);
});

test('minor-second finding retains its existing answer feedback and completion behavior', async () => {
  const { environment, functions, events } = harness();
  environment.continuousFinding = false;
  const response = functions.questionStep({ ...finding, distance: 1 }, 1, 'normal');
  await functions.choose(2); await functions.choose(3);
  assert.equal(await response, true);
  assert.deepEqual(Array.from(environment.found), [2]);
  assert.ok(events.includes('play-answer'));
  assert.ok(events.includes('speech:Correct!'));
});

test('a correct pitch in the wrong column retries without changing accepted notes', async () => {
  const { environment, functions, events } = harness();
  environment.notes = createScaleNotes(1);
  const response = functions.questionStep(placing, 1, 'normal');
  assert.equal(environment.answerLocked, false);
  await functions.submitPlacement(62, scaleColumn(1, 20) + 1);
  assert.deepEqual(environment.notes.map(note => note.midi), [60]);
  assert.equal(environment.found.length, 0);
  assert.equal(environment.answerLocked, false);
  assert.ok(events.includes('speech:Use the highlighted column. Try again.'));
  await functions.submitPlacement(62, scaleColumn(1, 20));
  assert.equal(await response, true);
  assert.deepEqual(environment.notes.map(note => note.midi), [60, 62]);
  assert.deepEqual(Array.from(environment.found), [0]);
});

test('construction is immediately answerable and Grammy thinks after unanswered narration', async () => {
  const { environment, functions, events, speechDone } = harness();
  environment.notes = createScaleNotes(1);
  const response = functions.questionStep(placing, 1, 'normal');
  assert.equal(environment.answerLocked, false);
  await flush(); speechDone.resolve(); await flush();
  assert.equal(events.at(-1), 'thinking:true');
  await functions.submitPlacement(62, scaleColumn(1, 20));
  assert.equal(await response, true);
  assert.ok(events.includes('thinking:false'));
});

test('restart settles the old question and prevents stale feedback advancing new state', async () => {
  const { environment, functions } = harness();
  const playback = deferred<void>();
  environment.playNotes = async () => playback.promise;
  const response = functions.questionStep({ ...finding, targetTotal: 5 }, 1, 'normal');
  await functions.choose(0);
  const feedback = functions.choose(1);
  await flush();
  functions.reset();
  environment.found = []; environment.notes = createScaleNotes(1);
  assert.equal(await response, false);
  playback.resolve(); await feedback;
  assert.equal(environment.found.length, 0);
  assert.equal(environment.notes.length, 1);
  assert.equal(environment.currentQuestion, null);
});

test('audio initialization finishing after a restart cannot start a stale voice', async () => {
  const { environment, functions, events } = harness();
  const contextReady = deferred<unknown>();
  environment.ensureAudioContext = async () => contextReady.promise;
  const sound = functions.playNote({ midi: 60, id: 'scale-0-0' }, 1);
  await flush(); functions.reset();
  contextReady.resolve({ currentTime: 0 }); await sound;
  assert.ok(!events.includes('voice-created'));
  assert.equal(environment.voices.size, 0);
});

test('pausing ignores answers and resuming keeps the selected first note', async () => {
  const { environment, functions } = harness();
  const response = functions.questionStep(finding, 1, 'normal');
  await functions.choose(0);
  environment.isPlaying = false;
  await functions.choose(1);
  assert.equal(environment.selected, 0);
  assert.equal(environment.found.length, 0);
  environment.isPlaying = true;
  await functions.choose(1);
  assert.equal(await response, true);
});
