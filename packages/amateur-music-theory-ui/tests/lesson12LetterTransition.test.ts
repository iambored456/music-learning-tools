import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { fullRowData } from '@mlt/pitch-data';
import { calculateLessonGridLayout } from '@mlt/lesson-kit';
import { lesson12LegendColumns } from '../src/lesson12Grid';

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const names = ['runLetterNames', 'runLetterCycle', 'prepareLetterCycleGrid', 'cancelGridMotion',
  'waitForGridMask', 'gridMaskArrived', 'gridSlideArrived', 'slideDisplayNotesOut',
  'waitForNoteMotion', 'cancelNoteMotion', 'noteMotionArrived'];
const declarations = names.map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`);
  return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function flush() { for (let i = 0; i < 80; i++) await Promise.resolve(); }

function harness() {
  const events: string[] = [];
  const e: any = {
    sequenceToken: 1, seeking: false, displayNotes: [],
    naturalPlacementQuestions: ['D4', 'F4', 'B3'].map(toneNote => ({ toneNote })),
    pendingNoteMotion: new Set(), resolveNoteMotion: null,
    gridVerticalShift: 0, gridMaskInstant: true, gridMaskVersion: 0, gridSlideVersion: 0,
    resolveGridMask: null, resolveGridSlide: null,
    letterRangeMinMidi: 57, letterRangeMaxMidi: 67, letterLayoutMaxMidi: 72, displayRowCount: 11, cellWidth: 20,
    sourceRowByTone: new Map(fullRowData.map(row => [row.toneNote, row])),
    selectPitchRows: (min: number, max: number) => fullRowData.filter(row => row.midi! >= min && row.midi! <= max),
    isCurrentSequence: (token: number) => token === e.sequenceToken,
    waitForPlayback: async (token: number) => token === e.sequenceToken,
    waitMs: async (_ms: number, token: number) => token === e.sequenceToken,
    mark: (cue: string, action: string) => events.push(`mark:${cue}/${action}`),
    say: async () => {}, playTone: async () => {}, runLetterPositions: async () => {},
    askPlacement: async (question: any, _token: number, options: any) => {
      e.displayNotes.push({ id: question.toneNote, toneNote: question.toneNote, leftPercent: options.leftPercent });
    },
    playSequence: async () => events.push('replay'),
    completeLessonExercise: async (options: any) => { await options.replay(); return options.isCurrent(); },
    askChoice: async (_prompt: string, _spoken: string, options: any[], _token: number, _success: string, placement: any) => {
      events.push('question');
      const correct = options.find(option => option.correct);
      const index = e.displayNotes.length;
      e.displayNotes.push(
        { id: `reference-${index}`, toneNote: placement.referenceToneNote, leftPercent: placement.leftPercent },
        { id: `answer-${index}`, toneNote: correct.toneNote, leftPercent: placement.leftPercent },
      );
      e.questionNote = null;
    },
    inspector: { status: (status: string) => events.push(`status:${status}`) },
    onComplete: () => events.push('complete'),
  };
  runInNewContext(javascript, e);
  return { e, events };
}

test('final playback and all three note departures finish before the grid shifts and advances', async () => {
  const h = harness();
  h.e.letterRangeMinMidi = 60; // An Inspector jump back from numbered octaves.
  const run = h.e.runLetterNames(1);
  await flush();
  assert.equal(h.e.letterRangeMinMidi, 57);
  assert.ok(h.events.includes('replay'));
  assert.equal(h.e.gridVerticalShift, 0);
  assert.ok(h.e.displayNotes.every((note: any) => note.slideOut && !note.slideIn));
  assert.equal(h.e.pendingNoteMotion.size, 3);
  h.e.noteMotionArrived('D4'); h.e.noteMotionArrived('F4');
  await flush();
  assert.equal(h.e.gridVerticalShift, 0, 'the grid waits for the last note');
  assert.ok(!h.events.includes('complete'));
  h.e.noteMotionArrived('B3');
  await flush();
  assert.equal(h.e.displayNotes.length, 0);
  assert.equal(h.e.gridVerticalShift, 50);
  assert.equal(h.e.gridMaskInstant, false);
  assert.ok(!h.events.includes('complete'));
  h.e.gridSlideArrived(h.e.gridSlideVersion - 1, 1);
  await flush();
  assert.ok(!h.events.includes('complete'), 'stale arrivals cannot advance');
  h.e.gridSlideArrived(h.e.gridSlideVersion, 1);
  await run;
  assert.equal(h.events.at(-1), 'complete');
});

test('the retained grid aligns with the expanded grid at narrow and wide sizes', async () => {
  for (const [width, height, columns] of [[360, 600, 20], [900, 700, 28]]) {
    const before = calculateLessonGridLayout({ width, height, columns, legendColumns: lesson12LegendColumns, rows: 11, layoutRows: 25 });
    const after = calculateLessonGridLayout({ width, height, columns, legendColumns: lesson12LegendColumns, rows: 16, layoutRows: 25 });
    const h = harness();
    h.e.cellWidth = before.cellWidth; h.e.seeking = true;
    await h.e.prepareLetterCycleGrid(1);
    const oldTop = (height - before.height) / 2 + h.e.gridVerticalShift;
    const newTop = (height - after.height) / 2 + 5 * after.cellWidth;
    assert.equal(before.width, after.width);
    assert.equal(before.cellWidth, after.cellWidth);
    assert.ok(Math.abs(oldTop - newTop) < 0.000001);
    assert.ok(Math.abs(oldTop + before.height - ((height - after.height) / 2 + after.height)) < 0.000001);
  }
  const scene = await readFile(new URL('../src/PitchLesson12Scene.svelte', import.meta.url), 'utf8');
  assert.match(scene, /\['letter-names', 'letter-cycle', 'octaves', 'octave-numbers', 'accidentals'\]\.includes\(currentSection.id\)/);
  assert.match(scene, /\? 'pitch-name-sequence'/);
  assert.match(scene, /\{#key sectionKey\}/);
});

test('the next section resets the offset and waits for the upward reveal before questions', async () => {
  const h = harness(); h.e.gridVerticalShift = 50;
  h.e.letterRangeMinMidi = 60;
  const run = h.e.runLetterCycle(1);
  await flush();
  assert.equal(h.e.letterRangeMinMidi, 57);
  assert.equal(h.e.gridVerticalShift, 0);
  assert.equal(h.e.letterRangeMaxMidi, 72);
  assert.equal(h.e.gridMaskInstant, false);
  assert.equal(h.e.letterGridRevealing, true);
  assert.ok(!h.events.includes('question'));
  h.e.gridMaskArrived(h.e.gridMaskVersion, 1);
  await flush();
  assert.equal(h.e.letterGridRevealing, false, 'clear clipping before notes slide across the screen');
  assert.equal(h.e.pendingNoteMotion.size, 6);
  assert.ok(h.e.displayNotes.every((note: any) => note.slideOut));
  assert.ok(!h.events.includes('complete'));
  const ids = Array.from(h.e.pendingNoteMotion) as string[];
  ids.slice(0, -1).forEach(id => h.e.noteMotionArrived(id));
  await flush();
  assert.ok(!h.events.includes('complete'), 'all six notes must depart before Octaves begins');
  h.e.noteMotionArrived(ids.at(-1));
  await run;
  assert.equal(h.events.filter(event => event === 'question').length, 3);
  assert.equal(h.events.at(-1), 'complete');
});

test('canceling a note exit, grid shift, or reveal cannot advance the old sequence', async () => {
  for (const phase of ['exit', 'slide', 'reveal', 'cycle-exit']) {
    const h = harness();
    const run = phase === 'reveal' || phase === 'cycle-exit' ? h.e.runLetterCycle(1) : h.e.runLetterNames(1);
    await flush();
    if (phase === 'cycle-exit') {
      h.e.gridMaskArrived(h.e.gridMaskVersion, 1);
      await flush();
      assert.equal(h.e.pendingNoteMotion.size, 6);
    }
    if (phase === 'slide') {
      ['D4', 'F4', 'B3'].forEach(id => h.e.noteMotionArrived(id));
      await flush();
      assert.equal(h.e.gridVerticalShift, 50);
    }
    const slideVersion = h.e.gridSlideVersion, maskVersion = h.e.gridMaskVersion;
    h.e.sequenceToken++;
    h.e.cancelNoteMotion();
    h.e.cancelGridMotion();
    ['D4', 'F4', 'B3'].forEach(id => h.e.noteMotionArrived(id));
    h.e.gridSlideArrived(slideVersion, 1); h.e.gridMaskArrived(maskVersion, 1);
    await run;
    assert.ok(!h.events.includes('complete'));
    assert.equal(h.events.filter(event => event === 'question').length, phase === 'cycle-exit' ? 3 : 0);
  }
});

test('the repeating-letter and Octaves grids keep the same geometry even when height limits cell size', () => {
  const declaration = script.statements.filter(ts.isVariableStatement)
    .find(statement => statement.declarationList.declarations.some(node => node.name.getText(script) === 'layoutRowCount'));
  assert.ok(declaration);
  const layoutScript = ts.transpileModule(`${declaration.getText(script)}\nglobalThis.result = layoutRowCount;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [width, height, columns] of [[360, 600, 20], [900, 700, 28], [1440, 480, 28]]) {
    const layouts = ['letter-cycle', 'octaves'].map(id => {
      const e: any = { section: { id }, gridKind: id === 'octaves' ? 'natural-a' : 'letter-seven',
        letterRangeMinMidi: 57, letterLayoutMaxMidi: 72, displayRowCount: 16,
        $derived: (value: number) => value, selectPitchRows: harness().e.selectPitchRows };
      runInNewContext(layoutScript, e);
      return calculateLessonGridLayout({ width, height, columns, legendColumns: lesson12LegendColumns, rows: 16, layoutRows: e.result });
    });
    assert.deepEqual(layouts[0], layouts[1]);
  }
});

test('seeking past the note exit restores an empty grid without awaiting obsolete motion', async () => {
  const h = harness();
  h.e.seeking = true;
  h.e.displayNotes = ['D4', 'F4', 'B3'].map(id => ({ id }));
  await h.e.slideDisplayNotesOut(1);
  await h.e.prepareLetterCycleGrid(1);
  assert.equal(h.e.displayNotes.length, 0);
  assert.equal(h.e.pendingNoteMotion.size, 0);
  assert.equal(h.e.gridVerticalShift, 50);
});
