import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import type { Component } from 'svelte';
import { fullRowData } from '@mlt/pitch-data';
import { lessonDefinitions } from '../src/lessons';
import {
  intervalPlans, intervalPitchRange, intervalPrompt, intervalAnswerPitch,
  isIntervalPlacementCorrect, getIntervalSeekTarget, getIntervalCheckpoint,
  displayIntervalPitch, speakIntervalPitch,
  createIntervalExampleNotes, getIntervalPlaybackNotes, getIntervalPlaybackGroups,
  type IntervalQuestion, type IntervalStep,
} from '../src/lesson13Intervals';

const questions = (id: string) => intervalPlans[id].cues.flatMap(cue => cue.steps)
  .filter((step): step is Extract<IntervalStep, { kind: 'question' }> => step.kind === 'question')
  .map(step => step.question);

test('Lesson 1.3 registers nine Sections with uniquely seekable Segments and Sub-Segments', () => {
  const lesson = lessonDefinitions.find(lesson => lesson.code === '1.3')!;
  assert.equal(lesson.title, 'Intervals Part One (2nds)');
  assert.deepEqual(Object.keys(intervalPlans), lesson.sections.map(section => section.id));
  assert.deepEqual(lesson.sections.map(section => section.code), Array.from({ length: 9 }, (_, i) => `1.3.${i + 1}`));
  for (const plan of Object.values(intervalPlans)) {
    assert.equal(new Set(plan.cues.map(cue => cue.id)).size, plan.cues.length);
    for (const cue of plan.cues) {
      assert.equal(new Set(cue.steps.map(step => step.id)).size, cue.steps.length);
      assert.deepEqual(cue.actions!.map(action => action.id), cue.steps.map(step => step.id));
      assert.ok(cue.prompt || cue.steps.every(step => step.kind === 'finish' && !step.text),
        'a Segment without narration must be a silent completion');
      for (const action of cue.actions!) assert.ok(getIntervalSeekTarget(plan, cue.id, action.id));
    }
  }
});

test('the opening demonstrates the same pitches both directly above and in another column', () => {
  const cues = intervalPlans['interval-introduction'].cues;
  const successive = cues.find(cue => cue.id === 'different-times')!;
  const simultaneous = cues.find(cue => cue.id === 'same-time')!;
  const firstPair = successive.steps.find(step => step.kind === 'setup')!;
  const secondPair = simultaneous.steps.find(step => step.kind === 'setup')!;
  assert.equal(firstPair.together, false);
  assert.equal(secondPair.together, true);
  assert.deepEqual(firstPair.pitches, secondPair.pitches);
  assert.equal(successive.steps.find(step => step.kind === 'play')!.together, false);
  assert.equal(simultaneous.steps.find(step => step.kind === 'play')!.together, true);
});

test('the successive pair stays visible when the simultaneous pair is added and when seeking', () => {
  const plan = intervalPlans['interval-introduction'];
  const before = getIntervalCheckpoint(plan, 1, 2).notes;
  assert.equal(before.length, 2);
  for (const [cueIndex, stepIndex] of [[2, 1], [2, 2], [3, 0]]) {
    const notes = getIntervalCheckpoint(plan, cueIndex, stepIndex).notes;
    assert.equal(notes.length, 4);
    assert.deepEqual(notes.slice(0, 2), before);
    assert.equal(new Set(notes.map(note => note.id)).size, 4);
    assert.equal(notes[2].leftPercent, notes[3].leftPercent);
    assert.ok(notes[2].leftPercent > notes[1].leftPercent);
  }
  const setup = plan.cues[2].steps[0];
  assert.equal(setup.kind, 'setup');
  if (setup.kind === 'setup') {
    const notes = createIntervalExampleNotes(setup, before);
    assert.deepEqual(createIntervalExampleNotes(setup, notes), notes, 'replaying setup must keep stable identities');
  }
});

test('1.3.1.c has only setup, the shortened explanation, and playback of the simultaneous pair', () => {
  const plan = intervalPlans['interval-introduction'];
  const cue = plan.cues[2];
  assert.deepEqual(cue.steps.map(step => step.kind), ['setup', 'say', 'play']);
  assert.equal(cue.steps[1].kind === 'say' && cue.steps[1].text, 'Or they can be at the same time.');
  assert.equal(getIntervalSeekTarget(plan, 'same-time', 'distance'), null);
  const step = cue.steps[2];
  assert.equal(step.kind, 'play');
  if (step.kind === 'play') {
    const notes = getIntervalCheckpoint(plan, 2, 2).notes;
    const sounded = getIntervalPlaybackNotes(notes, step.exampleId);
    assert.equal(sounded.length, 2);
    assert.ok(sounded.every(note => note.id.startsWith('same-time-')));
  }
});

test('1.3.1.d.1 replays both pairs as one timeline before its new narration', () => {
  const plan = intervalPlans['interval-introduction'];
  const finish = plan.cues[3].steps[0];
  assert.equal(finish.kind, 'finish');
  if (finish.kind === 'finish') {
    assert.equal(finish.text, "Let's learn the names of the smallest intervals.");
    assert.equal(finish.replay, 'visible');
  }
  const notes = getIntervalCheckpoint(plan, 3, 0).notes;
  for (const columns of [20, 28]) {
    const groups = getIntervalPlaybackGroups(notes, columns);
    assert.deepEqual(groups.map(group => group.map(note => note.midi)), [[60], [64], [60, 64]]);
    assert.equal(new Set(groups.flat().map(note => note.id)).size, 4);
  }
});

test('1.3.3 keeps the same simultaneous pair while F moves below E to D sharp', () => {
  const plan = intervalPlans['minor-seconds'];
  const above = plan.cues.findIndex(cue => cue.id === 'above');
  const below = plan.cues.findIndex(cue => cue.id === 'below');
  const previous = getIntervalCheckpoint(plan, above, plan.cues[above].steps.length).notes;
  const move = getIntervalSeekTarget(plan, 'below', 'move')!;
  const before = getIntervalCheckpoint(plan, below, move.stepIndex).notes;
  assert.deepEqual(before, previous, 'the second segment must not reset pitches or columns');
  assert.deepEqual(before.map(note => note.label), ['E4', 'F4']);

  const after = getIntervalCheckpoint(plan, below, move.stepIndex + 1).notes;
  assert.deepEqual(after[0], before[0], 'E stays fixed');
  assert.deepEqual(after[1], { ...before[1], midi: 63, label: 'D#4' });
  assert.deepEqual(after.map(note => note.id), before.map(note => note.id));
  for (const cue of [plan.cues[above], plan.cues[below]]) {
    const playback = cue.steps.find(step => step.kind === 'play')!;
    assert.equal(playback.together, true);
  }
  for (const columns of [20, 28]) {
    for (const notes of [before, after]) {
      const groups = getIntervalPlaybackGroups(notes, columns);
      assert.equal(groups.length, 1, 'both notes remain in the same time column');
      assert.equal(groups[0].length, 2);
    }
  }
});

test('the lesson uses pitches throughout its teaching language', () => {
  assert.doesNotMatch(JSON.stringify(intervalPlans), /pitch steps?|semitones?/i);
  for (const plan of Object.values(intervalPlans)) {
    for (const cue of plan.cues) for (const step of cue.steps) {
      if (step.kind === 'question') {
        assert.doesNotMatch(intervalPrompt(step.question, true), /2nd/);
        assert.doesNotMatch(intervalPrompt(step.question), /pitch steps?|semitones?/i);
      }
    }
  }
});

test('only the first question of 1.3.4 introduces Now you try', () => {
  for (const [id, plan] of Object.entries(intervalPlans)) {
    const steps = plan.cues.flatMap(cue => cue.steps).filter(step => step.kind === 'question');
    for (const [index, step] of steps.entries()) {
      assert.equal(step.introduction, id === 'minor-seconds-above' && index === 0 ? 'Now you try.' : undefined);
    }
  }
  assert.match(intervalPlans['minor-seconds-above'].cues[0].prompt!, /^Now you try\. Place a note above E4/);
});

test('directional practice accepts every time column and rejects the opposite direction', () => {
  for (const [id, distance, direction] of [
    ['minor-seconds-above', 1, 'above'], ['minor-seconds-below', 1, 'below'],
    ['major-seconds-above', 2, 'above'], ['major-seconds-below', 2, 'below'],
  ] as const) {
    const practice = questions(id);
    assert.equal(practice.length, 3);
    for (const question of practice) {
      assert.equal(question.distance, distance);
      assert.equal(question.direction, direction);
      const sign = direction === 'above' ? 1 : -1;
      for (const leftPercent of [1, 20, 32, 50, 64, 99]) {
        assert.equal(isIntervalPlacementCorrect(question, { midi: question.reference.midi + sign * distance, leftPercent }), true);
        assert.equal(isIntervalPlacementCorrect(question, { midi: question.reference.midi - sign * distance, leftPercent }), false);
        assert.equal(isIntervalPlacementCorrect(question, { midi: question.reference.midi, leftPercent }), false);
      }
    }
  }
});

test('mixed practice includes two of each interval and accepts either direction for seconds', () => {
  const mixed = questions('interval-practice');
  assert.deepEqual(mixed.map(question => question.distance), [0, 1, 2, 0, 1, 2]);
  for (const question of mixed) {
    assert.equal(question.direction, 'either');
    for (const direction of [-1, 1]) for (const leftPercent of [5, 32, 64, 95]) {
      assert.equal(isIntervalPlacementCorrect(question, { midi: question.reference.midi + direction * question.distance, leftPercent }), true);
      assert.equal(isIntervalPlacementCorrect(question, { midi: question.reference.midi + direction * (question.distance + 1), leftPercent }), false);
    }
  }
});

test('answers are in the displayed gamut and spell seconds across accidentals and octave boundaries', () => {
  const examples = [
    ['minor-seconds-above', ['F4', 'C5', 'Db4']],
    ['minor-seconds-below', ['E4', 'B4', 'C4']],
    ['major-seconds-above', ['D4', 'F#4', 'A4']],
    ['major-seconds-below', ['C4', 'E4', 'G4']],
  ] as const;
  const naturalClasses: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  for (const [id, expected] of examples) {
    assert.deepEqual(questions(id).map(question => intervalAnswerPitch(question).label), expected);
  }
  for (const plan of Object.values(intervalPlans)) {
    for (const cue of plan.cues) for (const step of cue.steps) {
      if (step.kind !== 'question') continue;
      const question = step.question;
      for (const direction of question.direction === 'either' ? [-1, 1] : [question.direction === 'above' ? 1 : -1]) {
        const answer = intervalAnswerPitch(question, question.reference.midi + direction * question.distance);
        assert.ok(answer.midi >= intervalPitchRange.lowMidi && answer.midi <= intervalPitchRange.highMidi);
        assert.ok(fullRowData.some(row => row.midi === answer.midi));
        const [, letter, accidental, octave] = /^([A-G])([b#]?)(\d+)$/.exec(answer.label)!;
        const namedMidi = (Number(octave) + 1) * 12 + naturalClasses[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
        assert.equal(namedMidi, answer.midi);
      }
    }
  }
  assert.equal(displayIntervalPitch('Db4'), 'D♭4');
  assert.equal(speakIntervalPitch('F#4').trim().replace(/\s+/g, ' '), 'F sharp 4');
});

test('invalid pitch placements cannot complete a question', () => {
  const question: IntervalQuestion = { reference: { midi: 60, label: 'C4' }, distance: 1, direction: 'either' };
  for (const placement of [
    { midi: 60.5, leftPercent: 50 }, { midi: NaN, leftPercent: 50 },
    { midi: 61, leftPercent: NaN }, { midi: 61, leftPercent: Infinity },
    { midi: 61, leftPercent: -1 }, { midi: 61, leftPercent: 101 },
    { midi: intervalPitchRange.lowMidi - 1, leftPercent: 50 },
  ]) assert.equal(isIntervalPlacementCorrect(question, placement), false);
});

test('the chart renders the requested rows and merged interval-name cells at each stage', async () => {
  // Verify semantic output in Node; no browser or visual capture is involved.
  const source = await readFile(new URL('../src/IntervalReferenceChart.svelte', import.meta.url), 'utf8');
  const compiled = compile(source, { filename: 'IntervalReferenceChart.svelte', generate: 'server' }).js.code;
  const resolved = compiled.replace(/(["'])(svelte(?:\/[^"']+)?|@mlt\/lesson-kit)\1/g,
    (_match, _quote, name) => JSON.stringify(import.meta.resolve(name)));
  const { default: Chart } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`) as {
    default: Component<{ level: 0 | 1 | 2 }>;
  };
  for (const level of [0, 1, 2] as const) {
    const html = render(Chart, { props: { level } }).body;
    const distances = [...html.matchAll(/<span\b[^>]*class="distance[^"\n]*"[^>]*>(\d)<\/span>/g)].map(match => Number(match[1]));
    assert.deepEqual(distances, level === 2 ? [2, 1, 0] : level === 1 ? [1, 0] : [0]);
    assert.match(html, /Distance/);
    assert.match(html, /Interval Name/);
    assert.match(html, /aria-colspan="2"[^>]*>unison/);
    assert.equal(html.includes('minor 2nd'), level >= 1);
    assert.equal(html.includes('major 2nd'), level === 2);
    if (level > 0) assert.match(html, new RegExp(`aria-rowspan="${level}"[^>]*>2nd`));
  }
});

test('chart rows progress from unison to minor and major seconds and restore correctly on seek', () => {
  assert.deepEqual(Object.values(intervalPlans).map(plan => plan.initialChart), [0, 0, 0, 1, 1, 1, 2, 2, 2]);
  for (const [id, before, after] of [['minor-seconds', 0, 1], ['major-seconds', 1, 2]] as const) {
    const plan = intervalPlans[id];
    const target = getIntervalSeekTarget(plan, 'above', 'chart')!;
    const checkpoint = getIntervalCheckpoint(plan, target.cueIndex, target.stepIndex);
    assert.equal(checkpoint.chartLevel, before);
    assert.equal(Math.abs(checkpoint.notes[0].midi - checkpoint.notes[1].midi), after);
    assert.equal(getIntervalCheckpoint(plan, 1, 0).chartLevel, after);
  }
});

test('the chart stays hidden until 1.3.2.a.4 and remains visible at later checkpoints', () => {
  const introduction = intervalPlans['interval-introduction'];
  for (let cueIndex = 0; cueIndex < introduction.cues.length; cueIndex++) {
    const cue = introduction.cues[cueIndex];
    for (let stepIndex = 0; stepIndex <= cue.steps.length; stepIndex++) {
      assert.equal(getIntervalCheckpoint(introduction, cueIndex, stepIndex).chartVisible, false);
    }
  }
  const unison = intervalPlans.unison;
  const entrance = getIntervalSeekTarget(unison, 'same-pitch', 'chart')!;
  assert.deepEqual(entrance, { cueIndex: 0, stepIndex: 3, branch: 'normal' });
  for (let stepIndex = 0; stepIndex <= entrance.stepIndex; stepIndex++) {
    assert.equal(getIntervalCheckpoint(unison, 0, stepIndex).chartVisible, false);
  }
  assert.equal(getIntervalCheckpoint(unison, 0, entrance.stepIndex + 1).chartVisible, true);
  for (let cueIndex = 1; cueIndex < unison.cues.length; cueIndex++) {
    assert.equal(getIntervalCheckpoint(unison, cueIndex, 0).chartVisible, true);
  }
  for (const [id, plan] of Object.entries(intervalPlans)) {
    if (id === 'interval-introduction' || id === 'unison') continue;
    assert.equal(getIntervalCheckpoint(plan, 0, 0).chartVisible, true, id);
  }
});

test('retry and correct checkpoints recreate the question while later replay includes prior answers', () => {
  const plan = intervalPlans['minor-seconds-above'];
  for (const branch of ['retry', 'correct'] as const) {
    const target = getIntervalSeekTarget(plan, 'question-2', branch)!;
    assert.deepEqual(target, { cueIndex: 1, stepIndex: 0, branch });
    assert.equal(getIntervalCheckpoint(plan, target.cueIndex, target.stepIndex).completed.length, 1);
  }
  assert.equal(getIntervalCheckpoint(plan, 3, 0).completed.length, 3);
  assert.equal(getIntervalSeekTarget(plan, 'question-1', 'missing'), null);
  assert.equal(getIntervalSeekTarget(plan, 'missing'), null);
  for (const plan of Object.values(intervalPlans)) {
    for (const cue of plan.cues) for (const step of cue.steps) {
      const target = getIntervalSeekTarget(plan, cue.id, step.id)!;
      const checkpoint = getIntervalCheckpoint(plan, target.cueIndex, target.stepIndex);
      if (step.kind === 'move') assert.equal(checkpoint.notes.length, 2);
      if (step.kind === 'play') assert.equal(getIntervalPlaybackNotes(checkpoint.notes, step.exampleId).length, 2);
    }
  }
});
