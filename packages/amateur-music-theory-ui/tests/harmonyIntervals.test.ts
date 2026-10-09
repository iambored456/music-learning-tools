import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import type { Component } from 'svelte';
import { createLessonQuestion, lessonPacing } from '@mlt/lesson-kit';
import { harmonyIntervalPlans, harmonyLessonSeeds } from '../src/harmonyIntervals';
import { lessonDefinitions } from '../src/lessons';
import { topLevelOutline } from '../src/outline';
import {
  pitch, intervalPrompt, intervalAnswerPitch, isIntervalPlacementCorrect,
  getIntervalCheckpoint, getIntervalSeekTarget, getIntervalQuestionNotes,
  getIntervalAnswerNotes, getIntervalPlaybackNotes, getIntervalPlaybackOrder,
  type IntervalDistance, type IntervalQuestion, type IntervalPlan,
} from '../src/lesson13Intervals';

const questions = (plan: IntervalPlan) => plan.cues.flatMap(cue => cue.steps)
  .filter(step => step.kind === 'question').map(step => step.question);

test('all three Harmony lessons register playable, uniquely seekable sections', () => {
  assert.deepEqual(harmonyLessonSeeds.map(lesson => lesson.sections.length), [7, 7, 9]);
  for (const seed of harmonyLessonSeeds) {
    const registered = lessonDefinitions.find(lesson => lesson.code === seed.code)!;
    assert.equal(registered.title, seed.title);
    assert.deepEqual(registered.trail, ['Harmony']);
    assert.deepEqual(registered.sections.map(section => section.code), seed.sections.map((_, index) => `${seed.code}.${index + 1}`));
    for (const section of registered.sections) {
      const plan = harmonyIntervalPlans[section.id];
      assert.ok(plan.ascendingPlayback);
      assert.equal(new Set(plan.cues.map(cue => cue.id)).size, plan.cues.length);
      for (const cue of plan.cues) {
        assert.equal(new Set(cue.steps.map(step => step.id)).size, cue.steps.length);
        for (const action of cue.actions!) assert.ok(getIntervalSeekTarget(plan, cue.id, action.id));
      }
    }
  }
  assert.deepEqual(topLevelOutline.find(row => row.id === 'harmony')!.children!.map(row => row.code), ['3.1', '3.2', '3.3']);
  assert.ok(topLevelOutline.find(row => row.id === 'harmony')!.children!.every(row => row.available !== false));
  assert.ok(topLevelOutline.find(row => row.id === 'diatonic-scale')!.children!.every(row => row.available === false));
  assert.ok(topLevelOutline.find(row => row.id === 'pitch-introduction')!.children!.every(row => row.code!.startsWith('1.')));
});

test('every authored answer has the requested upward distance, spelling, and visible range', () => {
  for (const plan of Object.values(harmonyIntervalPlans)) for (const question of questions(plan)) {
    const answer = intervalAnswerPitch(question);
    assert.equal(question.direction, 'above');
    assert.equal(answer.midi - question.reference.midi, question.distance);
    assert.equal(pitch(answer.label).midi, answer.midi);
    for (const note of [...getIntervalQuestionNotes(question), answer]) {
      assert.ok(note.midi >= 57 && note.midi <= 81, note.label);
      assert.equal(pitch(note.label).midi, note.midi);
    }
    if (question.choices) {
      assert.equal(question.choices.filter(choice => choice.id === question.correctChoice).length, 1);
      const selected = question.choices.find(choice => choice.id === question.correctChoice)!;
      if (selected.pitches) assert.deepEqual(selected.pitches.map(note => note.midi), [question.reference.midi, answer.midi]);
      assert.equal(isIntervalPlacementCorrect(question, { midi: answer.midi, leftPercent: 64 }), false);
    } else for (const leftPercent of [0, 8, 32, 64, 99, 100]) {
      assert.equal(isIntervalPlacementCorrect(question, { midi: answer.midi, leftPercent }), true);
      assert.equal(isIntervalPlacementCorrect(question, { midi: question.reference.midi - question.distance, leftPercent }), false);
      assert.equal(isIntervalPlacementCorrect(question, { midi: answer.midi + 1, leftPercent }), false);
    }
  }
});

test('larger interval spelling handles accidentals and octave boundaries without an adjacent-letter assumption', () => {
  for (const [reference, distance, expected] of [
    ['B3', 3, 'D4'], ['D4', 4, 'F#4'], ['Bb3', 7, 'F4'], ['E4', 8, 'C5'],
    ['F4', 9, 'D5'], ['E4', 11, 'D#5'], ['E4', 12, 'E5'],
  ] as const) {
    assert.equal(intervalAnswerPitch({ reference: pitch(reference), distance, direction: 'above' }).label, expected);
  }
});

test('the cumulative chart retains older rows and reveals 7 before 6 and 12 before 8–11', () => {
  let introduced: IntervalDistance[] = [0, 1, 2];
  const sorted = (distances: readonly IntervalDistance[]) => [...distances].sort((a, b) => a - b);
  for (const lesson of harmonyLessonSeeds) for (const section of lesson.sections) {
    const plan = harmonyIntervalPlans[section.id];
    assert.deepEqual(sorted(plan.initialDistances!), sorted(introduced));
    assert.deepEqual(sorted(getIntervalCheckpoint(plan, 0, 0).chartDistances), sorted(introduced));
    for (let ci = 0; ci < plan.cues.length; ci++) for (let si = 0; si < plan.cues[ci].steps.length; si++) {
      const step = plan.cues[ci].steps[si];
      if (step.kind !== 'chart') continue;
      assert.deepEqual(sorted(getIntervalCheckpoint(plan, ci, si).chartDistances), sorted(introduced));
      introduced = [...new Set([...introduced, step.distance])];
      assert.deepEqual(sorted(getIntervalCheckpoint(plan, ci, si + 1).chartDistances), sorted(introduced));
    }
  }
  assert.deepEqual([...introduced].sort((a, b) => a - b), Array.from({ length: 13 }, (_, i) => i));
  assert.ok(!harmonyIntervalPlans['perfect-fifths-above'].initialDistances!.includes(6));
  assert.deepEqual(harmonyIntervalPlans['interval-octaves-above'].initialDistances, [0, 1, 2, 3, 4, 5, 6, 7, 12]);
});

test('demonstration seeks restore the right pair and all playback examples ascend', () => {
  for (const plan of Object.values(harmonyIntervalPlans)) for (const cue of plan.cues) for (const step of cue.steps) {
    if (step.kind !== 'play') continue;
    const target = getIntervalSeekTarget(plan, cue.id, step.id)!;
    const checkpoint = getIntervalCheckpoint(plan, target.cueIndex, target.stepIndex);
    const pair = getIntervalPlaybackNotes(checkpoint.notes, step.exampleId);
    assert.equal(pair.length, 2);
    assert.ok(pair[1].midi > pair[0].midi);
  }
  const reversedColumns = [{ ...pitch('C5'), id: 'answer', leftPercent: 8 }, { ...pitch('C4'), id: 'reference', leftPercent: 90 }];
  assert.deepEqual(getIntervalPlaybackOrder(reversedColumns, true).map(note => note.label), ['C4', 'C5']);
  assert.deepEqual(getIntervalPlaybackOrder(reversedColumns, false).map(note => note.label), ['C5', 'C4']);
});

test('question checkpoints preserve models and octave markers without mutating the authored plan', () => {
  for (const id of ['match-third', 'octave-gaps']) {
    const plan = harmonyIntervalPlans[id];
    const question = questions(plan)[0];
    const before = JSON.stringify(question);
    const preview = getIntervalQuestionNotes(question);
    preview[0].midi = 57;
    assert.equal(JSON.stringify(question), before);
    const answer = { ...intervalAnswerPitch(question), id: 'answer', leftPercent: 64 };
    const accepted = getIntervalAnswerNotes(question, answer);
    const expectedExtra = id === 'match-third' ? ['model-reference', 'model-answer'] : ['octave'];
    assert.ok(expectedExtra.every(extra => accepted.some(note => note.id === extra)));
    const target = getIntervalSeekTarget(plan, 'question-2', 'correct')!;
    const restored = getIntervalCheckpoint(plan, target.cueIndex, target.stepIndex);
    assert.equal(restored.completed.length, 1);
    assert.ok(expectedExtra.every(extra => restored.notes.some(note => note.id === extra)));
    assert.equal(JSON.stringify(question), before);
  }
});

test('the full table matches all thirteen rows and four merged major/minor families', async () => {
  const source = await readFile(new URL('../src/IntervalReferenceChart.svelte', import.meta.url), 'utf8');
  const compiled = compile(source, { filename: 'IntervalReferenceChart.svelte', generate: 'server' }).js.code;
  const resolved = compiled.replace(/(["'])(svelte(?:\/[^"']+)?|@mlt\/lesson-kit)\1/g,
    (_match, _quote, name) => JSON.stringify(import.meta.resolve(name)));
  const { default: Chart } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`) as {
    default: Component<{ distances: IntervalDistance[] }>;
  };
  const full = render(Chart, { props: { distances: Array.from({ length: 13 }, (_, i) => i as IntervalDistance) } }).body;
  const rows = [...full.matchAll(/class="distance[^"\n]*"[^>]*>(\d+)<\/span>/g)].map(match => Number(match[1]));
  assert.deepEqual(rows, Array.from({ length: 13 }, (_, i) => 12 - i));
  assert.match(full, /aria-rowcount="14"/);
  for (const family of ['7th', '6th', '3rd', '2nd']) assert.match(full, new RegExp(`aria-rowspan="2"[^>]*>${family}`));
  const octaveFirst = render(Chart, { props: { distances: [0, 1, 2, 3, 4, 5, 7, 6, 12] } }).body;
  assert.ok(octaveFirst.includes('octave'));
  assert.ok(!octaveFirst.includes('major 7th') && !octaveFirst.includes('minor 6th'));
});

// Run the actual scene's question functions in Node, with mocked audio/speech.
const sceneSource = await readFile(new URL('../src/PitchLesson13Section.svelte', import.meta.url), 'utf8');
const sceneScript = ts.createSourceFile('scene.ts', sceneSource.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const functionNames = ['questionStep', 'openQuestion', 'ask', 'submit', 'submitChoice', 'replayQuestion', 'say', 'playPair', 'playTogether', 'stopVoices', 'cancelPointer'];
const declarations = functionNames.map(name => {
  const fn = sceneScript.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)!;
  return fn.getText(sceneScript);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;

function harness() {
  const events: string[] = [];
  const environment: any = {
    sequence: 1, answerLocked: true, currentQuestion: null, notes: [], activeDistance: null, activeCue: 'question-1',
    responseResolve: null, isPlaying: true, narration: '', upperNarration: '', volume: 72, columns: 28,
    completed: [], voices: new Set(), lessonPacing, plan: { ascendingPlayback: true },
    questionAttempts: 0, previewPlaybackSequence: 0, pointerId: null, preview: null, placementLayer: null,
    intervalPrompt, intervalAnswerPitch, isIntervalPlacementCorrect, getIntervalQuestionNotes, getIntervalAnswerNotes, getIntervalPlaybackOrder,
    rowByMidi: new Map(Array.from({ length: 25 }, (_, i) => [57 + i, { frequency: 57 + i }])),
    questionNarration: createLessonQuestion(() => { events.push('cancel-speech'); }),
    isCurrent: (token: number) => token === environment.sequence,
    wait: async () => true,
    columnCenter: (leftPercent: number) => leftPercent,
    ensureAudioContext: async () => ({
      currentTime: 0,
      createOscillator: () => ({ frequency: { setValueAtTime: (midi: number) => events.push(`sound:${midi}`) },
        connect() {}, disconnect() {}, start() {}, stop() {} }),
      createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, disconnect() {} }),
    }),
    speakWithLessonAvatar: async (text: string) => { events.push(`speech:${text}`); },
    audioOutput: { connect() {}, forget() {} }, mark() {}, inspector: { status() {}, record() {} },
  };
  const functions = runInNewContext(`${javascript}\n({ questionStep, submit, submitChoice, replayQuestion })`, environment) as {
    questionStep(question: IntervalQuestion, token: number, branch: string): Promise<boolean>;
    submit(midi: number, column: number): Promise<void>;
    submitChoice(id: string): Promise<void>;
    replayQuestion(id?: string): Promise<void>;
  };
  return { environment, functions, events };
}
async function flush() { for (let i = 0; i < 120; i++) await Promise.resolve(); }

test('choice input opens immediately; wrong choices retry and correct choices finish', async () => {
  const question = questions(harmonyIntervalPlans['check-fourths-fifths'])[0];
  const h = harness();
  const response = h.functions.questionStep(question, 1, 'normal');
  assert.equal(h.environment.answerLocked, false);
  assert.equal(h.environment.activeDistance, null, 'the chart must not give away recognition answers');
  await h.functions.submitChoice('0');
  assert.equal(h.environment.answerLocked, false);
  assert.equal(h.environment.completed.length, 0);
  await h.functions.submitChoice(question.correctChoice!);
  assert.equal(await response, true);
  assert.equal(h.environment.completed.length, 1);
});

test('Hear pair does not submit an answer and model replay sounds only the model', async () => {
  const h = harness();
  const choice = questions(harmonyIntervalPlans['check-fourths-fifths'])[0];
  const response = h.functions.questionStep(choice, 1, 'normal');
  await flush();
  h.events.length = 0;
  await h.functions.replayQuestion('1');
  assert.deepEqual(h.events.filter(event => event.startsWith('sound:')), ['sound:60', 'sound:65']);
  assert.equal(h.environment.answerLocked, false);
  assert.equal(h.environment.completed.length, 0);
  await h.functions.submitChoice(choice.correctChoice!);
  assert.equal(await response, true);
  const model = questions(harmonyIntervalPlans['match-third'])[0];
  const next = h.functions.questionStep(model, 1, 'normal');
  await flush();
  h.events.length = 0;
  await h.functions.replayQuestion();
  assert.deepEqual(h.events.filter(event => event.startsWith('sound:')), ['sound:60', 'sound:63']);
  await h.functions.submit(model.answer!.midi, 8);
  assert.equal(await next, true);
  assert.ok(h.environment.notes.some((note: any) => note.id === 'model-reference'));
});

test('replacement and octave questions retain reference context and sound an ascending answer', async () => {
  for (const section of ['change-third', 'octave-gaps']) {
    const question = questions(harmonyIntervalPlans[section])[0];
    const h = harness();
    const response = h.functions.questionStep(question, 1, 'normal');
    await flush();
    h.events.length = 0;
    await h.functions.submit(question.answer!.midi, 8);
    assert.equal(await response, true);
    assert.deepEqual(h.events.filter(event => event.startsWith('sound:')), [`sound:${question.reference.midi}`, `sound:${question.answer!.midi}`]);
    assert.equal(h.environment.notes.find((note: any) => note.id === 'reference').midi, question.reference.midi);
    if (question.octave) assert.equal(h.environment.notes.find((note: any) => note.id === 'octave').midi, question.octave.midi);
  }
});

test('retry and correct Inspector branches work for choice questions', async () => {
  const question = questions(harmonyIntervalPlans['thirds-practice'])[1];
  for (const branch of ['retry', 'correct']) {
    const h = harness();
    const response = h.functions.questionStep(question, 1, branch);
    await flush();
    if (branch === 'retry') {
      assert.equal(h.environment.completed.length, 0);
      assert.equal(h.environment.answerLocked, false);
      await h.functions.submitChoice(question.correctChoice!);
    }
    assert.equal(await response, true);
    assert.equal(h.environment.completed.length, 1);
  }
});

test('an answer cancels pending replay audio without duplicating feedback playback', async () => {
  const question = questions(harmonyIntervalPlans['thirds-practice'])[1];
  const h = harness();
  const response = h.functions.questionStep(question, 1, 'normal');
  await flush();
  const context = await h.environment.ensureAudioContext();
  let unlock!: (context: unknown) => void;
  const pending = new Promise(resolve => { unlock = resolve; });
  h.environment.ensureAudioContext = async () => pending;
  h.events.length = 0;
  const replay = h.functions.replayQuestion();
  await flush();
  const answer = h.functions.submitChoice(question.correctChoice!);
  unlock(context);
  await Promise.all([replay, answer]);
  assert.equal(await response, true);
  assert.deepEqual(h.events.filter(event => event.startsWith('sound:')), ['sound:57', 'sound:61']);
});

test('an Inspector jump invalidates pending replay and paused questions reject input', async () => {
  const question = questions(harmonyIntervalPlans['thirds-practice'])[1];
  const h = harness();
  void h.functions.questionStep(question, 1, 'normal');
  await flush();
  h.environment.isPlaying = false;
  await h.functions.submitChoice(question.correctChoice!);
  assert.equal(h.environment.completed.length, 0);
  h.environment.isPlaying = true;
  const context = await h.environment.ensureAudioContext();
  let unlock!: (context: unknown) => void;
  h.environment.ensureAudioContext = async () => new Promise(resolve => { unlock = resolve; });
  h.events.length = 0;
  const replay = h.functions.replayQuestion();
  await flush();
  h.environment.sequence++;
  h.environment.currentQuestion = null;
  unlock(context);
  await replay;
  assert.deepEqual(h.events.filter(event => event.startsWith('sound:')), []);
});
