import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { comparisonFinishActions, comparisonFinishCheckpoint } from '../src/lesson11MotionPlan';
import { highIntroToneNotes, lowIntroToneNotes } from '../src/lesson11PitchData';
import { linesSpacesCues, getLinesSpacesCheckpoint } from '../src/linesSpacesCues';

// Execute the scene's actual sequencing functions with audio/DOM boundaries
// injected. This checks teaching order and cancellation without a browser.
const component = await readFile(new URL('../src/PitchLesson112HighLow.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', component.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
function sequencingFunction(name: string, environment: Record<string, unknown>, helpers: string[] = []) {
  const declarations = [name, ...helpers].map(id => {
    const declaration = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === id);
    assert.ok(declaration, `Missing scene function ${id}`);
    return declaration.getText(script);
  }).join('\n');
  const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return runInNewContext(`${javascript}\n${name}`, environment) as (...args: unknown[]) => Promise<void>;
}

function finishEnvironment() {
  const events: string[] = [];
  let valid = true;
  const motion = {
    comparisonExiting: false,
    set gridHidden(value: boolean) { if (value) events.push('hide-grid'); },
  };
  const environment: Record<string, unknown> = {
    comparisonFinishActions, comparisonFinishCheckpoint,
    section: { code: '1.1.3' }, comparisonPairs: Array(7), motion,
    settledComparisonNotes: Array.from({ length: 14 }, (_, i) => ({ id: `note-${i}`, rowIndex: i })),
    isCurrentSequence: () => valid,
    getFrequencyForRow: (row: number) => row + 1,
    getComparisonRegion: () => 'lower',
    playTone: async (frequency: number) => { events.push(`play:${frequency}`); },
    waitMs: async () => { if (motion.comparisonExiting) events.push('exit'); },
    tick: async () => {},
    mark: (_cue: string, action: string) => { events.push(`action:${action}`); },
    moveComparisonAvatar: async (centered: boolean, _token: number, instant: boolean) => {
      events.push(`avatar:${centered ? 'center' : 'return'}${instant ? ':restore' : ''}`);
    },
    say: async (text: string) => { events.push(`speech:${text}`); },
    lessonScreenSlideMs: 650, lessonPacing: { afterCelebrationMs: 650 },
    inspector: { status: () => {} },
    onComparisonComplete: () => { events.push('advance'); },
  };
  return { environment, motion, events, cancel: () => { valid = false; } };
}

test('comparison ending plays all seven pairs, exits once, hides the grid, centers Grammy, speaks and returns before advancing', async () => {
  const { environment, events } = finishEnvironment();
  await sequencingFunction('finishComparisonSequence', environment)(1);
  assert.deepEqual(events.filter(event => event.startsWith('play:')), Array.from({ length: 14 }, (_, i) => `play:${i + 1}`));
  assert.equal(events.filter(event => event === 'exit').length, 1);
  const stages = ['play:14', 'exit', 'hide-grid', 'avatar:center', 'speech:Bravo!', 'avatar:return', 'advance'];
  assert.ok(stages.every((event, index) => events.indexOf(event) > (index ? events.indexOf(stages[index - 1]) : -1)));
  assert.equal((environment.settledComparisonNotes as unknown[]).length, 0);
});

test('seeking to Bravo restores the empty canvas and centered avatar without replay or entrance', async () => {
  const { environment, events } = finishEnvironment();
  await sequencingFunction('finishComparisonSequence', environment)(1, 'bravo');
  assert.deepEqual(events, ['hide-grid', 'avatar:center:restore', 'action:bravo', 'speech:Bravo!', 'action:return-avatar', 'avatar:return', 'advance']);
  assert.equal(comparisonFinishCheckpoint('missing'), null);
});

test('cancelling while the exit mounts cannot schedule an old wait, celebrate or advance', async () => {
  const { environment, events, motion, cancel } = finishEnvironment();
  environment.tick = async () => { if (motion.comparisonExiting) cancel(); };
  await sequencingFunction('finishComparisonSequence', environment)(1);
  assert.ok(events.includes('play:14'));
  for (const forbidden of ['exit', 'hide-grid', 'speech:Bravo!', 'advance']) assert.ok(!events.includes(forbidden));
});

test('cancelling the exit wait prevents the old celebration and next section', async () => {
  const { environment, events, motion, cancel } = finishEnvironment();
  environment.waitMs = async () => { if (motion.comparisonExiting) { events.push('exit'); cancel(); } };
  await sequencingFunction('finishComparisonSequence', environment)(1);
  assert.ok(events.includes('exit'));
  assert.ok(!events.includes('speech:Bravo!'));
  assert.ok(!events.includes('advance'));
});

test('high notes retain the three low examples, and the shared exit contains all six', async () => {
  const played: string[][] = [];
  let exited = 0;
  const environment: Record<string, unknown> = {
    section: { code: '1.1.2' }, lowIntroToneNotes, highIntroToneNotes,
    motion: { introEntering: [], placedNotes: [] },
    introExampleNotes: [], activeIntroExampleTone: null,
    pitchRows: [{ hex: '#abc' }], resetY: 50,
    getRowIndexForTone: () => 0, rowCenter: () => 50,
    beginSequence: () => 1, isCurrentSequence: () => true,
    mark: () => {}, waitMs: async () => {}, tick: async () => {}, say: async () => {},
    lessonScreenSlideMs: 650,
    playToneNoteSequence: async () => {
      played.push(Array.from(environment.introExampleNotes as { toneNote: string }[], note => note.toneNote));
    },
    slideIntroNotesOut: async () => { exited = (environment.introExampleNotes as unknown[]).length; },
    startTask: async () => {},
  };
  await sequencingFunction('startIntroSequence', environment, ['setIntroExampleNotes', 'clearIntroExampleNotes'])('low-notes');
  assert.deepEqual(played, [lowIntroToneNotes, [...lowIntroToneNotes, ...highIntroToneNotes]]);
  assert.equal(exited, 6);
});

test('the two learner placements remain together until their shared exit', async () => {
  const placed: { id: string; rowIndex: number; leftPercent: number; color: string }[] = [];
  const exits: string[][] = [];
  const transitions: number[] = [];
  const motion = { placedNotes: placed, placementVisible: true };
  const environment: Record<string, unknown> = {
    currentTask: { id: 'low-place', target: 'lower', reinforcement: 'Good.' },
    tasks: Array(2), taskIndex: 0, noteY: 75, motion,
    pitchRows: [{ hex: '#abc' }, { hex: '#def' }],
    getRowIndexForPercent: (y: number) => y > 50 ? 0 : 1,
    beginSequence: () => 1, isCurrentSequence: () => true,
    questionNarration: { submit: () => {} }, mark: () => {},
    clearIntroExampleNotes: () => {}, say: async () => {}, waitMs: async () => {},
    slidePlacedNotesOut: async () => { exits.push(Array.from(motion.placedNotes, note => note.id)); },
    startTask: async (index: number) => { transitions.push(index); },
  };
  const answer = sequencingFunction('handleSuccessfulDrop', environment);
  await answer();
  assert.deepEqual(Array.from(motion.placedNotes, note => note.id), ['low-place']);
  assert.equal(exits.length, 0);
  environment.taskIndex = 1;
  environment.currentTask = { id: 'high-place', target: 'upper', reinforcement: 'Good.' };
  environment.noteY = 25;
  await answer();
  assert.deepEqual(exits, [['low-place', 'high-place']]);
  assert.deepEqual(transitions, [1, 2]);
});

test('both 1.1.1 dragging segments enter from the left, exit after playback, and restore valid placements when seeking', () => {
  for (const id of ['drag-to-line', 'drag-to-space']) {
    const cue = linesSpacesCues.find(item => item.id === id)!;
    assert.equal(getLinesSpacesCheckpoint(id)?.slideDragIn, true);
    assert.equal(getLinesSpacesCheckpoint(id, 'placement')?.slideDragIn, true);
    assert.equal(getLinesSpacesCheckpoint(id, 'tone-0')?.slideDragIn, false);
    const exitIndex = cue.actions.findIndex(action => action.kind === 'drag-exit');
    assert.equal(cue.actions[exitIndex - 1].id, 'settle');
    assert.equal(cue.actions[exitIndex].durationMs, 650);
    assert.equal(getLinesSpacesCheckpoint(id, 'slide-out')?.settledDrag, true);
    assert.equal(getLinesSpacesCheckpoint(id, 'slide-out')?.clearCanvas, false);
    assert.equal(getLinesSpacesCheckpoint(id, 'slide-out')?.slideDragIn, false);
  }
  assert.equal(linesSpacesCues.find(item => item.id === 'drag-to-line')!.timing.leadIn, 650);
});

function scoreEnvironment(outro = true) {
  const events: string[] = [];
  let mounted = false;
  let valid = true;
  const environment: Record<string, unknown> = {
    avatarReady: false, section: { code: '1.1.4', label: 'Match the Pitch' }, isMusicalOutro: outro,
    skipScorePreludeRequested: false, resetY: 50,
    scoreTotalSlots: 4, scoreTotalColumns: 2, scorePlaybackSlotDurationMs: 100,
    scorePlaybackEventsBySlot: new Map(Array.from({ length: 4 }, (_, slot) => [slot, [{ slot }]])),
    beginSequence: () => 1, isCurrentSequence: () => valid, mark() {},
    clearIntroExampleNotes() {}, clearScoreHighlights() {}, stopTone() {},
    tick: async () => { mounted = true; events.push('mounted'); },
    waitMs: async () => {},
    startScoreCursorAnimation: () => events.push('playback-start'),
    stopScoreCursorAnimation: () => events.push('playback-end'),
    activateScoreEvent() {},
    playScoreEvent: async (event: { slot: number }) => { events.push(`note:${event.slot}`); },
    speakWithLessonAvatar: (text: string, options: { wave: boolean }) => {
      assert.equal(mounted, true, 'speech requires the mounted avatar');
      events.push(`speech:${text}:${options.wave}`);
      // Narration must not block the simultaneous score or await avatarReady.
      return new Promise<void>(() => {});
    },
    say: async (text: string) => { events.push(`speech:${text}`); },
  };
  return { environment, events, cancel: () => { valid = false; } };
}

test('closing goodbye starts with playback while Grammy is still entering and does not block the score', async () => {
  const { environment, events } = scoreEnvironment();
  assert.equal(environment.avatarReady, false);
  const result = await sequencingFunction('playScorePreludeSequence', environment, ['sayDuringScorePrelude'])();
  assert.equal(result, true);
  assert.deepEqual(events, ['mounted', 'playback-start', 'speech:See you next time!:false',
    'note:0', 'note:1', 'note:2', 'note:3', 'playback-end']);
  assert.equal(environment.narrationText, 'See you next time!');
});

test('opening greeting retains its midpoint timing and wave', async () => {
  const { environment, events } = scoreEnvironment(false);
  await sequencingFunction('playScorePreludeSequence', environment, ['sayDuringScorePrelude'])();
  const greeting = events.indexOf('speech:Hello:true');
  assert.ok(greeting > events.indexOf('note:1') && greeting < events.indexOf('note:2'));
  assert.ok(!events.includes('speech:See you next time!:false'));
});

test('canceling before playback or skipping the score prevents an old goodbye', async () => {
  for (const skip of [false, true]) {
    const { environment, events, cancel } = scoreEnvironment();
    if (skip) environment.skipScorePreludeRequested = true;
    else environment.tick = async () => { cancel(); };
    await sequencingFunction('playScorePreludeSequence', environment, ['sayDuringScorePrelude'])();
    assert.ok(!events.includes('playback-start'));
    assert.ok(!events.some(event => event.startsWith('speech:')));
  }
});

test('stale score narration neither speaks nor overwrites the current bubble', async () => {
  const { environment, events, cancel } = scoreEnvironment();
  environment.narrationText = 'Current question';
  cancel();
  await sequencingFunction('sayDuringScorePrelude', environment)('See you next time!', 1);
  assert.deepEqual(events, []);
  assert.equal(environment.narrationText, 'Current question');
});
