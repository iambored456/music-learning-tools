import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { parse } from 'svelte/compiler';
import { fullRowData } from '@mlt/pitch-data';
import { createLessonQuestion, lessonPacing, snapLessonPlacement } from '@mlt/lesson-kit';
import { intervalPrompt, intervalAnswerPitch, isIntervalPlacementCorrect,
  getIntervalQuestionNotes, getIntervalAnswerNotes, type IntervalQuestion } from '../src/lesson13Intervals';

// Exercise the actual question/audio sequencing without starting a browser.
const source = await readFile(new URL('../src/PitchLesson13Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const names = ['questionStep', 'openQuestion', 'ask', 'submit', 'say', 'playTogether', 'stopVoices',
  'updatePointer', 'beginPointer', 'finishPointer', 'cancelPointer'];
const declarations = names.map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`);
  return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const question: IntervalQuestion = { reference: { midi: 60, label: 'C4' }, distance: 1, direction: 'above' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function flush() { for (let index = 0; index < 10; index++) await Promise.resolve(); }

function harness() {
  const events: string[] = [];
  const contextReady = deferred<unknown>();
  const toneDuration = deferred<boolean>();
  const speechFinished = deferred<void>();
  const captured = new Set<number>();
  const placementLayer = {
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 280, bottom: 260, width: 280, height: 260 }),
    setPointerCapture: (id: number) => captured.add(id),
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: (id: number) => captured.delete(id),
  };
  const context = {
    currentTime: 0,
    createOscillator() {
      events.push('reference-start');
      return {
        frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() {},
        stop(at?: number) { if (at === undefined) events.push('reference-stop'); },
      };
    },
    createGain() {
      return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, disconnect() {} };
    },
  };
  const environment = {
    sequence: 1, answerLocked: true, currentQuestion: null,
    notes: [], feedback: null, activeDistance: null, activeCue: 'question-1',
    responseResolve: null, isPlaying: true, narration: '', upperNarration: '', volume: 72, columns: 28,
    completed: [], voices: new Set(), lessonPacing, plan: { ascendingPlayback: false },
    questionAttempts: 0, previewPlaybackSequence: 0,
    pointerId: null, preview: null, placementLayer, fullRowData, snapLessonPlacement,
    firstRow: fullRowData.findIndex(row => row.midi === 81), rowCount: 25,
    intervalPrompt, intervalAnswerPitch, isIntervalPlacementCorrect, getIntervalQuestionNotes, getIntervalAnswerNotes,
    rowByMidi: new Map([[60, { frequency: 261.6 }]]),
    questionNarration: createLessonQuestion(() => {
      events.push('cancel-question-speech'); speechFinished.resolve();
    }),
    isCurrent: (token: number) => token === environment.sequence,
    wait: async (ms: number) => ms === lessonPacing.comparisonNoteMs ? toneDuration.promise : true,
    ensureAudioContext: async () => { events.push('context-request'); return contextReady.promise; },
    speakWithLessonAvatar: async (text: string) => {
      events.push(`speech:${text}`);
      if (text !== 'Correct!' && text !== 'Try again.') await speechFinished.promise;
    },
    playPair: async () => { events.push('feedback-pair'); },
    audioOutput: { connect() {}, forget() {} },
    mark() {}, inspector: { status() {}, record() {} },
  };
  const functions = runInNewContext(`${javascript}\n({ questionStep, submit, beginPointer, updatePointer, finishPointer })`, environment) as {
    questionStep(question: IntervalQuestion, token: number, branch: string, introduction?: string): Promise<boolean>;
    submit(midi: number, leftPercent: number): Promise<void>;
    beginPointer(event: Partial<PointerEvent>): void;
    updatePointer(event: Partial<PointerEvent>): void;
    finishPointer(event: Partial<PointerEvent>): void;
  };
  return { environment, functions, events, context, contextReady, toneDuration, speechFinished };
}

test('Now you try is spoken before the placement prompt with both bubbles and immediate input', async () => {
  const { environment, functions, events, speechFinished } = harness();
  const response = functions.questionStep(question, 1, 'normal', 'Now you try.');
  assert.equal(environment.answerLocked, false);
  assert.equal(environment.notes.length, 1);
  assert.equal(environment.upperNarration, 'Now you try.');
  assert.equal(environment.narration, intervalPrompt(question));
  await flush();
  assert.ok(events.includes('speech:Now you try.'));
  assert.ok(!events.some(event => event.startsWith('speech:Place a note')));
  speechFinished.resolve();
  await flush();
  assert.ok(events.indexOf('speech:Now you try.') < events.indexOf(`speech:${intervalPrompt(question, true)}`));
  await functions.submit(60, 64);
  assert.equal(environment.upperNarration, 'Now you try.', 'the upper bubble remains on retry');
  assert.equal(events.filter(event => event === 'speech:Now you try.').length, 1);
  await functions.submit(61, 64);
  assert.equal(await response, true);
  const next = functions.questionStep(question, 1, 'normal');
  assert.equal(environment.upperNarration, '', 'later questions do not retain the introduction');
  await functions.submit(61, 64);
  assert.equal(await next, true);
});

test('answering during Now you try cancels the remaining question speech', async () => {
  const { environment, functions, events } = harness();
  const response = functions.questionStep(question, 1, 'normal', 'Now you try.');
  await flush();
  assert.equal(environment.answerLocked, false);
  assert.ok(events.includes('speech:Now you try.'));
  await functions.submit(61, 64);
  assert.equal(await response, true);
  await flush();
  assert.ok(events.includes('cancel-question-speech'));
  assert.ok(!events.some(event => event.startsWith('speech:Place a note')));
  assert.equal(environment.narration, 'Correct!', 'canceled question speech must not overwrite feedback');
});

test('a question accepts an immediate answer before reference playback or narration starts', async () => {
  const { environment, functions, events } = harness();
  const response = functions.questionStep(question, 1, 'normal');
  assert.equal(environment.answerLocked, false);
  assert.equal(environment.currentQuestion, question);
  assert.equal(typeof environment.responseResolve, 'function');
  await functions.submit(61, 64);
  assert.equal(await response, true);
  assert.ok(events.includes('feedback-pair'));
  assert.ok(!events.includes('reference-start'));
  assert.ok(!events.some(event => event.startsWith('speech:Place a note')));
});

test('a pointer press and captured release submit as soon as the reference note appears', async () => {
  const { environment, functions, events } = harness();
  const response = functions.questionStep(question, 1, 'normal');
  assert.equal(environment.notes.length, 1);
  assert.equal(environment.answerLocked, false);
  const pointer = { pointerId: 7, button: 0, clientX: 180, clientY: 210, preventDefault() {} };
  functions.beginPointer(pointer);
  assert.equal(environment.placementLayer.hasPointerCapture(7), true);
  functions.finishPointer(pointer);
  assert.equal(await response, true);
  assert.equal(environment.placementLayer.hasPointerCapture(7), false);
  assert.equal(environment.pointerId, null);
  assert.ok(!events.some(event => event.startsWith('speech:Place a note')));
});

test('captured pointer move, release and cancellation are handled on the placement layer', () => {
  // Capture retargets events to the parent overlay, so handlers on its child
  // button would never receive a captured release. Inspect the actual template.
  let layer: any;
  function visit(node: any): void {
    if (!node || typeof node !== 'object') return;
    if (node.attributes?.some((attribute: any) => attribute.name === 'class'
      && source.slice(attribute.start, attribute.end) === 'class="placement-layer"')) layer = node;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else visit(value);
    }
  }
  visit(parse(source, { modern: true }));
  assert.ok(layer);
  for (const handler of ['onpointermove', 'onpointerup', 'onpointercancel', 'onlostpointercapture']) {
    assert.ok(layer.attributes.some((attribute: any) => attribute.name === handler), `The capturing layer must handle ${handler}`);
  }
});

test('after an incorrect immediate placement, the reference reappears with input already open', async () => {
  const { environment, functions, events } = harness();
  const response = functions.questionStep(question, 1, 'normal');
  const pointer = { pointerId: 7, button: 0, clientX: 180, clientY: 220, preventDefault() {} };
  functions.beginPointer(pointer); functions.finishPointer(pointer);
  await flush(); await flush();
  assert.ok(events.includes('speech:Try again.'));
  assert.equal(environment.notes.length, 1);
  assert.equal(environment.answerLocked, false);
  const correct = { ...pointer, clientY: 210 };
  functions.beginPointer(correct); functions.finishPointer(correct);
  assert.equal(await response, true);
});

test('an answer during audio initialization prevents a delayed reference sounding afterward', async () => {
  const { functions, events, context, contextReady } = harness();
  const response = functions.questionStep(question, 1, 'normal');
  await flush();
  assert.ok(events.includes('context-request'));
  await functions.submit(61, 64);
  assert.equal(await response, true);
  contextReady.resolve(context);
  await flush();
  assert.ok(!events.includes('reference-start'));
});

test('an answer interrupts a sounding reference and narration before feedback begins', async () => {
  const { functions, environment, events, context, contextReady, toneDuration } = harness();
  contextReady.resolve(context);
  const response = functions.questionStep(question, 1, 'normal');
  await flush();
  assert.ok(events.includes('reference-start'));
  assert.equal(environment.answerLocked, false);
  await functions.submit(61, 64);
  assert.equal(await response, true);
  assert.ok(events.includes('reference-stop'));
  assert.ok(events.indexOf('reference-stop') < events.indexOf('feedback-pair'));
  assert.ok(events.indexOf('cancel-question-speech') < events.indexOf('feedback-pair'));
  assert.equal(environment.voices.size, 0);
  toneDuration.resolve(true);
  await flush();
  assert.equal(events.filter(event => event === 'reference-stop').length, 1);
});
