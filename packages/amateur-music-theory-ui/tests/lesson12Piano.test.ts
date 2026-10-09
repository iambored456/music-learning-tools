import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { fullRowData } from '@mlt/pitch-data';
import { lessonPacing } from '@mlt/lesson-kit';
import { pianoLessonRange, pianoWhiteKeys } from '../src/lesson12PianoRange';
import { blackKeyIntroduction } from '../src/lesson12BlackKeys';

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const declarations = ['hidePiano', 'pianoArrived', 'runAccidentals', 'playTone', 'playSequence', 'stopVoice', 'revealPianoKeyLabel'].map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`);
  return node.getText(script);
}).join('\n');
const pianoHighlight = script.statements.filter(ts.isVariableStatement)
  .flatMap(statement => [...statement.declarationList.declarations])
  .find(declaration => declaration.name.getText(script) === 'pianoActiveMidi')?.initializer;
assert.ok(pianoHighlight && ts.isCallExpression(pianoHighlight));
const javascript = ts.transpileModule(`${declarations}\nfunction getPianoActiveMidi() { return ${pianoHighlight.arguments[0].getText(script)}; }`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function flush() { for (let index = 0; index < 200; index++) await Promise.resolve(); }

function silentVoice() {
  return {
    oscillator: { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {}, disconnect() {} },
    gain: { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, disconnect() {} },
  };
}

function harness(target?: string) {
  const events: string[] = [];
  const environment: any = {
    sequenceToken: 1, seeking: Boolean(target), lessonPacing, showPiano: false, pianoEntering: false,
    pianoSlideVersion: 0, resolvePianoArrival: null, pianoPlayback: false,
    visiblePianoLabelMidi: new Set(), activeVoice: null, pianoVoice: null, volume: 72,
    gridKind: '', letterLegendOnly: false, accidentalMode: {}, displayNotes: [], activeToneNote: null,
    layoutGridColumnCount: pianoLessonRange.gridColumns, pianoWhiteKeys,
    sourceRowByTone: new Map(fullRowData.map(row => [row.toneNote, row])),
    isCurrentSequence: (token: number) => token === environment.sequenceToken,
    setDisplayNotes: (notes: unknown[]) => { environment.displayNotes = notes; },
    mark: (cue: string, action: string) => {
      if (`${cue}/${action}` === target) environment.seeking = false;
      if (!environment.seeking) events.push(`mark:${action}`);
    },
    say: async () => {}, waitMs: async (_ms: number, token: number) => token === environment.sequenceToken,
    waitForPlayback: async (token: number) => token === environment.sequenceToken,
    ensureAudioContext: async () => ({ currentTime: 10, createOscillator: () => silentVoice().oscillator, createGain: () => silentVoice().gain }),
    audioOutput: { connect() {}, forget() {} }, createLessonPianoVoice: silentVoice,
    // Stop after the passage being tested, retaining the real white-key sequence.
    runBlackKeysIntroduction: async () => { environment.sequenceToken++; },
  };
  runInNewContext(javascript, environment);
  const playSequence = environment.playSequence;
  environment.playSequence = async (notes: string[], token: number, trailingGap = true) => {
    if (!environment.seeking) events.push(`play:${notes.join(',')}:${environment.pianoPlayback}`);
    await playSequence(notes, token, trailingGap);
  };
  return { environment, events };
}

test('1.2.5.a.3 waits for the keyboard arrival before synchronized replay', async () => {
  const { environment: e, events } = harness();
  const run = e.runAccidentals(1);
  await flush();
  assert.equal(e.showPiano, true);
  assert.equal(e.pianoEntering, true);
  assert.deepEqual(Array.from(e.displayNotes, (note: any) => note.toneNote), [...pianoWhiteKeys]);
  assert.equal(e.gridKind, 'chromatic-c');
  assert.equal(events.filter(event => event.startsWith('play:'))[0], `play:${pianoWhiteKeys.join(',')}:false`);
  assert.equal(events.filter(event => event.startsWith('play:')).length, 1, 'only the earlier grid playback has occurred');
  assert.ok(!events.includes('mark:piano-playback'));
  assert.equal(e.visiblePianoLabelMidi.size, 0, 'the entrance and earlier grid playback reveal no piano labels');
  e.pianoArrived(e.pianoSlideVersion, 1); await run;
  assert.deepEqual(Array.from(e.visiblePianoLabelMidi), [60, 62, 64, 65, 67, 69, 71, 72]);
  assert.equal(events.filter(event => event.startsWith('play:')).length, 2);
  assert.ok(events.some(event => event.startsWith('play:') && event.endsWith(':true')));
  assert.equal(events.filter(event => event.startsWith('play:'))[1], `play:${pianoWhiteKeys.join(',')}:true`);
  assert.match(source, /<PianoKeyboard minMidi=\{pianoLessonRange.minMidi\} maxMidi=\{pianoLessonRange.maxMidi\}/);
  assert.match(source, /'chromatic-c': selectPitchRows\(pianoLessonRange.minMidi, pianoLessonRange.maxMidi\)/);
  assert.equal(pianoLessonRange.minMidi, 60);
  assert.equal(pianoLessonRange.maxMidi, 72);
});

test('seeking directly to keyboard replay restores its resting position immediately', async () => {
  const { environment: e, events } = harness('white-keys/piano-playback');
  await e.runAccidentals(1);
  assert.equal(e.showPiano, true);
  assert.equal(e.pianoEntering, false);
  assert.equal(e.resolvePianoArrival, null);
  assert.equal(events.filter(event => event.startsWith('play:')).length, 1);
  assert.deepEqual(Array.from(e.visiblePianoLabelMidi), [60, 62, 64, 65, 67, 69, 71, 72]);
});

test('seeking to the entrance replays it; canceled arrivals cannot start old playback', async () => {
  const { environment: e, events } = harness('white-keys/piano');
  const run = e.runAccidentals(1); await flush();
  const version = e.pianoSlideVersion;
  assert.equal(e.pianoEntering, true);
  e.sequenceToken++; e.hidePiano(); e.pianoArrived(version, 1); await run;
  assert.equal(e.showPiano, false);
  assert.equal(e.resolvePianoArrival, null);
  assert.equal(events.filter(event => event.startsWith('play:')).length, 0);
});

test('grid and piano start together and share the same active pitch until the sound ends', async () => {
  const { environment: e } = harness();
  let finishSound!: (current: boolean) => void;
  const soundFinished = new Promise<boolean>(resolve => { finishSound = resolve; });
  const starts: number[] = [];
  const voice = () => ({ oscillator: { frequency: { setValueAtTime() {} }, connect() {}, start(time: number) { starts.push(time); }, stop() {}, disconnect() {} },
    gain: { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, disconnect() {} } });
  e.pianoVoice = null; e.activeVoice = null; e.pianoPlayback = true; e.volume = 72;
  e.activeCueId = 'black-keys';
  const gridVoice = voice();
  e.ensureAudioContext = async () => ({ currentTime: 10, createOscillator: () => gridVoice.oscillator, createGain: () => gridVoice.gain });
  e.waitForPlayback = async () => true; e.waitMs = async () => soundFinished;
  e.audioOutput = { connect() {}, forget() {} }; e.createLessonPianoVoice = voice;
  const sound = e.playTone('Ab4', 1); await flush();
  assert.deepEqual(starts, [10, 10]);
  assert.equal(e.activeToneNote, 'Ab4');
  assert.equal(e.sourceRowByTone.get(e.activeToneNote).midi, 68);
  assert.equal(e.getPianoActiveMidi(), 68, 'the black key highlights during Segment b');
  assert.equal(e.visiblePianoLabelMidi.has(68), true, 'the black-key labels appear at the start of its sound');
  finishSound(true); await sound;
  assert.equal(e.activeToneNote, null);
  assert.equal(e.getPianoActiveMidi(), null, 'the key highlight clears when playback ends');
  assert.equal(e.activeVoice, null); assert.equal(e.pianoVoice, null);
  assert.equal(e.visiblePianoLabelMidi.has(68), true, 'labels remain after the sound ends');
});

test('white then black labels accumulate one key at a time during playback, and hiding the piano clears them', async () => {
  const { environment: e } = harness();
  const snapshots: number[][] = [];
  e.waitMs = async (_ms: number, token: number) => {
    if (e.activeToneNote) snapshots.push(Array.from(e.visiblePianoLabelMidi));
    return token === e.sequenceToken;
  };
  await e.playTone('C4', 1);
  assert.equal(e.visiblePianoLabelMidi.size, 0, 'grid-only playback cannot reveal piano labels');
  snapshots.length = 0;
  e.pianoPlayback = true;
  await e.playSequence(pianoWhiteKeys, 1, false);
  assert.deepEqual(snapshots.map(labels => labels.length), [1, 2, 3, 4, 5, 6, 7, 8]);
  const whites = [60, 62, 64, 65, 67, 69, 71, 72];
  assert.deepEqual(snapshots.at(-1), whites);
  snapshots.length = 0;
  await e.playSequence(blackKeyIntroduction, 1, false);
  assert.deepEqual(snapshots.map(labels => labels.length), [9, 10, 11, 12, 13]);
  assert.deepEqual(Array.from(e.visiblePianoLabelMidi), [...whites, 61, 63, 66, 68, 70]);
  await e.playTone('Ab4', 1);
  assert.equal(e.visiblePianoLabelMidi.size, 13, 'replaying a key retains earlier labels');
  e.hidePiano();
  assert.equal(e.visiblePianoLabelMidi.size, 0);
});

test('Inspector seeks restore earlier key labels silently, while canceled playback cannot reveal a stale label', async () => {
  const { environment: e } = harness();
  e.seeking = true; e.pianoPlayback = true;
  e.ensureAudioContext = async () => { throw new Error('Seeking must not play audio'); };
  await e.playSequence(pianoWhiteKeys, 1, false);
  await e.playSequence(blackKeyIntroduction.slice(0, 2), 1, false);
  assert.deepEqual(Array.from(e.visiblePianoLabelMidi), [60, 62, 64, 65, 67, 69, 71, 72, 61, 63]);
  e.hidePiano(); e.seeking = false;
  let resume!: () => void;
  e.waitForPlayback = async () => new Promise<boolean>(resolve => { resume = () => resolve(true); });
  let completeAudio!: (context: any) => void;
  e.ensureAudioContext = async () => new Promise(resolve => { completeAudio = resolve; });
  const playback = e.playTone('Ab4', 1); await flush();
  assert.equal(e.visiblePianoLabelMidi.size, 0, 'waiting for playback leaves labels hidden');
  resume(); await flush();
  e.sequenceToken++;
  completeAudio({ currentTime: 10 }); await playback;
  assert.equal(e.visiblePianoLabelMidi.size, 0, 'canceled audio startup cannot reveal a label');
  e.seeking = true;
  await e.playTone('Ab4', 1);
  assert.equal(e.visiblePianoLabelMidi.size, 0, 'stale seek tokens cannot restore labels');
});

test('the Section completes inside b after the black-key passage', async () => {
  const { environment: e, events } = harness('white-keys/piano-playback');
  e.runBlackKeysIntroduction = async () => { events.push('black-key-passage'); };
  e.finishSection = async () => { events.push('complete'); };
  e.inspector = { status: (status: string) => events.push(`status:${status}`) };
  await e.runAccidentals(1);
  assert.equal(e.showPiano, false);
  assert.deepEqual(events.slice(-4), ['black-key-passage', 'mark:finish', 'complete', 'status:completed']);
});
