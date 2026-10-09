import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { intervalPlans, getIntervalCheckpoint, getIntervalSeekTarget } from '../src/lesson13Intervals';

const source = await readFile(new URL('../src/PitchLesson13Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const declarations = ['cancelNoteExit', 'noteExitFinished', 'slideNotesOut'].map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`);
  return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }

function harness() {
  const plan = intervalPlans['minor-seconds'];
  const target = getIntervalSeekTarget(plan, 'finish', 'reward')!;
  const state: any = {
    notes: getIntervalCheckpoint(plan, target.cueIndex, target.stepIndex).notes,
    notesExiting: false, noteExitVersion: 0, pendingNoteExits: new Set(), resolveNoteExit: null,
    sequence: 1,
    isCurrent: (token: number) => token === state.sequence,
    wait: async (_ms: number, token: number) => token === state.sequence,
  };
  runInNewContext(javascript, state);
  return state;
}

test('1.3.3 and 1.3.4 request exits after their completion', () => {
  for (const [id, plan] of Object.entries(intervalPlans)) {
    const finish = plan.cues.find(cue => cue.id === 'finish')!.steps[0];
    assert.equal(finish.kind, 'finish');
    if (finish.kind !== 'finish') continue;
    assert.equal(finish.exitNotes, id === 'minor-seconds' || id === 'minor-seconds-above');
    if (id === 'minor-seconds') assert.equal(finish.text, '');
    if (id === 'minor-seconds-above') assert.equal(finish.text, 'Good job!');
  }
});

test('completion waits for both note departures before clearing the pair', async () => {
  const h = harness();
  const ids = h.notes.map((note: { id: string }) => note.id);
  let finished = false;
  const exit = h.slideNotesOut(1).then((result: boolean) => { finished = result; return result; });
  await flush();
  assert.equal(h.notesExiting, true);
  assert.equal(h.pendingNoteExits.size, 2);
  h.noteExitFinished(ids[0], h.noteExitVersion);
  h.noteExitFinished(ids[0], h.noteExitVersion);
  await flush();
  assert.equal(finished, false, 'one departure or duplicate callback cannot advance the lesson');
  assert.equal(h.notes.length, 2);
  h.noteExitFinished(ids[1], h.noteExitVersion);
  assert.equal(await exit, true);
  assert.equal(h.notes.length, 0);
  assert.equal(h.notesExiting, false);
});

test('restart or seek cancels the wait and ignores callbacks from the old exit', async () => {
  const h = harness();
  const exit = h.slideNotesOut(1);
  await flush();
  const previousVersion = h.noteExitVersion;
  const ids = h.notes.map((note: { id: string }) => note.id);
  h.sequence++;
  h.cancelNoteExit();
  assert.equal(await exit, false);
  assert.equal(h.notesExiting, false);
  assert.equal(h.pendingNoteExits.size, 0);

  const nextExit = h.slideNotesOut(2);
  await flush();
  for (const id of ids) h.noteExitFinished(id, previousVersion);
  assert.equal(h.pendingNoteExits.size, 2, 'old callbacks must not complete a new exit with the same note IDs');
  for (const id of ids) h.noteExitFinished(id, h.noteExitVersion);
  assert.equal(await nextExit, true);
});

test('an invalidated sequence cannot begin an exit', async () => {
  const h = harness();
  h.sequence++;
  assert.equal(await h.slideNotesOut(1), false);
  assert.equal(h.notesExiting, false);
  assert.equal(h.notes.length, 2);
});
