import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { calculateLessonGridLayout } from '@mlt/lesson-kit';
import { scaleOpeningGridGeometry, scaleUpperGridGeometry } from '../src/lesson14OpeningGrid';

const source = await readFile(new URL('../src/PitchLesson14Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const functions = ['expandOpeningGrid', 'expandUpperGrid'].map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node);
  return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(functions, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

test('the cropped grid moves upward, then expands only its bottom at wide and narrow sizes', () => {
  for (const [width, height, columns] of [[900, 670, 28], [300, 400, 20]]) {
    const layout = calculateLessonGridLayout({ width, height, columns, rows: 25, legendColumns: 6 });
    const position = (shift: number, expansion: number) => {
      const geometry = scaleOpeningGridGeometry(layout.cellWidth, shift, expansion);
      const top = (height - geometry.height) / 2 + geometry.y;
      return { top, bottom: top + geometry.height, ...geometry };
    };
    const start = position(0, 0);
    const shifted = position(1, 0);
    const end = position(1, 1);
    assert.ok(shifted.top < start.top);
    assert.equal(shifted.height, start.height);
    assert.ok(Math.abs(end.height - layout.height) < 1e-8);
    for (const progress of [0, 0.1, 0.5, 0.9, 1]) {
      const current = position(1, progress);
      assert.ok(Math.abs(current.top - shifted.top) < 1e-8, 'the upper edge stays fixed while the bottom expands');
      assert.ok(current.bottom >= shifted.bottom && current.bottom <= end.bottom + 1e-8);
      // Existing pitches retain the same row positions on the unchanged union canvas.
      const c4 = current.top + 13 * layout.cellWidth;
      assert.ok(Math.abs(c4 - (shifted.top + 13 * layout.cellWidth)) < 1e-8);
    }
  }
});

test('the F grid moves down, then expands only its top while existing pitches stay fixed', () => {
  for (const [width, height, columns] of [[900, 670, 28], [300, 400, 20]]) {
    const layout = calculateLessonGridLayout({ width, height, columns, rows: 18, legendColumns: 6 });
    const position = (shift: number, expansion: number) => {
      const geometry = scaleUpperGridGeometry(layout.cellWidth, shift, expansion);
      const top = (height - geometry.height) / 2 + geometry.y;
      return { ...geometry, top, bottom: top + geometry.height };
    };
    const start = position(0, 0);
    const shifted = position(1, 0);
    assert.ok(shifted.top > start.top);
    assert.equal(shifted.height, start.height);
    for (const progress of [0, 0.1, 0.5, 0.9, 1]) {
      const current = position(1, progress);
      assert.ok(Math.abs(current.bottom - shifted.bottom) < 1e-8, 'lower edge remains fixed');
      assert.ok(current.top <= shifted.top);
      const c4 = current.top + current.fieldY + 18 * layout.cellWidth;
      assert.ok(Math.abs(c4 - (shifted.top + shifted.fieldY + 18 * layout.cellWidth)) < 1e-8);
    }
    const end = position(1, 1);
    assert.ok(Math.abs(end.height - layout.height) < 1e-8);
    assert.equal(end.fieldY, 0);
  }
});

function harness(reducedMotion = false, upper = false) {
  const pending: Array<(completed: boolean) => void> = [];
  const state = {
    openingShift: 0, openingExpansion: 0, upperShift: 0, upperExpansion: 0,
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    wait: () => new Promise<boolean>(resolve => pending.push(resolve)),
  };
  const expand = runInNewContext(`${javascript}\n${upper ? 'expandUpperGrid' : 'expandOpeningGrid'};`, state) as (token: number) => Promise<boolean>;
  return { state, pending, expand };
}
async function flush() { for (let i = 0; i < 5; i++) await Promise.resolve(); }

test('the expansion waits on the lesson clock, shifts first, and cancels without later motion', async () => {
  const h = harness();
  const result = h.expand(1);
  h.pending.shift()!(true); await flush();
  for (let frame = 1; frame <= 40; frame++) {
    h.pending.shift()!(true); await flush();
    assert.equal(h.state.openingExpansion, 0, 'shift finishes before expansion begins');
  }
  assert.equal(h.state.openingShift, 1);
  // A paused clock keeps this wait pending, so both geometry values remain fixed.
  await flush();
  assert.equal(h.state.openingExpansion, 0);
  h.pending.shift()!(true); await flush();
  const progress = h.state.openingExpansion;
  assert.ok(progress > 0 && progress < 1);
  h.pending.shift()!(false);
  assert.equal(await result, false);
  assert.equal(h.state.openingExpansion, progress);
  assert.equal(h.pending.length, 0);
});

test('reduced motion restores the expanded grid immediately', async () => {
  const h = harness(true);
  const result = h.expand(1);
  h.pending.shift()!(true);
  assert.equal(await result, true);
  assert.equal(h.state.openingShift, 1);
  assert.equal(h.state.openingExpansion, 1);
  assert.equal(h.pending.length, 0);
});

test('upper expansion shifts first, waits while paused, and cancels without later motion', async () => {
  const h = harness(false, true);
  const result = h.expand(1);
  h.pending.shift()!(true); await flush();
  for (let frame = 1; frame <= 40; frame++) {
    h.pending.shift()!(true); await flush();
    assert.equal(h.state.upperExpansion, 0);
  }
  assert.equal(h.state.upperShift, 1);
  await flush(); assert.equal(h.state.upperExpansion, 0);
  h.pending.shift()!(true); await flush();
  const progress = h.state.upperExpansion;
  assert.ok(progress > 0 && progress < 1);
  h.pending.shift()!(false);
  assert.equal(await result, false);
  assert.equal(h.state.upperExpansion, progress);
  assert.equal(h.pending.length, 0);
});

test('the F range appears immediately with reduced motion', async () => {
  const h = harness(true, true);
  const result = h.expand(1);
  h.pending.shift()!(true);
  assert.equal(await result, true);
  assert.equal(h.state.upperShift, 1);
  assert.equal(h.state.upperExpansion, 1);
  assert.equal(h.pending.length, 0);
});
