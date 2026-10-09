import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { fullRowData } from '@mlt/pitch-data';
import { intervalPlans, getIntervalCheckpoint, getIntervalSeekTarget, type IntervalNote } from '../src/lesson13Intervals';

// Check the actual scene geometry without starting a browser.
const source = await readFile(new URL('../src/PitchLesson13Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const functions = ['rowCenter', 'columnCenter', 'coincidentNotes', 'noteMargin', 'noteMovementOffset'];
const declarations = functions.map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`);
  return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

function harness(before: IntervalNote[], after: IntervalNote[], columns: number) {
  const cellWidth = 30;
  const legendColumns = 6;
  const viewportWidth = cellWidth * (columns + legendColumns);
  const viewportHeight = 780;
  const context = {
    notes: after, movingFromNotes: before as IntervalNote[] | null,
    rowByMidi: new Map(fullRowData.map((row, index) => [row.midi, { ...row, index }])),
    firstRow: fullRowData.findIndex(row => row.midi === 81), rowCount: 25,
    cellWidth, legendColumns, viewportWidth, viewportHeight, columns,
  };
  const helpers = runInNewContext(`${javascript}\n({ rowCenter, columnCenter, noteMargin, noteMovementOffset });`, context);
  const position = (note: IntervalNote, items: IntervalNote[]) => ({
    x: helpers.columnCenter(note.leftPercent) / 100 * (viewportWidth - cellWidth * legendColumns) + helpers.noteMargin(note, items),
    y: helpers.rowCenter(note.midi) / 100 * viewportHeight,
  });
  return { context, helpers, position };
}

for (const columns of [20, 28]) {
  test(`F moves smoothly past the stationary E to D sharp with ${columns} columns`, () => {
    const plan = intervalPlans['minor-seconds'];
    const move = getIntervalSeekTarget(plan, 'below', 'move')!;
    const before = getIntervalCheckpoint(plan, move.cueIndex, move.stepIndex).notes;
    const after = getIntervalCheckpoint(plan, move.cueIndex, move.stepIndex + 1).notes;
    const h = harness(before, after, columns);
    const referenceOffset = h.helpers.noteMovementOffset(after[0]);
    assert.equal(referenceOffset.x, 0);
    assert.equal(referenceOffset.y, 0, 'E must stay stationary throughout movement');
    const previous = h.position(before[1], before);
    const destination = h.position(after[1], after);
    const offset = h.helpers.noteMovementOffset(after[1]);
    assert.equal(offset.x, 0, 'F must not jump to a different column');
    assert.equal(destination.x, previous.x);
    assert.ok(Math.abs(destination.y + offset.y - previous.y) < 1e-8,
      'the descending animation must begin at F');
    assert.ok(destination.y > previous.y, 'D sharp is below F');
    const reference = h.position(after[0], after);
    assert.ok(previous.y < reference.y && destination.y > reference.y,
      'the moving note crosses E before settling below it');
    h.context.movingFromNotes = null;
    assert.equal(h.helpers.noteMovementOffset(after[1]).y, 0);
  });

  test(`interval movement starts at both notes' previous positions with ${columns} columns`, () => {
    for (const [midi, target, together] of [[64, 65, true], [60, 62, true], [65, 64, false], [62, 60, false]] as const) {
      const before: IntervalNote[] = [
        { id: 'reference', label: 'reference', midi, leftPercent: together ? 48 : 32 },
        { id: 'answer', label: 'answer', midi, leftPercent: together ? 48 : 64 },
      ];
      const after = [before[0], { ...before[1], midi: target }];
      const h = harness(before, after, columns);
      for (let index = 0; index < after.length; index++) {
        const previous = h.position(before[index], before);
        const destination = h.position(after[index], after);
        const offset = h.helpers.noteMovementOffset(after[index]);
        assert.ok(Math.abs(destination.x + offset.x - previous.x) < 1e-8,
          `${after[index].id} must not snap sideways as coincident notes separate`);
        assert.ok(Math.abs(destination.y + offset.y - previous.y) < 1e-8,
          `${after[index].id} must begin at its previous pitch, ascending or descending`);
      }
      if (together) {
        assert.ok(h.helpers.noteMovementOffset(after[0]).x < 0, 'the reference eases out of its old left offset');
        assert.ok(h.helpers.noteMovementOffset(after[1]).x > 0, 'the answer eases out of its old right offset');
      }
      h.context.movingFromNotes = null;
      for (const note of after) {
        const offset = h.helpers.noteMovementOffset(note);
        assert.equal(offset.x, 0, 'completed or reset movement leaves no horizontal offset');
        assert.equal(offset.y, 0, 'completed or reset movement leaves no vertical offset');
      }
    }
  });
}
