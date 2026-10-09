import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { calculateLessonGridLayout } from '@mlt/lesson-kit';
import { calculatePianoGridMorph } from '../src/lesson12PianoGridMorph';
import { lesson12LegendColumns } from '../src/lesson12Grid';

test('morph endpoints exactly preserve the old grid and match the centered piano layout', () => {
  for (const [frameWidth, frameHeight, columns, pianoHeight] of [[340, 500, 20, 92], [900, 700, 28, 140], [1440, 480, 28, 140]]) {
    const compactWidth = Math.min(frameWidth, 576);
    const from = calculateLessonGridLayout({ width: frameWidth, height: frameHeight, columns, rows: 25, legendColumns: lesson12LegendColumns });
    const target = calculateLessonGridLayout({ width: compactWidth, height: frameHeight - pianoHeight, columns: 16, rows: 13, legendColumns: lesson12LegendColumns });
    const snapshots = [0, 0.5, 1].map(progress => calculatePianoGridMorph({
      morph: { from, progress }, frameWidth, frameHeight, compactWidth, pianoHeight,
    }));
    for (const snapshot of snapshots) {
      assert.equal(snapshot.layout.cellHeight / 2, snapshot.layout.cellWidth);
      assert.equal(snapshot.layout.noteDiameter, snapshot.layout.cellWidth * 2);
    }
    const visibleTop = (snapshot: typeof snapshots[number]) =>
      (frameHeight - snapshot.layout.height - pianoHeight) / 2 + snapshot.y + snapshot.top;
    const visibleHeight = (snapshot: typeof snapshots[number]) => snapshot.layout.height - snapshot.top - snapshot.bottom;
    const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`);
    const [start, middle, end] = snapshots;
    close(start.layout.width, from.width); close(visibleTop(start), (frameHeight - from.height) / 2);
    close(visibleHeight(start), from.height); close(start.x, 0);
    close(end.layout.width, target.width); close(visibleHeight(end), target.height);
    close(visibleTop(end), (frameHeight - target.height - pianoHeight) / 2);
    close(end.x, (frameWidth - target.width) / 2);
    assert.ok(middle.top > start.top && middle.top < end.top);
    assert.ok(snapshots.every(snapshot => snapshot.bottom === 0), 'C4 remains the lower endpoint throughout the morph');
    assert.ok(middle.x >= start.x && middle.x <= end.x);
  }
});

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const declarations = ['morphToPianoGrid', 'finishSection'].map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`); return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function flush() { for (let i = 0; i < 40; i++) await Promise.resolve(); }

function harness() {
  const events: string[] = [];
  let resumeFrame!: (completed: boolean) => void;
  const e: any = {
    sequenceToken: 1, seeking: false, pianoGridMorph: null, legendOctaveLabelProgress: 1,
    gridLayout: calculateLessonGridLayout({ width: 900, height: 700, columns: 28, rows: 25, legendColumns: lesson12LegendColumns }),
    window: { matchMedia: () => ({ matches: false }) },
    isCurrentSequence: (token: number) => token === e.sequenceToken,
    waitForPlayback: async (token: number) => token === e.sequenceToken,
    waitMs: async (ms: number, token: number) => {
      if (ms === 450) return token === e.sequenceToken;
      const completed = await new Promise<boolean>(resolve => { resumeFrame = resolve; });
      return completed && token === e.sequenceToken;
    },
    say: async (text: string) => { events.push(text); }, onComplete: () => events.push('complete'),
  };
  runInNewContext(javascript, e);
  return { e, events, nextFrame: () => resumeFrame(true) };
}

test('the section waits for the complete morph and pausing leaves its geometry unchanged', async () => {
  const h = harness();
  const run = h.e.finishSection(1, () => h.e.morphToPianoGrid(1)); await flush();
  assert.equal(h.events[0], 'Bravo!');
  assert.equal(h.e.pianoGridMorph.progress, 0);
  assert.equal(h.e.pianoGridMorph.from.width, h.e.gridLayout.width);
  h.nextFrame(); await flush();
  const partial = h.e.pianoGridMorph.progress;
  await flush(); assert.equal(h.e.pianoGridMorph.progress, partial);
  assert.ok(!h.events.includes('complete'));
  for (let frame = 2; frame <= 60; frame++) { h.nextFrame(); await flush(); }
  await run;
  assert.equal(h.e.pianoGridMorph.progress, 1);
  assert.equal(h.e.legendOctaveLabelProgress, 0);
  assert.equal(h.events.at(-1), 'complete');
});

test('canceled frames cannot restore obsolete geometry or advance the old section', async () => {
  const h = harness();
  const run = h.e.finishSection(1, () => h.e.morphToPianoGrid(1)); await flush();
  h.nextFrame(); await flush();
  h.e.sequenceToken++; h.e.pianoGridMorph = null; h.e.legendOctaveLabelProgress = 1;
  h.nextFrame(); await run;
  assert.equal(h.e.pianoGridMorph, null);
  assert.equal(h.e.legendOctaveLabelProgress, 1);
  assert.ok(!h.events.includes('complete'));
});

test('Inspector and reduced motion restore the destination immediately', async () => {
  for (const reducedMotion of [false, true]) {
    const h = harness(); h.e.seeking = !reducedMotion;
    h.e.window.matchMedia = () => ({ matches: reducedMotion });
    h.e.waitMs = () => { throw new Error('Immediate restoration cannot wait for frames'); };
    await h.e.morphToPianoGrid(1);
    assert.equal(h.e.pianoGridMorph.progress, 1);
    assert.equal(h.e.legendOctaveLabelProgress, 0);
  }
});
