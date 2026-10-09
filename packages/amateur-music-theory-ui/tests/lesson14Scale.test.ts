import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import type { Component } from 'svelte';
import { fullRowData } from '@mlt/pitch-data';
import { snapLessonPlacement } from '@mlt/lesson-kit';
import { lessonDefinitions } from '../src/lessons';
import {
  scalePlans, diatonicMidi, fDiatonicMidi, diatonicPattern, majorSecondPairs, minorSecondPairs,
  createScaleNotes, scaleColumn, evaluateScalePair, remainingScalePairs,
  isScalePlacementCorrect, getScaleCheckpoint, getScaleSeekTarget, getScaleBubbleCheckpoint,
} from '../src/lesson14Scale';

test('Lesson 1.4 registers eight Sections and every action is seekable', () => {
  const lesson = lessonDefinitions.find(lesson => lesson.code === '1.4')!;
  assert.equal(lesson.title, 'Building the Diatonic Scale');
  assert.deepEqual(lesson.sections.map(section => section.code), Array.from({ length: 8 }, (_, index) => `1.4.${index + 1}`));
  assert.deepEqual(lesson.sections.map(section => section.id), Object.keys(scalePlans));
  for (const plan of Object.values(scalePlans)) {
    assert.equal(new Set(plan.cues.map(cue => cue.id)).size, plan.cues.length);
    for (const cue of plan.cues) {
      assert.equal(new Set(cue.steps.map(step => step.id)).size, cue.steps.length);
      assert.deepEqual(cue.actions!.map(action => action.id), cue.steps.map(step => step.id));
      for (const action of cue.actions!) assert.ok(getScaleSeekTarget(plan, cue.id, action.id));
    }
    assert.equal(getScaleSeekTarget(plan, 'missing'), null);
    assert.equal(getScaleSeekTarget(plan, plan.cues[0].id, 'missing'), null);
  }
});

test('1.4.3–1.4.7 use C4–C5 without octave labels, while the repetition keeps its full range', () => {
  for (const id of ['scale-intervals', 'find-major-seconds', 'find-minor-seconds', 'scale-pattern', 'build-scale']) {
    assert.equal(scalePlans[id].lowMidi, 60);
    assert.equal(scalePlans[id].highMidi ?? 72, 72);
    assert.equal(scalePlans[id].hideOctaveLabels, true);
  }
  assert.equal(scalePlans['seven-notes'].lowMidi, 48);
  assert.ok(!scalePlans['seven-notes'].hideOctaveLabels);
});

test('F4–F5 uses B♭ and the same pattern, and restores the expanded range after seeking', () => {
  const notes = createScaleNotes(8, 0, 'F');
  assert.deepEqual(notes.map(note => note.label), ['F4', 'G4', 'A4', 'B♭4', 'C5', 'D5', 'E5', 'F5']);
  assert.deepEqual(notes.map(note => note.midi), fDiatonicMidi);
  assert.deepEqual(notes.slice(1).map((note, index) => note.midi - notes[index].midi), diatonicPattern);
  const plan = scalePlans['build-scale-f'];
  assert.equal(plan.lowMidi, 60);
  assert.equal(plan.highMidi, 77);
  assert.equal(getScaleCheckpoint(plan, 0, 0).upperExpanded, false);
  assert.equal(getScaleCheckpoint(plan, 0, 1).upperExpanded, true);
  const intro = plan.cues[0].steps.find(step => step.kind === 'say');
  assert.equal(intro?.kind === 'say' && intro.text, 'Using the interval pattern, create a Diatonic Scale starting on F.');
  for (let cueIndex = 1; cueIndex <= 8; cueIndex++) {
    const state = getScaleCheckpoint(plan, cueIndex, 0);
    assert.equal(state.upperExpanded, true);
    assert.deepEqual(state.notes.map(note => note.midi), fDiatonicMidi.slice(0, cueIndex));
    assert.deepEqual(state.found, Array.from({ length: cueIndex - 1 }, (_, index) => index));
    assert.equal(state.patternVisible, true);
  }
  for (const columns of [20, 28]) for (let index = 1; index < 8; index++) {
    assert.ok(isScalePlacementCorrect(index, fDiatonicMidi[index], scaleColumn(index, columns), columns, fDiatonicMidi));
    assert.ok(!isScalePlacementCorrect(index, fDiatonicMidi[index], scaleColumn(index, columns) - 1, columns, fDiatonicMidi));
  }
  assert.ok(!isScalePlacementCorrect(3, 71, scaleColumn(3, 20), 20, fDiatonicMidi), 'B natural cannot replace B♭');
});

test('C4 through C5 has seven distinct pitch classes and the requested interval pattern', () => {
  const notes = createScaleNotes();
  assert.deepEqual(notes.map(note => note.label), ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
  assert.equal(new Set(notes.map(note => note.midi % 12)).size, 7);
  assert.deepEqual(notes.slice(1).map((note, index) => note.midi - notes[index].midi), diatonicPattern);
  assert.equal(diatonicPattern.reduce<number>((sum, distance) => sum + distance, 0), 12);
  for (const note of [...notes, ...createScaleNotes(7, -1)]) {
    const row = fullRowData.find(row => row.midi === note.midi);
    assert.ok(row?.hex && row.frequency, `${note.label} must resolve to canonical pitch colour and audio`);
  }
});

test('the opening starts empty, stacks the requested text, and carries its final notes into 1.4.2', () => {
  const plan = scalePlans['scale-introduction'];
  const expected = ['A scale, put simply, is a group of notes.',
    'There are many scales throughout human culture.',
    'The Diatonic Scale is a foundation of Western music.'];
  assert.equal(plan.initial.notes.length, 0);
  for (const [ci, cue] of plan.cues.entries()) {
    assert.ok(!cue.steps.some(step => step.kind === 'play'), 'the opening should only narrate');
    const narration = cue.steps.findIndex(step => step.kind === 'say');
    const step = cue.steps[narration];
    assert.equal(step.kind, 'say');
    if (step.kind !== 'say') continue;
    assert.equal(step.text, expected[ci]);
    assert.equal(step.stackBubble, true);
    const checkpoint = getScaleCheckpoint(plan, ci, narration);
    assert.equal(checkpoint.notes.length, ci === 2 ? 8 : 0);
    assert.deepEqual(getScaleBubbleCheckpoint(plan, ci, narration + 1), {
      upper: ci === 0 ? '' : expected[ci - 1], current: expected[ci],
    });
  }
  const entrance = plan.cues[2].steps[0];
  assert.ok(entrance.kind === 'setup' && entrance.slideIn, 'the complete scale slides on in 1.4.1.c');
  assert.deepEqual(getScaleCheckpoint(plan, 2, plan.cues[2].steps.length).notes, scalePlans['seven-notes'].initial.notes);
});

test('either order accepts exactly five major pairs and two minor pairs, including the final C', () => {
  for (let first = 0; first < 8; first++) for (let second = 0; second < 8; second++) {
    for (const distance of [1, 2] as const) {
      const expected = Math.abs(first - second) === 1 && Math.abs(diatonicMidi[first] - diatonicMidi[second]) === distance;
      assert.equal(evaluateScalePair(first, second, distance, []).result === 'correct', expected, `${first}, ${second}, distance ${distance}`);
    }
  }
  assert.deepEqual(remainingScalePairs(2, []), majorSecondPairs);
  assert.deepEqual(remainingScalePairs(1, []), minorSecondPairs);
  assert.equal(evaluateScalePair(7, 6, 1, []).result, 'correct');
  assert.equal(evaluateScalePair(-1, 0, 1, []).result, 'retry');
});

test('duplicate pairs cannot count again, while shared notes can form another pair', () => {
  assert.deepEqual(evaluateScalePair(1, 0, 2, [0]), { result: 'duplicate', pair: 0 });
  assert.deepEqual(evaluateScalePair(1, 2, 2, [0]), { result: 'correct', pair: 1 });
  assert.deepEqual(remainingScalePairs(2, [0]), [1, 3, 4, 5]);
  assert.deepEqual(remainingScalePairs(1, [...majorSecondPairs, 6]), [2]);
});

test('building requires the pitch and next column, including pointer-to-center conversion', () => {
  for (const columns of [20, 28]) {
    const cellWidth = 20;
    const rows = fullRowData.filter(row => typeof row.midi === 'number' && row.midi >= 57 && row.midi <= 72);
    for (let index = 1; index < 8; index++) {
      const column = scaleColumn(index, columns);
      const midi = diatonicMidi[index];
      assert.equal(isScalePlacementCorrect(index, midi, column, columns), true);
      assert.equal(isScalePlacementCorrect(index, midi, column - 1, columns), false);
      assert.equal(isScalePlacementCorrect(index, midi + 1, column, columns), false);
      const row = rows.findIndex(row => row.midi === midi);
      const snapped = snapLessonPlacement(column * cellWidth, (row + 1) * cellWidth,
        columns * cellWidth, (rows.length + 1) * cellWidth, columns, rows.length)!;
      assert.equal(snapped.column + 1, column);
      assert.equal(rows[snapped.row].midi, midi);
      assert.equal(isScalePlacementCorrect(index, rows[snapped.row].midi!, snapped.column + 1, columns), true);
      assert.equal(scaleColumn(index, columns) - scaleColumn(index - 1, columns), 2);
    }
    assert.ok(scaleColumn(0, columns) >= 1);
    assert.ok(scaleColumn(7, columns) <= columns - 1);
  }
  assert.equal(isScalePlacementCorrect(0, 60, 3, 20), false);
});

test('the octave explanation retains C5 and both repetition scales include their ending C', () => {
  const plan = scalePlans['seven-notes'];
  const seven = getScaleCheckpoint(plan, 1, 0);
  assert.equal(seven.notes.length, 8);
  const octave = getScaleCheckpoint(plan, 1, 2);
  assert.deepEqual(octave.bracket, [0, 7]);
  assert.deepEqual(octave.notes.map(note => note.midi), diatonicMidi);
  const repeat = getScaleCheckpoint(plan, 2, 2);
  assert.equal(repeat.notes.length, 16);
  assert.equal(new Set(repeat.notes.map(note => note.id)).size, 16);
  assert.deepEqual(repeat.notes.slice(0, 8).map(note => note.midi), diatonicMidi.map(midi => midi - 12));
  assert.deepEqual(repeat.notes.slice(8).map(note => note.midi), diatonicMidi);
  assert.equal(repeat.notes[7].label, 'C4');
  assert.equal(repeat.notes[7].index, 7);
  assert.equal(repeat.bracket, null);
});

test('seeking restores earlier found pairs and accepted construction notes', () => {
  const major = scalePlans['find-major-seconds'];
  assert.deepEqual(getScaleCheckpoint(major, 1, 0).found, [0]);
  assert.deepEqual(getScaleCheckpoint(major, 2, 0).found, majorSecondPairs);
  const minor = scalePlans['find-minor-seconds'];
  assert.deepEqual(minor.initial.found, majorSecondPairs);
  assert.deepEqual(getScaleCheckpoint(minor, 1, 0).found, [...majorSecondPairs, 2]);
  assert.deepEqual([...getScaleCheckpoint(minor, 2, 0).found].sort(), [0, 1, 2, 3, 4, 5, 6]);
  const build = scalePlans['build-scale'];
  for (let cueIndex = 1; cueIndex <= 8; cueIndex++) {
    const state = getScaleCheckpoint(build, cueIndex, 0);
    assert.deepEqual(state.notes.map(note => note.midi), diatonicMidi.slice(0, cueIndex));
    assert.deepEqual(state.found, Array.from({ length: cueIndex - 1 }, (_, index) => index));
    assert.equal(state.patternVisible, true);
  }
});

test('retry and correct checkpoints restore the question before demonstrating feedback', () => {
  for (const id of ['find-major-seconds', 'find-minor-seconds', 'build-scale', 'build-scale-f']) {
    const plan = scalePlans[id];
    const cueIndex = id.startsWith('build-scale') ? 4 : 1;
    const cue = plan.cues[cueIndex];
    for (const branch of ['retry', 'correct'] as const) {
      const target = getScaleSeekTarget(plan, cue.id, branch)!;
      assert.deepEqual(target, { cueIndex, stepIndex: 0, branch });
      assert.deepEqual(getScaleCheckpoint(plan, target.cueIndex, target.stepIndex), getScaleCheckpoint(plan, cueIndex, 0));
    }
  }
});

test('every playback checkpoint has its complete visible example in range', () => {
  for (const plan of Object.values(scalePlans)) for (const [ci, cue] of plan.cues.entries()) {
    for (const [si, step] of cue.steps.entries()) {
      const state = getScaleCheckpoint(plan, ci, si);
      for (const note of state.notes) assert.ok(note.midi >= plan.lowMidi && note.midi <= (plan.highMidi ?? 72));
      if (step.kind === 'play') for (const index of step.indices) assert.ok(state.notes[index], `${cue.id}/${step.id}: note ${index}`);
    }
  }
});

test('the completed scale plays before the final celebration', () => {
  for (const id of ['build-scale', 'build-scale-f']) {
    const steps = scalePlans[id].cues.at(-1)!.steps;
    assert.equal(steps[0].kind, 'play');
    assert.equal(steps[1].kind, 'finish');
    assert.equal(steps[1].kind === 'finish' && steps[1].text, 'You did it! You built a diatonic scale!');
  }
});

test('the pattern renders all seven distances and marks only the current interval', async () => {
  const source = await readFile(new URL('../src/ScaleIntervalPattern.svelte', import.meta.url), 'utf8');
  const compiled = compile(source, { filename: 'ScaleIntervalPattern.svelte', generate: 'server' }).js.code;
  const resolved = compiled.replace(/(["'])(svelte(?:\/[^"']+)?|@mlt\/lesson-kit|\.\/lesson14Scale)\1/g,
    (_match, _quote, name) => JSON.stringify(name === './lesson14Scale'
      ? new URL('../src/lesson14Scale.ts', import.meta.url).href : import.meta.resolve(name)));
  const { default: Pattern } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`) as {
    default: Component<{ activeIndex: number | null }>;
  };
  for (const activeIndex of [null, 0, 2, 6]) {
    const html = render(Pattern, { props: { activeIndex } }).body;
    assert.deepEqual([...html.matchAll(/>(\+[12])<\/li>/g)].map(match => match[1]), diatonicPattern.map(distance => `+${distance}`));
    assert.equal((html.match(/aria-current="step"/g) ?? []).length, activeIndex === null ? 0 : 1);
    assert.match(html, /Minor second, 1 pitch/);
    assert.match(html, /Major second, 2 pitches/);
  }
});
