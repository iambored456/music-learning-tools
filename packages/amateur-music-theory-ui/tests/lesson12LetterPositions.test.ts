import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { lessonPacing } from '@mlt/lesson-kit';
import { letterPositionExamples } from '../src/lesson12LetterPositions';
import { lesson12Cues, getLesson12SeekTarget } from '../src/lesson12Cues';

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const declarations = ['cancelLetterArrival', 'letterNoteArrived', 'introduceLetterPosition', 'runLetterPositions',
  'shiftLetterLineNotes', 'cancelNoteMotion', 'noteMotionArrived', 'waitForNoteMotion', 'slideDisplayNotesOut'].map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`);
  return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function flush() { for (let i = 0; i < 40; i++) await Promise.resolve(); }

function harness(target?: string, holdSpeech = false) {
  const speech: Array<{ text: string; spoken: string; tones: string[] }> = [];
  let finishSpeech: (() => void) | undefined;
  const e: any = {
    sequenceToken: 1, seeking: Boolean(target), displayNotes: [],
    arrivingLetterNoteId: null, resolveLetterArrival: null, letterPositionExamples, lessonPacing,
    pendingNoteMotion: new Set(), resolveNoteMotion: null,
    isCurrentSequence: (token: number) => token === e.sequenceToken,
    waitForPlayback: async (token: number) => token === e.sequenceToken,
    waitMs: async (_ms: number, token: number) => token === e.sequenceToken,
    setDisplayNotes: (notes: unknown[]) => { e.displayNotes = notes; },
    mark: (_cue: string, action: string) => { if (target === action) e.seeking = false; },
    say: async (text: string, spoken: string) => {
      if (e.seeking) return;
      speech.push({ text, spoken, tones: Array.from(e.displayNotes, (note: any) => note.toneNote) });
      if (holdSpeech) await new Promise<void>(resolve => { finishSpeech = resolve; });
    },
  };
  runInNewContext(javascript, e);
  return { e, speech, arrive: () => e.letterNoteArrived(e.arrivingLetterNoteId),
    finishMotion: () => Array.from(e.pendingNoteMotion).forEach(id => e.noteMotionArrived(id)),
    finishSpeech: () => finishSpeech?.() };
}

test('the new Segment c sits between legend playback and placement practice', () => {
  const plan = lesson12Cues['letter-names'];
  assert.deepEqual(plan.map(cue => cue.id), ['introduce-letters', 'reveal-letters', 'letter-lines-spaces', 'place-letters']);
  assert.deepEqual(plan[2].actions!.map(action => action.id), [...letterPositionExamples.map(example => example.id), 'slide-out']);
  for (const example of letterPositionExamples) assert.ok(getLesson12SeekTarget(plan, 'letter-lines-spaces', example.id));
  assert.ok(source.indexOf('await runLetterPositions(token)') < source.indexOf('for (const [index, question] of naturalPlacementQuestions.entries())'));
});

test('line notes shift as A enters, all seven letters remain visible, and practice waits for their exit', async () => {
  const h = harness();
  const run = h.e.runLetterPositions(1);
  for (const [index, example] of letterPositionExamples.entries()) {
    await flush();
    assert.equal(h.speech.length, index + 1, 'the next announcement waits for arrival');
    assert.equal(h.speech[index].spoken, example.spokenText);
    const note = h.e.displayNotes.at(-1);
    assert.equal(note.toneNote, example.toneNote);
    assert.equal(note.leftPercent, 0);
    assert.equal(note.columnOffset - 1, 1, 'two-column circles leave one empty column beyond the legend');
    assert.equal(note.slideIn, true);
    assert.equal(note.instant, false);
    h.arrive();
    if (example.id === 'space-A3') {
      await flush();
      assert.equal(h.speech.length, 4, 'A arrival alone cannot finish the simultaneous line-note shift');
      assert.equal(h.e.pendingNoteMotion.size, 3);
      assert.ok(h.e.displayNotes.slice(0, 3).every((note: any) => note.columnShift === 2 && !note.slideIn));
      h.finishMotion();
    }
  }
  await flush();
  assert.equal(h.e.displayNotes.length, 7);
  assert.ok(h.e.displayNotes.every((note: any) => note.slideOut));
  assert.equal(h.e.pendingNoteMotion.size, 7);
  const exitingIds = Array.from(h.e.pendingNoteMotion);
  exitingIds.slice(0, 6).forEach(id => h.e.noteMotionArrived(id));
  await flush();
  assert.equal(h.e.displayNotes.length, 7, 'all seven exit completions must arrive before clearing');
  h.finishMotion();
  await run;
  assert.deepEqual(h.speech[2].tones, ['C4', 'D4', 'E4']);
  assert.deepEqual(h.speech[3].tones, ['C4', 'D4', 'E4', 'A3']);
  assert.deepEqual(h.speech[6].tones, ['C4', 'D4', 'E4', 'A3', 'B3', 'F4', 'G4']);
  assert.equal(h.e.displayNotes.length, 0);
});

test('arriving before speech ends cannot advance; canceled entrances cannot resume an old sequence', async () => {
  const h = harness(undefined, true);
  const run = h.e.runLetterPositions(1); await flush();
  h.arrive(); await flush();
  assert.equal(h.speech.length, 1);
  h.finishSpeech(); await flush();
  assert.equal(h.speech.length, 2);
  const staleId = h.e.arrivingLetterNoteId;
  h.e.sequenceToken++;
  h.e.cancelLetterArrival(); h.finishSpeech();
  h.e.letterNoteArrived(staleId);
  await run;
  assert.equal(h.speech.length, 2);
  assert.equal(h.e.resolveLetterArrival, null);
});

test('seeking restores shifted line notes and the prior space note instantly before the selected announcement', async () => {
  const h = harness('space-B3');
  const run = h.e.runLetterPositions(1); await flush();
  assert.deepEqual(Array.from(h.e.displayNotes, (note: any) => note.toneNote), ['C4', 'D4', 'E4', 'A3', 'B3']);
  assert.ok(h.e.displayNotes.slice(0, 3).every((note: any) => note.columnShift === 2));
  assert.ok(h.e.displayNotes.slice(0, 4).every((note: any) => note.instant));
  assert.equal(h.e.displayNotes[4].instant, false);
  assert.equal(h.speech.length, 1);
  assert.equal(h.speech[0].spoken, 'B,');
  h.e.sequenceToken++; h.e.cancelLetterArrival();
  await run;
});

test('seeking to the shared exit restores all seven letters and waits for their departure', async () => {
  const h = harness('slide-out');
  const run = h.e.runLetterPositions(1); await flush(); await flush();
  assert.equal(h.speech.length, 0);
  assert.equal(h.e.displayNotes.length, 7);
  assert.ok(h.e.displayNotes.slice(0, 3).every((note: any) => note.columnShift === 2));
  assert.ok(h.e.displayNotes.every((note: any) => note.slideOut && !note.instant));
  h.finishMotion(); await run;
  assert.equal(h.e.displayNotes.length, 0);
});

test('canceling the simultaneous shift and A entrance cannot continue the old demonstration', async () => {
  const h = harness();
  const run = h.e.runLetterPositions(1);
  for (let index = 0; index < 3; index++) { await flush(); h.arrive(); }
  await flush();
  assert.equal(h.e.pendingNoteMotion.size, 3);
  const oldIds = Array.from(h.e.pendingNoteMotion);
  const oldA = h.e.arrivingLetterNoteId;
  h.e.sequenceToken++;
  h.e.cancelLetterArrival(); h.e.cancelNoteMotion();
  oldIds.forEach(id => h.e.noteMotionArrived(id)); h.e.letterNoteArrived(oldA);
  await run;
  assert.equal(h.speech.length, 4);
  assert.equal(h.e.pendingNoteMotion.size, 0);
});
