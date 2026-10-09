import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { fullRowData } from '@mlt/pitch-data';
import { lessonPacing } from '@mlt/lesson-kit';

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const declarations = ['placementLabel', 'handleRowChoice'].map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node);
  return node.getText(script);
}).join('\n');
const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;

function harness() {
  let completePlayback!: () => void;
  const played = new Promise<void>(resolve => { completePlayback = resolve; });
  const e: any = {
    section: { id: 'letter-names' },
    interaction: 'placement', answerLocked: false, isPlaying: true, placementTargetTone: 'D4', placementRevealLabel: 'D',
    freeColumnPlacement: true, accidentalMode: { sharp: false, flat: false },
    sourceRowByTone: new Map(fullRowData.map(row => [row.toneNote, row])),
    comparisonCycleGeneration: 0, sequenceToken: 1, activeActionId: 'place-D4', placementBaseNotes: [],
    placementLeftPercent: 48, placementPreviewTone: null, displayNotes: [], feedbackState: null,
    stopVoice() {}, questionNarration: { submit() {}, wait() {} }, playTone: async () => played,
    isCurrentSequence: (token: number) => token === e.sequenceToken, markRetry() {}, restoreQuestionMark() {},
    say: async () => {}, waitMs: async () => true, repeatPrompt: async () => {}, resolveResponse() {}, lessonPacing,
  };
  runInNewContext(javascript, e);
  return { e, completePlayback };
}

test('1.2.1.d labels wrong guesses with the chosen pitch throughout playback', async () => {
  for (const [tone, label] of [['C4', 'C'], ['F4', 'F'], ['B3', 'B'], ['Db4', 'D♭']]) {
    const { e, completePlayback } = harness();
    e.placementBaseNotes = [{ id: 'earlier-A', toneNote: 'A3', label: 'A', leftPercent: 26 }];
    const response = e.handleRowChoice(tone);
    assert.equal(e.displayNotes.at(-1).toneNote, tone);
    assert.equal(e.displayNotes.at(-1).label, label);
    assert.equal(e.displayNotes[0].label, 'A');
    completePlayback(); await response;
    assert.equal(e.answerLocked, false);
    assert.equal(e.displayNotes.length, 1, 'a retry removes only the latest incorrect note');
  }
});

test('correct placement keeps the requested label and spelling', async () => {
  const { e, completePlayback } = harness();
  const response = e.handleRowChoice('D4');
  assert.equal(e.displayNotes.at(-1).label, 'D');
  completePlayback(); await response;
  assert.equal(e.feedbackState, 'success');
});

test('octave-number exercises retain octave numbers and the current accidental naming mode', () => {
  const { e } = harness();
  e.freeColumnPlacement = false;
  e.section.id = 'octave-numbers';
  for (const [mode, label] of [
    [{ sharp: true, flat: false }, 'C♯4'],
    [{ sharp: false, flat: true }, 'D♭4'],
    [{ sharp: true, flat: true }, 'D♭4 / C♯4'],
  ] as const) {
    e.accidentalMode = mode;
    assert.equal(e.placementLabel('Db4'), label);
    assert.equal(e.placementLabel('C4'), 'C4');
  }
  e.placementTargetTone = 'Db4'; e.placementRevealLabel = 'C♯4';
  assert.equal(e.placementLabel('Db4'), 'C♯4');
});

test('naming-practice wrong guesses use the current spelling without octave numbers', async () => {
  for (const [mode, label] of [
    [{ sharp: true, flat: false }, 'C♯'],
    [{ sharp: false, flat: true }, 'D♭'],
    [{ sharp: true, flat: true }, 'D♭ / C♯'],
  ]) {
    const { e, completePlayback } = harness();
    e.section.id = 'naming-practice'; e.freeColumnPlacement = false; e.accidentalMode = mode;
    assert.equal(e.placementLabel('C4'), 'C');
    assert.equal(e.placementLabel('C5'), 'C');
    const answer = e.handleRowChoice('Db4');
    assert.equal(e.displayNotes.at(-1).label, label);
    completePlayback(); await answer;
    assert.equal(e.answerLocked, false);
  }
});
