import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { lessonPacing } from '@mlt/lesson-kit';
import { lesson12LegendColumns } from '../src/lesson12Grid';

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const declarations = ['askAdjacentNote', 'askChoice', 'handleChoice', 'waitForResponse', 'resolveResponse',
  'waitForNoteMotion', 'noteMotionArrived', 'cancelNoteMotion', 'slideDisplayNotesOut', 'slideReferenceIntoPractice'].map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`); return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function flush() { for (let i = 0; i < 40; i++) await Promise.resolve(); }
const questions = [
  ['after-B4', 'B4', 'C5', 'C4', 'above'], ['after-G4', 'G4', 'A4', 'A5', 'above'],
  ['below-C6', 'C6', 'B5', 'B6', 'below'], ['below-D4', 'D4', 'C4', 'C5', 'below'],
] as const;

function harness(columns = 28, seekTarget?: string) {
  const e: any = {
    displayNotes: [], questionNote: null, sequenceToken: 1, seeking: Boolean(seekTarget), isPlaying: true,
    layoutGridColumnCount: columns, lessonPacing, pendingRetryActionId: null, comparisonCycleGeneration: 0,
    cellWidth: 20, viewportWidth: (columns + lesson12LegendColumns) * 20, legendWidth: lesson12LegendColumns * 20,
    activeCueId: null, activeActionId: null,
    responseResolve: null, pendingNoteMotion: new Set(), resolveNoteMotion: null,
    isCurrentSequence: (token: number) => token === e.sequenceToken,
    waitMs: async (_ms: number, token: number) => token === e.sequenceToken,
    waitForPlayback: async (token: number) => token === e.sequenceToken,
    mark: (cue: string, action: string) => {
      if (e.seeking && action !== seekTarget) return;
      e.seeking = false; e.activeCueId = cue; e.activeActionId = action;
    },
    markRetry() {}, restoreQuestionMark() {}, stopVoice() {}, revealOctaveComparisonLabels() {},
    questionNarration: { submit() {}, wait() {} }, say: async () => {}, repeatPrompt: async () => {},
    startQuestionNarration: async (_token: number, speak: any, unlock: any) => { unlock(); await speak(() => true); },
  };
  runInNewContext(javascript, e);
  return e;
}

test('all four correct pairs accumulate left to right and fit both narrow and wide grids', async () => {
  for (const columns of [20, 28]) {
    const e = harness(columns);
    for (const [index, question] of questions.entries()) {
      const earlier = Array.from(e.displayNotes, (note: any) => ({ ...note }));
      const run = e.askAdjacentNote(...question, 1); await flush();
      assert.equal(e.displayNotes.length, index * 2 + 1);
      assert.equal(e.questionNote.label, '?');
      assert.deepEqual(Array.from(e.displayNotes.slice(0, index * 2), (note: any) => ({ ...note })), earlier);
      const referenceColumn = e.displayNotes.at(-1).leftPercent * columns / 100;
      assert.ok(referenceColumn >= 2 && referenceColumn + 3 <= columns);
      if (index) assert.ok(referenceColumn > earlier.at(-1).leftPercent * columns / 100 + 2);
      await e.handleChoice(e.choiceOptions.find((option: any) => option.correct)); await run;
      assert.equal(e.displayNotes.length, (index + 1) * 2);
      assert.equal(e.questionNote, null);
      assert.equal(e.displayNotes.at(-2).label, question[1]);
      assert.equal(e.displayNotes.at(-1).label, question[2]);
      assert.equal(e.displayNotes.at(-1).columnOffset, 2);
    }
    const exit = e.slideDisplayNotesOut(1); await flush();
    const ids = Array.from(e.pendingNoteMotion);
    assert.equal(ids.length, 8);
    assert.ok(e.displayNotes.every((note: any) => note.slideOut));
    ids.slice(0, -1).forEach(id => e.noteMotionArrived(id)); await flush();
    assert.equal(e.displayNotes.length, 8, 'wait for every departure before clearing the results');
    e.noteMotionArrived(ids.at(-1)); await exit;
    assert.equal(e.displayNotes.length, 0);
  }
});

test('wrong answers keep earlier correct results and the current question mark', async () => {
  const e = harness();
  const first = e.askAdjacentNote(...questions[0], 1); await flush();
  await e.handleChoice(e.choiceOptions.find((option: any) => option.correct)); await first;
  const second = e.askAdjacentNote(...questions[1], 1); await flush();
  const before = Array.from(e.displayNotes, (note: any) => ({ ...note }));
  await e.handleChoice(e.choiceOptions.find((option: any) => !option.correct));
  assert.deepEqual(Array.from(e.displayNotes, (note: any) => ({ ...note })), before);
  assert.equal(e.questionNote.label, '?');
  assert.equal(e.answerLocked, false);
  await e.handleChoice(e.choiceOptions.find((option: any) => option.correct)); await second;
  assert.equal(e.displayNotes.length, 4);
});

test('Inspector jumps restore earlier pairs and canceled questions cannot append stale results', async () => {
  const e = harness(20, 'below-C6');
  await e.askAdjacentNote(...questions[0], 1);
  await e.askAdjacentNote(...questions[1], 1);
  assert.equal(e.displayNotes.length, 4);
  assert.deepEqual(Array.from(e.displayNotes, (note: any) => note.label), ['B4', 'C5', 'G4', 'A4']);
  const current = e.askAdjacentNote(...questions[2], 1); await flush();
  assert.equal(e.displayNotes.length, 5);
  assert.equal(e.questionNote.label, '?');
  e.sequenceToken++;
  e.resolveResponse(); await current;
  assert.equal(e.displayNotes.length, 5, 'cancellation cannot add the unfinished answer');
});

test('the boundary B4 slides into the first question without being replaced or duplicated', async () => {
  for (const columns of [20, 28]) {
    const e = harness(columns);
    const b = { id: 'B4-2', toneNote: 'B4', label: 'B4', leftPercent: 50 };
    e.displayNotes = [{ id: 'G4-0', toneNote: 'G4', label: 'G4', leftPercent: 22 }, b,
      { id: 'C5-3', toneNote: 'C5', label: 'C5', leftPercent: 72 }];
    const run = e.askAdjacentNote(...questions[0], 1, b); await flush();
    assert.equal(e.displayNotes.length, 1, 'clear the other boundary examples');
    assert.equal(e.displayNotes[0].id, b.id, 'keep the original keyed note mounted');
    assert.equal(e.displayNotes[0].leftPercent, 50, 'leave the resting position unchanged during the slide');
    assert.equal(e.questionNote, null, 'wait for arrival before displaying the question');
    const destination = e.displayNotes[0].leftPercent / 100 * (e.viewportWidth - e.legendWidth)
      + e.displayNotes[0].columnShift * e.cellWidth;
    const targetPercent = 2 * 100 / columns;
    assert.ok(Math.abs(destination - targetPercent / 100 * (e.viewportWidth - e.legendWidth)) < 1e-8);
    await flush(); assert.equal(e.questionNote, null, 'the pending slide cannot advance on its own');
    e.noteMotionArrived(b.id); await flush();
    assert.equal(e.displayNotes[0].id, b.id);
    assert.equal(e.displayNotes[0].leftPercent, targetPercent);
    assert.equal(e.displayNotes[0].columnShift, undefined, 'rebase before future accumulated-note exits');
    assert.equal(e.questionNote.label, '?');
    await e.handleChoice(e.choiceOptions.find((option: any) => option.correct)); await run;
    assert.equal(e.displayNotes.length, 2);
    assert.equal(e.displayNotes[0].id, b.id);
    const second = e.askAdjacentNote(...questions[1], 1); await flush();
    assert.equal(e.displayNotes.length, 3);
    assert.ok(e.displayNotes.at(-1).leftPercent > targetPercent);
    await e.handleChoice(e.choiceOptions.find((option: any) => option.correct)); await second;
    assert.equal(e.displayNotes.length, 4);
  }
});

test('canceling the carried B4 slide cannot rebase restored notes or open an old question', async () => {
  const e = harness(); const b = { id: 'B4-2', toneNote: 'B4', label: 'B4', leftPercent: 50 };
  e.displayNotes = [b];
  const run = e.askAdjacentNote(...questions[0], 1, b); await flush();
  e.sequenceToken++; e.cancelNoteMotion();
  const restored = [{ id: 'restored', toneNote: 'D4', label: 'D4', leftPercent: 30 }];
  e.displayNotes = restored;
  e.noteMotionArrived(b.id); await run;
  assert.equal(e.displayNotes, restored);
  assert.equal(e.questionNote, null);
});

test('Inspector restoration places the carried B4 immediately and retains it as the first answered pair', async () => {
  const e = harness(20, 'below-C6');
  const b = { id: 'B4-2', toneNote: 'B4', label: 'B4', leftPercent: 50 };
  e.displayNotes = [b];
  await e.askAdjacentNote(...questions[0], 1, b);
  assert.equal(e.displayNotes.length, 2);
  assert.equal(e.displayNotes[0].id, b.id);
  assert.equal(e.displayNotes[0].leftPercent, 10);
  assert.equal(e.displayNotes[0].columnShift, undefined);
  assert.equal(e.pendingNoteMotion.size, 0);
  assert.deepEqual(Array.from(e.displayNotes, (note: any) => note.label), ['B4', 'C5']);
});
