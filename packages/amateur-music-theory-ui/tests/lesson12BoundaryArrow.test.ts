import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { calculateBoundaryArrow } from '../src/lesson12BoundaryArrow';

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const declarations = ['cancelBoundaryArrow', 'boundaryArrowArrived', 'moveBoundaryArrow', 'explainOctaveBoundary'].map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`); return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function flush() { for (let i = 0; i < 100; i++) await Promise.resolve(); }

function harness() {
  const spoken: string[] = [], waits: number[] = [];
  let finishFirstSpeech!: () => void, resumePause!: (completed: boolean) => void;
  const e: any = {
    sequenceToken: 1, seeking: false, boundaryArrow: null, boundaryArrowVersion: 0, resolveBoundaryArrow: null,
    window: { matchMedia: () => ({ matches: false }) },
    isCurrentSequence: (token: number) => token === e.sequenceToken,
    waitForPlayback: async (token: number) => token === e.sequenceToken,
    say: async (_text: string, speech: string) => {
      if (e.seeking) return;
      spoken.push(speech);
      if (spoken.length === 1) await new Promise<void>(resolve => { finishFirstSpeech = resolve; });
    },
    waitMs: async (ms: number, token: number) => {
      waits.push(ms);
      if (!e.seeking && ms === 650) {
        const completed = await new Promise<boolean>(resolve => { resumePause = resolve; });
        return completed && e.isCurrentSequence(token);
      }
      return e.isCurrentSequence(token);
    },
  };
  runInNewContext(javascript, e);
  return { e, spoken, waits, finishSpeech: () => finishFirstSpeech(), resume: (completed = true) => resumePause(completed) };
}

test('B4 entrance and the first speech both finish before the pause and movement to C5', async () => {
  for (const speechFirst of [false, true]) {
    const h = harness();
    const run = h.e.explainOctaveBoundary(1); await flush();
    assert.equal(h.e.boundaryArrow.progress, 0);
    assert.ok(h.e.boundaryArrow.entering);
    assert.ok(h.spoken[0].endsWith('from B'));
    if (speechFirst) h.finishSpeech(); else h.e.boundaryArrowArrived(h.e.boundaryArrowVersion, 1);
    await flush();
    assert.deepEqual(h.waits, [], 'speech and entrance must both finish');
    if (speechFirst) h.e.boundaryArrowArrived(h.e.boundaryArrowVersion, 1); else h.finishSpeech();
    await flush();
    assert.deepEqual(h.waits, [650]);
    assert.equal(h.spoken.length, 1);
    assert.equal(h.e.boundaryArrow.progress, 0, 'arrow stays at B4 through the pause');
    h.resume(); await run;
    assert.equal(h.spoken[1], 'to C.');
    assert.equal(h.e.boundaryArrow.progress, 1);
    assert.equal(h.waits.filter(ms => ms === 650 / 40).length, 40);
    assert.equal(h.waits.at(-1), 450, 'hold the connecting arrow before the exercise');
  }
});

test('canceling an entrance or speech pause cannot speak the remaining phrase', async () => {
  for (const duringPause of [false, true]) {
    const h = harness(); const run = h.e.explainOctaveBoundary(1); await flush();
    const oldVersion = h.e.boundaryArrowVersion;
    h.finishSpeech();
    if (duringPause) { h.e.boundaryArrowArrived(oldVersion, 1); await flush(); }
    h.e.sequenceToken++; h.e.cancelBoundaryArrow();
    h.e.boundaryArrowArrived(oldVersion, 1);
    if (duringPause) h.resume();
    await run;
    assert.equal(h.e.boundaryArrow, null);
    assert.equal(h.spoken.length, 1);
  }
});

test('paused movement keeps its position, and canceled frames cannot change a restored arrow', async () => {
  const h = harness(); h.e.boundaryArrow = { progress: 0 };
  let resumeFrame!: (completed: boolean) => void;
  h.e.waitMs = async (_ms: number, token: number) => {
    const completed = await new Promise<boolean>(resolve => { resumeFrame = resolve; });
    return completed && h.e.isCurrentSequence(token);
  };
  const motion = h.e.moveBoundaryArrow(1); await flush();
  assert.equal(h.e.boundaryArrow.progress, 0);
  resumeFrame(true); await flush();
  const partial = h.e.boundaryArrow.progress;
  assert.ok(partial > 0 && partial < 1);
  await flush(); assert.equal(h.e.boundaryArrow.progress, partial);
  h.e.sequenceToken++; h.e.cancelBoundaryArrow(); h.e.boundaryArrow = { progress: 0 };
  resumeFrame(true); await motion;
  assert.equal(h.e.boundaryArrow.progress, 0);
});

test('Inspector restoration and reduced motion finish the arrow movement immediately', async () => {
  const h = harness(); h.e.seeking = true;
  await h.e.explainOctaveBoundary(1);
  assert.equal(h.e.boundaryArrow.progress, 1);
  assert.equal(h.e.boundaryArrow.instant, true);
  assert.equal(h.spoken.length, 0);
  const reduced = harness(); reduced.e.window.matchMedia = () => ({ matches: true });
  reduced.e.boundaryArrow = { progress: 0 };
  await reduced.e.moveBoundaryArrow(1);
  assert.equal(reduced.e.boundaryArrow.progress, 1);
  assert.deepEqual(reduced.waits, []);
});

test('arrow points at B4 then connects B4 to C5 without covering either note at both grid widths', () => {
  for (const musicalColumns of [14, 22]) {
    const cell = 18, b = { x: musicalColumns * cell * 0.5, y: 14 * cell },
      c = { x: musicalColumns * cell * 0.72, y: 13 * cell };
    const initial = calculateBoundaryArrow(b, c, cell, 0);
    assert.equal(initial.start.y, b.y); assert.equal(initial.end.y, b.y);
    assert.ok(initial.end.x < b.x - cell);
    const final = calculateBoundaryArrow(b, c, cell, 1);
    assert.ok(Math.hypot(final.start.x - b.x, final.start.y - b.y) > cell);
    assert.ok(Math.hypot(final.end.x - c.x, final.end.y - c.y) > cell);
    assert.ok(final.start.x < final.end.x && final.start.y > final.end.y);
    const cross = (point: { x: number; y: number }) => (point.x - b.x) * (c.y - b.y) - (point.y - b.y) * (c.x - b.x);
    assert.ok(Math.abs(cross(final.start)) < 1e-8 && Math.abs(cross(final.end)) < 1e-8);
  }
});
