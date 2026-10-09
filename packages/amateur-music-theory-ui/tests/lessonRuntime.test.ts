import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { compileModule } from 'svelte/compiler';
import ts from 'typescript';
import { createLessonClock, type ClockScheduler } from '@mlt/lesson-kit';
import { createLessonAudioOutput } from '@mlt/lesson-kit';
import { lessonDefinitions } from '../src/lessons';
import { getLinesSpacesCheckpoint, getLinesSpacesInspectorActionId, linesSpacesCues, linesSpacesInspectorCues, nextLinesSpacesActionIndex } from '../src/linesSpacesCues';
import { getLesson12SeekTarget, lesson12Cues, octavePracticePairs } from '../src/lesson12Cues';
import { snapLessonPlacement } from '@mlt/lesson-kit';
import type { createLessonInspector } from '../src/lessonInspector.svelte';

function fakeTime() {
  let now = 0;
  let nextId = 0;
  const jobs = new Map<number, { at: number; callback: () => void }>();
  const scheduler: ClockScheduler = {
    now: () => now,
    schedule(callback, ms) {
      const id = ++nextId;
      jobs.set(id, { at: now + ms, callback });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clear(handle) { jobs.delete(handle as unknown as number); },
  };
  return {
    scheduler,
    advance(ms: number) {
      now += ms;
      for (const [id, job] of jobs) {
        if (job.at <= now) { jobs.delete(id); job.callback(); }
      }
    },
    get pending() { return jobs.size; },
  };
}

test('pause preserves remaining time and resume does not count paused time', async () => {
  const time = fakeTime();
  const clock = createLessonClock(time.scheduler);
  let result: boolean | undefined;
  const waiting = clock.wait(100).then((value) => result = value);
  time.advance(40);
  clock.setPaused(true);
  time.advance(5000);
  await Promise.resolve();
  assert.equal(result, undefined);
  clock.setPaused(false);
  time.advance(59);
  await Promise.resolve();
  assert.equal(result, undefined);
  time.advance(1);
  await waiting;
  assert.equal(result, true);
});

test('overlapping cue delays complete independently', async () => {
  const time = fakeTime();
  const clock = createLessonClock(time.scheduler);
  const short = clock.wait(40);
  const long = clock.wait(80);
  time.advance(40);
  assert.equal(await short, true);
  assert.equal(time.pending, 1);
  time.advance(40);
  assert.equal(await long, true);
});

test('cancelling a checkpoint settles every old wait, including paused waits', async () => {
  const time = fakeTime();
  const clock = createLessonClock(time.scheduler);
  const old = [clock.wait(50), clock.wait(200)];
  clock.setPaused(true);
  old.push(clock.wait(0));
  clock.cancel();
  assert.deepEqual(await Promise.all(old), [false, false, false]);
  assert.equal(time.pending, 0);
  clock.setPaused(false);
  const next = clock.wait(10);
  time.advance(10);
  assert.equal(await next, true);
});

test('a zero-duration playback gate waits for resume', async () => {
  const time = fakeTime();
  const clock = createLessonClock(time.scheduler);
  clock.setPaused(true);
  let finished = false;
  const waiting = clock.wait(0).then(() => finished = true);
  time.advance(1000);
  await Promise.resolve();
  assert.equal(finished, false);
  clock.setPaused(false);
  time.advance(0);
  await waiting;
  assert.equal(finished, true);
});

test('live volume changes mute every voice through the same output', () => {
  const outputs: Array<{ gain: { value: number }; context: unknown; connect: (node: unknown) => void }> = [];
  const context = {
    destination: {},
    createGain() {
      const output = { gain: { value: 1 }, context, connect() {} };
      outputs.push(output);
      return output;
    },
  };
  const connections: unknown[] = [];
  const voice = { connect: (node: unknown) => connections.push(node) };
  const audio = createLessonAudioOutput();
  audio.connect(voice as unknown as GainNode, context as unknown as AudioContext, 72);
  audio.connect(voice as unknown as GainNode, context as unknown as AudioContext, 72);
  assert.equal(outputs.length, 1);
  assert.equal(connections[0], connections[1]);
  audio.setVolume(0);
  assert.equal(outputs[0].gain.value, 0);
  audio.setVolume(40);
  assert.equal(outputs[0].gain.value, 0.4);
  audio.setVolume(Number.NaN);
  assert.equal(outputs[0].gain.value, 0);
});

// Compile runes for Node-only model tests. No browser, server, or generated files.
const source = await readFile(new URL('../src/lessonInspector.svelte.ts', import.meta.url), 'utf8');
const plain = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
} }).outputText;
const compiled = compileModule(plain, { filename: 'lessonInspector.svelte.js', generate: 'server' }).js.code;
const resolved = compiled.replace(/(["'])(svelte\/[^"']+)\1/g, (_match, _quote, name) => JSON.stringify(import.meta.resolve(name)));
const inspectorModule = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`) as {
  createLessonInspector: typeof createLessonInspector;
};

test('moving to another section detaches cue navigation and retains attributed history', () => {
  const inspector = inspectorModule.createLessonInspector();
  inspector.setSection('1.1.1', 'Lines and Spaces');
  let jumps = 0;
  inspector.register(linesSpacesCues, () => jumps++);
  inspector.enter('demonstrate-lines');
  inspector.record('speech', 'Notes can go on lines.');
  inspector.jump('demonstrate-lines');
  assert.equal(jumps, 1);
  inspector.setSection('1.2.1', 'Letter Names');
  inspector.jump('demonstrate-lines');
  assert.equal(jumps, 1);
  assert.equal(inspector.currentCueId, null);
  assert.equal(inspector.cues.length, 0);
  assert.equal(inspector.events.find((event) => event.kind === 'speech')?.section, '1.1.1');
});

test('old registration cleanup cannot detach a replacement scene', () => {
  const inspector = inspectorModule.createLessonInspector();
  inspector.setSection('1.1.1', 'Lines and Spaces');
  const disposeOld = inspector.register(linesSpacesCues, () => {});
  let selected = '';
  inspector.register(linesSpacesCues, (id) => selected = id);
  disposeOld();
  inspector.jump('drag-to-space');
  assert.equal(selected, 'drag-to-space');
  inspector.jump('missing');
  assert.equal(selected, 'drag-to-space');
});

test('action seeking accepts only expected actions in the active cue', () => {
  const inspector = inspectorModule.createLessonInspector();
  inspector.setSection('1.1.1', 'Lines and Spaces');
  const jumps: Array<[string, string | undefined]> = [];
  inspector.register(linesSpacesCues, (cue, action) => jumps.push([cue, action]));
  inspector.jump('demonstrate-spaces', 'note-4');
  inspector.jump('demonstrate-spaces', 'not-an-action');
  inspector.jump('not-a-cue', 'note-4');
  assert.deepEqual(jumps, [['demonstrate-spaces', 'note-4']]);
});

test('action checkpoints restore visible notes and valid quiz and drag positions', () => {
  const notes = getLinesSpacesCheckpoint('demonstrate-spaces', 'note-4');
  assert.equal(notes?.visibleDemoNoteCount, 5);
  assert.equal(getLinesSpacesCheckpoint('demonstrate-spaces', 'missing'), null);
  assert.equal(getLinesSpacesCheckpoint('missing', 'note-4'), null);
  assert.equal(getLinesSpacesCheckpoint('identify-line-space', 'next-2')?.quizIndex, 3);
  assert.equal(getLinesSpacesCheckpoint('drag-to-space', 'tone-2')?.settledDrag, true);
  assert.equal(getLinesSpacesCheckpoint('drag-to-space', 'placement')?.settledDrag, false);
});

test('the grid introduction follows the grid, lines, and spaces sequence', () => {
  const actions = linesSpacesCues[0].actions;
  assert.deepEqual(actions.map((action) => action.kind), [
    'show-grid', 'speech', 'glow-grid', 'hide-lines', 'speech',
    'show-lines', 'hide-lines', 'speech', 'glow-spaces', 'hide-lines',
  ]);
  assert.deepEqual(actions.filter((action) => action.prompt).map((action) => action.prompt), [
    'This, is the pitch GRID.', 'This grid has lines...', '...and spaces',
  ]);
  assert.equal(getLinesSpacesCheckpoint('introduce-pitch', 'show-grid')?.openingNarration, '');
  assert.equal(getLinesSpacesCheckpoint('introduce-pitch', 'glow-spaces')?.openingNarration, '...and spaces');
  assert.equal(linesSpacesCues[1].id, 'demonstrate-lines');
});

test('both note demonstrations finish with a 2000 ms pause', () => {
  assert.equal(linesSpacesCues[1].actions[27].id, 'settle');
  assert.equal(linesSpacesCues[1].actions[27].durationMs, 2000);
  assert.equal(linesSpacesCues[2].actions[29].id, 'settle');
  assert.equal(linesSpacesCues[2].actions[29].durationMs, 2000);
});

test('normal quiz progression skips retry branches; replayed retries return to their question', () => {
  const actions = linesSpacesCues.find((cue) => cue.id === 'identify-line-space')!.actions;
  const question = actions.findIndex((action) => action.id === 'question-2');
  const retry = actions.findIndex((action) => action.id === 'retry-2');
  assert.equal(actions[nextLinesSpacesActionIndex(actions, question)].id, 'correct-2');
  assert.equal(actions[nextLinesSpacesActionIndex(actions, retry)].id, 'question-2');
});

test('the quiz ends with five-note playback matching the drag playback timing and supports seeking', () => {
  const quiz = linesSpacesCues.find((cue) => cue.id === 'identify-line-space')!;
  const drag = linesSpacesCues.find((cue) => cue.id === 'drag-to-line')!;
  const playback = quiz.actions.slice(quiz.actions.findIndex((action) => action.id === 'playback-0')).filter(action => action.kind !== 'quiz-exit');
  const dragPlayback = drag.actions.slice(drag.actions.findIndex((action) => action.kind === 'drag-note')).filter((action) => action.kind !== 'success' && action.kind !== 'drag-exit');
  assert.deepEqual(playback.map((action) => action.durationMs), dragPlayback.map((action) => action.durationMs));
  assert.deepEqual(playback.filter((action) => action.kind === 'quiz-playback-note').map((action) => action.index), [0, 1, 2, 3, 4]);
  for (const id of ['playback-2', 'playback-gap-2']) {
    const checkpoint = getLinesSpacesCheckpoint(quiz.id, id);
    assert.equal(checkpoint?.quizReview, true);
    assert.equal(checkpoint?.quizIndex, 2);
  }
  assert.equal(getLinesSpacesCheckpoint(quiz.id, 'settle')?.quizIndex, -1);
  assert.equal(getLinesSpacesCheckpoint(quiz.id, 'question-2')?.quizReview, false);
});

test('quiz checkpoints reveal only the notes reached so far; the shared exit follows playback', () => {
  const quiz = linesSpacesCues.find(cue => cue.id === 'identify-line-space')!;
  for (let index = 0; index < 5; index++) {
    for (const prefix of ['question', 'retry', 'correct']) {
      const checkpoint = getLinesSpacesCheckpoint(quiz.id, `${prefix}-${index}`)!;
      assert.equal(checkpoint.visibleQuizNoteCount, index + 1);
      assert.equal(checkpoint.quizIndex, index);
      assert.equal(checkpoint.quizReview, false);
    }
  }
  const inspectorActions = linesSpacesInspectorCues.find(cue => cue.id === quiz.id)!.actions!;
  assert.equal(inspectorActions[0].id, 'learn-grid');
  assert.equal(inspectorActions[16].id, 'playback-0');
  assert.equal(inspectorActions[17].id, 'slide-out');
  const exitIndex = quiz.actions.findIndex(action => action.kind === 'quiz-exit');
  assert.equal(quiz.actions[exitIndex - 1].id, 'settle');
  assert.equal(exitIndex, quiz.actions.length - 1);
  assert.equal(quiz.actions[exitIndex].durationMs, 650);
  for (const actionId of ['playback-0', 'settle', 'slide-out']) {
    const checkpoint = getLinesSpacesCheckpoint(quiz.id, actionId)!;
    assert.equal(checkpoint.visibleQuizNoteCount, 5);
    assert.equal(checkpoint.quizReview, true);
  }
  assert.equal(getLinesSpacesCheckpoint(quiz.id, 'slide-out')?.quizIndex, -1);
});

test('the grid-learning bubble precedes the first quiz note and is retained when seeking to a question', () => {
  const introduction = getLinesSpacesCheckpoint('identify-line-space', 'learn-grid')!;
  assert.equal(introduction.action.kind, 'speech');
  assert.equal(introduction.openingNarration, "Let's learn how this grid works.");
  assert.equal(introduction.visibleQuizNoteCount, 0);
  assert.equal(introduction.upperNarration, '');
  const question = getLinesSpacesCheckpoint('identify-line-space', 'question-0')!;
  assert.equal(question.visibleQuizNoteCount, 1);
  assert.equal(question.upperNarration, introduction.openingNarration);
  assert.equal(getLinesSpacesCheckpoint('identify-line-space', 'playback-0')!.upperNarration, '');
});

test('the simplified Inspector maps every execution step to a visible, replayable action', () => {
  for (const cue of linesSpacesCues) {
    const visible = linesSpacesInspectorCues.find((item) => item.id === cue.id)!.actions!;
    assert.ok(visible.length > 0);
    assert.equal(new Set(visible.map((action) => action.id)).size, visible.length);
    for (const action of cue.actions) {
      const visibleId = getLinesSpacesInspectorActionId(cue.id, action.id);
      assert.ok(visible.some((item) => item.id === visibleId), `${cue.id}/${action.id}`);
    }
    for (const action of visible) {
      assert.equal(getLinesSpacesCheckpoint(cue.id, action.id)?.action.id, action.id);
    }
  }
  assert.equal(getLinesSpacesInspectorActionId('missing', 'narration'), null);
  assert.equal(getLinesSpacesInspectorActionId('demonstrate-lines', 'missing'), null);
});

test('the Inspector combines note playback, gaps, and trailing holds into teaching actions', () => {
  assert.deepEqual(linesSpacesInspectorCues[0].actions!.map((action) => action.id), ['show-grid', 'name-lines', 'name-spaces']);
  for (const id of ['demonstrate-lines', 'demonstrate-spaces']) {
    assert.deepEqual(linesSpacesInspectorCues.find((cue) => cue.id === id)!.actions!.map((action) => action.id), ['narration']);
    assert.equal(getLinesSpacesInspectorActionId(id, 'note-4'), 'narration');
    assert.equal(getLinesSpacesInspectorActionId(id, 'gap-4'), 'narration');
    assert.equal(getLinesSpacesInspectorActionId(id, 'settle'), 'narration');
  }
  assert.equal(getLinesSpacesInspectorActionId('identify-line-space', 'playback-gap-3'), 'playback-0');
  assert.equal(getLinesSpacesInspectorActionId('identify-line-space', 'next-2'), 'correct-2');
  assert.deepEqual(linesSpacesInspectorCues.find((cue) => cue.id === 'drag-to-line')!.actions!.map((action) => action.id), ['lead-in', 'placement', 'tone-0', 'slide-out', 'success']);
  assert.equal(getLinesSpacesInspectorActionId('drag-to-space', 'settle'), 'tone-0');
});

test('both celebrations clear the notes and keep the grid visible into the next task or section', () => {
  const line = linesSpacesCues.find((cue) => cue.id === 'drag-to-line')!;
  const successIndex = line.actions.findIndex((action) => action.kind === 'success');
  assert.equal(line.actions[successIndex - 2].id, 'settle');
  assert.equal(line.actions[successIndex - 1].kind, 'drag-exit');
  assert.equal(line.actions[successIndex].prompt, 'Good job!');
  assert.equal(getLinesSpacesCheckpoint(line.id, 'success')?.clearCanvas, true);
  assert.equal(getLinesSpacesCheckpoint(line.id, 'success')?.keepGridVisible, true);
  assert.equal(getLinesSpacesCheckpoint(line.id, 'success')?.openingNarration, 'Good job!');
  assert.equal(getLinesSpacesCheckpoint(line.id, 'placement')?.clearCanvas, false);
  assert.equal(getLinesSpacesCheckpoint(line.id, 'tone-0')?.clearCanvas, false);
  assert.equal(getLinesSpacesInspectorActionId(line.id, 'success'), 'success');
  // Keep the section's f and g segment IDs stable as exits are added.
  assert.equal(linesSpacesCues[5].id, 'drag-to-space');
  const finish = linesSpacesCues[6];
  assert.equal(finish.id, 'finish-section');
  assert.deepEqual(finish.actions.map(action => action.kind), ['success', 'end']);
  assert.equal(finish.actions[0].prompt, 'Terrific!');
  assert.equal(getLinesSpacesCheckpoint(finish.id, 'success')?.clearCanvas, true);
  assert.equal(getLinesSpacesCheckpoint(finish.id, 'success')?.keepGridVisible, true);
  assert.equal(getLinesSpacesCheckpoint(finish.id, 'advance')?.clearCanvas, true);
  assert.equal(getLinesSpacesCheckpoint(finish.id, 'advance')?.keepGridVisible, true);
});

test('space placement combines the introduction and interaction in f.1', () => {
  const spaces = linesSpacesCues.find(cue => cue.id === 'drag-to-space')!;
  const opening = spaces.actions[0];
  assert.equal(opening.kind, 'drag-input');
  assert.equal(opening.id, 'placement');
  assert.equal(opening.prompt, 'Move each note into a space.');
  assert.equal(spaces.actions[1].kind, 'drag-note');
  assert.deepEqual(linesSpacesInspectorCues.find(cue => cue.id === spaces.id)!.actions!.map(action => action.id), ['placement', 'tone-0', 'slide-out']);
  assert.equal(getLinesSpacesCheckpoint(spaces.id)?.settledDrag, false);
  assert.equal(getLinesSpacesCheckpoint(spaces.id)?.clearCanvas, false);
  // Line placement uses the same interruptible introduction policy.
  const lines = linesSpacesCues.find(cue => cue.id === 'drag-to-line')!;
  assert.equal(lines.actions[1].kind, 'drag-input');
  assert.equal(lines.actions[1].prompt, 'Move each note onto a line.');
  assert.equal(lines.actions[2].kind, 'drag-note');
});

test('replaying a cue clears subsequent completion state and reports stay bounded', () => {
  const inspector = inspectorModule.createLessonInspector();
  inspector.setSection('1.1.1', 'Lines and Spaces');
  inspector.register(linesSpacesCues, () => {});
  inspector.enter('introduce-pitch');
  inspector.status('completed');
  inspector.enter('demonstrate-lines');
  inspector.status('completed');
  inspector.resetFrom('demonstrate-lines');
  assert.equal(inspector.statuses['introduce-pitch'], 'completed');
  assert.equal(inspector.statuses['demonstrate-lines'], 'ready');
  for (let i = 0; i < 450; i++) inspector.record('input', `Attempt ${i}`);
  const report = JSON.parse(inspector.report());
  assert.equal(report.events.length, 400);
  assert.equal(report.events.at(-1).detail, 'Attempt 449');
  assert.equal(report.plan[0].prompt, linesSpacesCues[0].prompt);
});

test('lesson placements snap to two-column circle positions and the nearest pitch row', () => {
  assert.deepEqual(snapLessonPlacement(55, 50, 280, 120, 28, 11), { column: 5, row: 4, leftPercent: 6 / 28 * 100 });
  assert.deepEqual(snapLessonPlacement(64.9, 50, 280, 120, 28, 11), snapLessonPlacement(60, 50, 280, 120, 28, 11));
  assert.equal(snapLessonPlacement(65, 50, 280, 120, 28, 11)?.column, 6);
  // Exact rendered centers must map back to the same circle without drifting.
  for (const columnCount of [22, 28]) {
    for (let column = 0; column < columnCount - 1; column++) {
      const x = (column + 1) * 10;
      const snapped = snapLessonPlacement(x, 50, columnCount * 10, 120, columnCount, 11)!;
      assert.equal(snapped.column, column);
      assert.ok(Math.abs(snapped.leftPercent / 100 * columnCount * 10 - x) < 1e-10);
    }
  }
  const first = snapLessonPlacement(-10, -10, 280, 120, 28, 11)!;
  assert.equal(first.column, 0);
  assert.equal(first.row, 0);
  assert.ok(Math.abs(first.leftPercent - 100 / 28) < 1e-12);
  assert.deepEqual(snapLessonPlacement(300, 150, 280, 120, 28, 11), { column: 26, row: 10, leftPercent: 27 / 28 * 100 });
  assert.equal(snapLessonPlacement(10, 20, 0, 100, 28, 11), null);
  assert.equal(snapLessonPlacement(Number.NaN, 20, 280, 100, 28, 11), null);
  assert.equal(snapLessonPlacement(10, 20, 280, 100, 1, 11), null);
});

test('the curriculum registers lessons 1.1 through 1.4 and the three Harmony lessons', () => {
  assert.deepEqual(lessonDefinitions.map((lesson) => lesson.code), ['1.1', '1.2', '1.3', '1.4', '3.1', '3.2', '3.3']);
});

test('every Lesson 1.2 subsection has uniquely addressable expected actions', () => {
  const sections = lessonDefinitions.find((lesson) => lesson.code === '1.2')!.sections;
  assert.deepEqual(Object.keys(lesson12Cues), sections.map((section) => section.id));
  for (const section of sections) {
    const plan = lesson12Cues[section.id];
    assert.ok(plan.length > 0, section.code);
    assert.equal(new Set(plan.map((cue) => cue.id)).size, plan.length, section.code);
    for (const cue of plan) {
      assert.ok(cue.actions?.length, `${section.code}/${cue.id}`);
      assert.equal(new Set(cue.actions?.map((action) => action.id)).size, cue.actions?.length);
    }
  }
});

test('Lesson 1.2 retry checkpoints resume at their question and retain the retry branch', () => {
  const plan = lesson12Cues['letter-cycle'];
  assert.deepEqual(getLesson12SeekTarget(plan, 'identify-next', 'retry-above-A'), {
    targetKey: 'identify-next/above-A', retry: 'retry-above-A',
  });
  assert.deepEqual(getLesson12SeekTarget(plan, 'identify-next', 'above-A'), {
    targetKey: 'identify-next/above-A', retry: null,
  });
  assert.equal(getLesson12SeekTarget(plan, 'identify-next', 'missing'), null);
});


test('octave follow-up has one non-octave and two octave pairs with seekable questions', () => {
  const midi: Record<string, number> = { A3: 57, E4: 64, B3: 59, B4: 71, C4: 60, C5: 72 };
  assert.deepEqual(octavePracticePairs.map(pair => pair.isOctave), [false, true, true]);
  for (const pair of octavePracticePairs) {
    assert.equal(Math.abs(midi[pair.tones[1]] - midi[pair.tones[0]]) === 12, pair.isOctave);
    assert.equal(midi[pair.tones[0]] % 12 === midi[pair.tones[1]] % 12, pair.isOctave);
    for (const suffix of ['distance', 'names']) {
      const id = `${pair.id}-${suffix}`;
      assert.ok(getLesson12SeekTarget(lesson12Cues.octaves, 'compare-as', id));
      assert.ok(getLesson12SeekTarget(lesson12Cues.octaves, 'compare-as', `retry-${id}`));
    }
  }
});


test('octave-number practice contains only four adjacent-note questions and their retries', () => {
  const cue = lesson12Cues['octave-numbers'].find(cue => cue.id === 'practice-octave-numbers')!;
  assert.deepEqual(cue.actions!.map(action => action.id), [
    'after-B4', 'retry-after-B4', 'after-G4', 'retry-after-G4',
    'below-C6', 'retry-below-C6', 'below-D4', 'retry-below-D4', 'finish',
  ]);
});
