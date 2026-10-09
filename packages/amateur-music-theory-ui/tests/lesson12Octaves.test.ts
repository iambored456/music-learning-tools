import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { fullRowData } from '@mlt/pitch-data';
import { calculateLessonGridLayout, lessonPacing } from '@mlt/lesson-kit';
import { lesson12Cues, octavePracticePairs } from '../src/lesson12Cues';
import { lesson12LegendColumns } from '../src/lesson12Grid';

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const names = ['setDisplayNotes', 'runOctaves', 'runOctaveNumbers', 'revealOctaveComparisonLabels', 'cancelNoteMotion',
  'noteMotionArrived', 'waitForNoteMotion', 'slideOctaveNotesIn', 'slideDisplayNotesOut', 'cancelGridMotion',
  'waitForGridMask', 'gridMaskArrived', 'gridSlideArrived', 'prepareOctaveNumberGrid', 'handleChoice', 'revealOctaveLegend'];
const declarations = names.map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`); return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function flush() { for (let i = 0; i < 80; i++) await Promise.resolve(); }

function harness(target?: string) {
  const events: string[] = [];
  const e: any = {
    section: { id: 'octaves' }, sequenceToken: 1, seeking: Boolean(target), displayNotes: [],
    activeCueId: null, activeActionId: null, legendMidiLabelOverrides: new Map(), lessonPacing, octavePracticePairs,
    noteMotionVersion: 0, pendingNoteMotion: new Set(), resolveNoteMotion: null,
    octaveGridMinMidi: 57, gridVerticalShift: 0, gridMaskInstant: true, gridMaskVersion: 0, gridSlideVersion: 0,
    resolveGridMask: null, resolveGridSlide: null, displayRowCount: 16, cellWidth: 20,
    legendOctaveLabelProgress: 1, window: { matchMedia: () => ({ matches: false }) },
    sourceRowByTone: new Map(fullRowData.map(row => [row.toneNote, row])),
    selectPitchRows: (min: number, max: number) => fullRowData.filter(row => row.midi! >= min && row.midi! <= max),
    isCurrentSequence: (token: number) => token === e.sequenceToken,
    waitForPlayback: async (token: number) => token === e.sequenceToken,
    waitMs: async (_ms: number, token: number) => token === e.sequenceToken,
    mark: (cue: string, action: string) => {
      if (e.seeking && `${cue}/${action}` !== target) return;
      e.seeking = false; e.activeCueId = cue; e.activeActionId = action;
      events.push(`mark:${action}`);
    },
    say: async (_text: string, spoken: string) => { if (!e.seeking) events.push(`speech:${spoken}`); },
    playSequence: async () => { if (!e.seeking) events.push('play'); },
    askNoteChoice: async (prompt: string) => { if (!e.seeking) events.push(`question:${prompt}`); },
    askChoice: async () => {
      if (!e.seeking) events.push(`question:${e.activeActionId}`);
      e.revealOctaveComparisonLabels(e.activeActionId);
    },
    askAdjacentNote: async (id: string, reference: string, answer: string, _distractor: string, _direction: string, _token: number, carriedReference?: any) => {
      events.push(`question:${id}`);
      if (carriedReference) e.displayNotes = [carriedReference];
      else e.displayNotes.push({ id: `${id}-reference`, toneNote: reference, label: reference });
      e.displayNotes.push({ id: `${id}-answer`, toneNote: answer, label: answer });
    },
    inspector: { status: (status: string) => events.push(`status:${status}`) },
    onComplete: () => events.push('complete'), finishSection: async () => events.push('finish-number-section'),
    explainOctaveBoundary: async () => events.push('explain-boundary'), cancelBoundaryArrow() {},
  };
  runInNewContext(javascript, e);
  return { e, events };
}

test('comparison pairs enter, reveal letters only after naming, and exit before the next pair', async () => {
  const h = harness();
  const run = h.e.runOctaves(1);
  const motions: Array<{ exit: boolean; tones: string[]; labels: string[] }> = [];
  for (let i = 0; i < 10; i++) {
    await flush();
    assert.equal(h.e.pendingNoteMotion.size, 2);
    const notes = [...h.e.displayNotes];
    motions.push({ exit: Boolean(notes[0].slideOut), tones: notes.map(note => note.toneNote), labels: notes.map(note => note.label) });
    if (!notes[0].slideOut) assert.ok(notes.every(note => note.slideIn));
    h.e.noteMotionArrived(notes[0].id);
    assert.equal(h.e.pendingNoteMotion.size, 1, 'both notes must arrive before continuing');
    h.e.noteMotionArrived(notes[1].id);
  }
  await flush();
  assert.deepEqual(motions.map(motion => motion.exit), [false, true, false, true, false, true, false, true, false, true]);
  assert.deepEqual(motions[0].labels, ['', '']);
  assert.deepEqual(motions[1].labels, ['A', 'A']);
  assert.deepEqual(motions[2].tones, ['A3', 'E4']);
  assert.deepEqual(motions[3].labels, ['A', 'E']);
  assert.deepEqual(motions[5].labels, ['B', 'B']);
  assert.deepEqual(motions[7].labels, ['C', 'C']);
  assert.deepEqual(motions[9].labels, ['A3', 'A4']);
  assert.ok(h.events.includes('question:Click on the higher pitch'));
  assert.ok(!h.events.some(event => event.includes('Bravo')));
  assert.equal(h.e.octaveGridMinMidi, 60);
  assert.equal(h.e.gridVerticalShift, 0, 'trim finishes before the downward slide starts');
  assert.ok(!h.events.includes('complete'));
  h.e.gridMaskArrived(h.e.gridMaskVersion, 1); await flush();
  assert.equal(h.e.gridVerticalShift, 150);
  assert.ok(!h.events.includes('complete'));
  h.e.gridSlideArrived(h.e.gridSlideVersion, 1); await run;
  assert.equal(h.events.at(-1), 'complete');
});

test('the prepared C4–C5 rows exactly match the beginning of the future C4–C6 grid', async () => {
  for (const [width, height, columns] of [[360, 600, 20], [900, 700, 28]]) {
    const before = calculateLessonGridLayout({ width, height, columns, legendColumns: lesson12LegendColumns, rows: 16, layoutRows: 25 });
    const after = calculateLessonGridLayout({ width, height, columns, legendColumns: lesson12LegendColumns, rows: 25 });
    const h = harness(); h.e.cellWidth = before.cellWidth; h.e.seeking = true;
    await h.e.prepareOctaveNumberGrid(1);
    assert.equal(before.width, after.width);
    assert.equal(before.cellWidth, after.cellWidth);
    const oldTop = (height - before.height) / 2;
    const newTop = (height - after.height) / 2;
    assert.ok(Math.abs(oldTop + h.e.gridVerticalShift - (newTop + 12 * after.cellWidth)) < 0.000001);
    assert.ok(Math.abs(oldTop + h.e.gridVerticalShift + before.height - 3 * before.cellWidth - (newTop + after.height)) < 0.000001);
  }
  const scene = await readFile(new URL('../src/PitchLesson12Scene.svelte', import.meta.url), 'utf8');
  assert.match(scene, /\['letter-names', 'letter-cycle', 'octaves', 'octave-numbers', 'accidentals'\]\.includes\(currentSection.id\)/);
  assert.match(scene, /\? 'pitch-name-sequence'/);
});

test('numbered octaves start at C4, reveal only through C6, and wait for the expansion', async () => {
  const h = harness(); h.e.section.id = 'octave-numbers';
  const run = h.e.runOctaveNumbers(1); await flush();
  assert.equal(h.e.letterRangeMinMidi, 60);
  assert.equal(h.e.letterLayoutMaxMidi, 84);
  assert.equal(h.e.letterRangeMaxMidi, 84);
  assert.equal(h.e.legendMidiLabelOverrides.get(69), 'A4', 'retain the label introduced in the previous section');
  assert.ok(!h.events.includes('mark:play-boundary'));
  h.e.gridMaskArrived(h.e.gridMaskVersion, 1); await flush();
  assert.equal(h.e.octaveGridRevealing, false);
  assert.equal(h.e.pendingNoteMotion.size, 8);
  assert.ok(!h.events.includes('finish-number-section'));
  Array.from(h.e.pendingNoteMotion).forEach(id => h.e.noteMotionArrived(id));
  await run;
  assert.equal(h.e.legendOctaveLabelProgress, 1);
  assert.equal(h.e.legendMidiLabelOverrides.size, 0);
  assert.ok(h.events.includes('mark:play-boundary'));
});

test('canceling pair motion or grid trimming cannot advance an old sequence', async () => {
  const h = harness();
  const entrance = h.e.slideOctaveNotesIn(['A3', 'A4'], 1); await flush();
  const oldIds = h.e.displayNotes.map((note: any) => note.id);
  h.e.sequenceToken++; h.e.cancelNoteMotion(); await entrance;
  oldIds.forEach((id: string) => h.e.noteMotionArrived(id));
  assert.equal(h.e.pendingNoteMotion.size, 0);
  const trim = h.e.prepareOctaveNumberGrid(2); await flush();
  const oldVersion = h.e.gridMaskVersion;
  h.e.sequenceToken++; h.e.cancelGridMotion();
  h.e.gridMaskArrived(oldVersion, 2); await trim;
  assert.equal(h.e.gridVerticalShift, 0);
});

test('only a correct naming answer reveals both labels, before success narration completes', async () => {
  const h = harness();
  Object.assign(h.e, {
    interaction: 'choice', answerLocked: false, isPlaying: true, activeCueId: 'compare-as', activeActionId: 'same-letter',
    comparisonCycleGeneration: 0, questionNarration: { submit() {}, wait() {} }, stopVoice() {}, questionNote: null,
    choiceGridPlacement: null, choiceSuccessText: 'Correct!', displayNotes: [{ toneNote: 'A3', label: '' }, { toneNote: 'A4', label: '' }],
    resolveResponse() {}, restoreQuestionMark() {}, markRetry() {}, repeatPrompt: async () => {},
  });
  const wrong = h.e.handleChoice({ label: 'No', correct: false }); await wrong;
  assert.deepEqual(Array.from(h.e.displayNotes, (note: any) => note.label), ['', '']);
  let finishSpeech!: () => void;
  h.e.say = async () => new Promise<void>(resolve => { finishSpeech = resolve; });
  const correct = h.e.handleChoice({ label: 'Yes', correct: true }); await flush();
  assert.deepEqual(Array.from(h.e.displayNotes, (note: any) => note.label), ['A', 'A']);
  finishSpeech(); await correct;
});

test('Inspector action numbers retain their retry slots', () => {
  const actions = lesson12Cues.octaves[1].actions!;
  assert.equal(actions[0].id, 'higher'); assert.equal(actions[0].title, 'Click on the higher pitch');
  assert.equal(actions[2].id, 'same-letter'); assert.equal(actions[4].id, 'not-octave-distance');
});

test('octave-label motion follows pause-aware waits and cannot overwrite a canceled sequence', async () => {
  const h = harness(); h.e.legendOctaveLabelProgress = 0;
  let resumeFrame!: (completed: boolean) => void;
  h.e.waitMs = async (_ms: number, token: number) => {
    const completed = await new Promise<boolean>(resolve => { resumeFrame = resolve; });
    return completed && h.e.isCurrentSequence(token);
  };
  const motion = h.e.revealOctaveLegend(1);
  await flush();
  assert.equal(h.e.legendOctaveLabelProgress, 0, 'waiting or pausing leaves the letter in its original position');
  resumeFrame(true); await flush();
  const partial = h.e.legendOctaveLabelProgress;
  assert.ok(partial > 0 && partial < 1);
  await flush();
  assert.equal(h.e.legendOctaveLabelProgress, partial, 'progress stops until the lesson clock resumes');
  h.e.sequenceToken++;
  h.e.legendOctaveLabelProgress = 1;
  resumeFrame(true); await motion;
  assert.equal(h.e.legendOctaveLabelProgress, 1, 'stale frames cannot alter restored labels');
});

test('Inspector restoration and reduced motion show octave numbers immediately', async () => {
  for (const reducedMotion of [false, true]) {
    const h = harness(); h.e.seeking = !reducedMotion;
    h.e.window.matchMedia = () => ({ matches: reducedMotion });
    h.e.legendOctaveLabelProgress = 0;
    h.e.waitMs = () => { throw new Error('Restoration must not wait for animation frames'); };
    await h.e.revealOctaveLegend(1);
    assert.equal(h.e.legendOctaveLabelProgress, 1);
  }
});
