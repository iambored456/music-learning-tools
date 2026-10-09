import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { fullRowData } from '@mlt/pitch-data';
import { lessonPacing } from '@mlt/lesson-kit';
import { blackKeyIntroduction, blackKeyDescent, blackKeyNoteColumns, blackKeySpeech } from '../src/lesson12BlackKeys';
import { lesson12Cues, getLesson12SeekTarget } from '../src/lesson12Cues';
import { pianoLessonRange } from '../src/lesson12PianoRange';

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
const declarations = ['clearBlackKeyLabels', 'blackKeyLabelArrived', 'showBlackKeyNote', 'addBlackKeyNoteName', 'revealBlackKeyLabel', 'runBlackKeysIntroduction'].map(name => {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`);
  return node.getText(script);
}).join('\n');
const heldTone = script.statements.filter(ts.isVariableStatement)
  .flatMap(statement => [...statement.declarationList.declarations])
  .find(declaration => declaration.name.getText(script) === 'heldBlackKeyTone')?.initializer;
assert.ok(heldTone && ts.isCallExpression(heldTone));
const javascript = ts.transpileModule(`${declarations}\nfunction getHeldBlackKeyTone() { return ${heldTone.arguments[0].getText(script)}; }`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function flush() { for (let i = 0; i < 70; i++) await Promise.resolve(); }

function harness(seekTarget?: string) {
  const events: string[] = [];
  const pianoSounds: string[] = [];
  const bubbles: Array<{ text: string; upper: string; promote: boolean }> = [];
  const speechHighlights: Array<{ text: string; tone: string | null }> = [];
  const speechNoteLabels: Array<{ text: string; label: string | undefined }> = [];
  const context: any = {
    sequenceToken: 1, seeking: Boolean(seekTarget),
    section: { id: 'accidentals' }, activeCueId: null, activeActionId: null, isPlaying: true,
    displayNotes: [], blackKeyLabels: [], blackKeyLabelVersion: 0, resolveLegendArrival: null,
    letterLegendOnly: true, accidentalMode: {}, upperNarrationText: '', narrationText: '',
    animateSpeechPromotion: false, pianoPlayback: false, legendMidiLabelOverrides: new Map(),
    hiddenLegendMidi: new Set(),
    displayRows: fullRowData.filter(row => row.midi! >= pianoLessonRange.minMidi && row.midi! <= pianoLessonRange.maxMidi),
    sourceRowByTone: new Map(fullRowData.map(row => [row.toneNote, row])),
    blackKeyIntroduction, blackKeyDescent, blackKeyNoteColumns, blackKeySpeech, lessonPacing,
    isCurrentSequence: (token: number) => token === context.sequenceToken,
    setDisplayNotes: (notes: unknown[]) => { context.displayNotes = notes; },
    mark: (cue: string, action: string) => {
      if (context.seeking && `${cue}/${action}` === seekTarget) context.seeking = false;
      if (!context.seeking) { context.activeCueId = cue; context.activeActionId = action; }
      events.push(`mark:${action}`);
    },
    waitMs: async (_ms: number, token: number) => token === context.sequenceToken,
    playTone: async (tone: string) => {
      if (!context.seeking) {
        events.push(`play:${tone}`);
        if (context.pianoPlayback) pianoSounds.push(tone);
      }
    },
    say: async (text: string) => {
      context.narrationText = text;
      if (!context.seeking) {
        events.push(`speech:${text}`);
        bubbles.push({ text, upper: context.upperNarrationText, promote: context.animateSpeechPromotion });
        speechHighlights.push({ text, tone: context.getHeldBlackKeyTone() });
        speechNoteLabels.push({ text, label: context.displayNotes.find((note: any) => note.toneNote === 'Ab4')?.label });
      }
    },
  };
  runInNewContext(javascript, context);
  const arrive = () => {
    const label = context.blackKeyLabels.at(-1);
    events.push(`arrival:${label.toneNote}:${label.text}`);
    context.blackKeyLabelArrived(label.version, context.sequenceToken);
  };
  return { context, events, bubbles, arrive, pianoSounds, speechHighlights, speechNoteLabels };
}

test('Sharps and Flats has only white-key and black-key Segments with seekable actions', () => {
  const plan = lesson12Cues.accidentals;
  assert.deepEqual(plan.map(cue => cue.id), ['white-keys', 'black-keys']);
  for (const id of ['flat-names', 'sharp-names', 'two-names', 'review-directions']) assert.equal(getLesson12SeekTarget(plan, id), null);
  for (const action of plan[1].actions!) assert.ok(getLesson12SeekTarget(plan, 'black-keys', action.id));
  assert.deepEqual(blackKeyIntroduction.map(note => fullRowData.find(row => row.toneNote === note)!.midi), [61, 63, 66, 68, 70]);
  const descending = blackKeyDescent.map(note => fullRowData.find(row => row.toneNote === note)!.midi!);
  assert.deepEqual(descending, [70, 68, 66, 63, 61]);
  assert.ok(descending.every(midi => midi >= pianoLessonRange.minMidi && midi <= pianoLessonRange.maxMidi));
});

test('circles expand only for combined names; arrivals reveal labels with persistent fills and sound', async () => {
  const h = harness();
  const passage = h.context.runBlackKeysIntroduction(1);
  await flush();
  assert.deepEqual(h.events.filter(event => event.startsWith('play:')), blackKeyIntroduction.map(note => `play:${note}`));
  assert.equal(h.context.displayNotes.length, 5);
  assert.ok(h.context.displayNotes.every((note: any) => note.widthColumns === undefined));
  assert.equal(h.context.blackKeyLabels.at(-1).text, 'A♭');
  assert.ok(h.context.displayNotes.every((note: any) => note.label === ''), 'circle labels start hidden');
  assert.equal(h.context.activeActionId, 'flat-example', 'the A cell moves during b.9');
  assert.equal(h.context.blackKeyLabels.at(-1).sourceToneNote, 'A4');
  const stadiumId = h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4').id;
  assert.equal(h.context.hiddenLegendMidi.has(68), true, 'the canvas must not duplicate the animated cell background or text');
  assert.equal(h.context.hiddenLegendMidi.size, 5, 'only the five C4–C5 black-key cells animate');
  h.arrive();
  await flush();
  assert.equal(h.events.filter(event => event === 'play:Ab4').length, 2);
  assert.equal(h.context.blackKeyLabels.at(-1).text, 'G♯');
  const stadium = h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4');
  assert.equal(stadium.id, stadiumId);
  assert.equal(stadium.label, 'A♭', 'the sharp-label entrance retains the introduced flat name');
  assert.equal(stadium.widthColumns, undefined, 'the flat name fits inside a circle');
  assert.equal(stadium.highlighted, true);
  assert.equal(h.context.activeActionId, 'sharp-example', 'the G cell moves during b.12');
  assert.equal(h.context.blackKeyLabels.at(-1).sourceToneNote, 'G4');
  assert.equal(h.context.getHeldBlackKeyTone(), 'Ab4', 'hold the fill while the sharp label slides in');
  h.context.isPlaying = false;
  assert.equal(h.context.getHeldBlackKeyTone(), 'Ab4', 'pausing retains the teaching highlight');
  h.context.isPlaying = true;
  assert.deepEqual(h.bubbles.find(bubble => bubble.text === blackKeySpeech.flatDirection[0]), {
    text: blackKeySpeech.flatDirection[0], upper: blackKeySpeech.flatExample[0], promote: true,
  });
  h.arrive();
  await flush();
  const namedStadium = h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4');
  assert.equal(namedStadium.label, 'A♭/G♯');
  assert.equal(namedStadium.widthColumns, blackKeyNoteColumns, 'b.12 introduces the first stadium');
  assert.equal(namedStadium.highlighted, true);
  assert.deepEqual(h.bubbles.find(bubble => bubble.text === blackKeySpeech.sharpDirection[0]), {
    text: blackKeySpeech.sharpDirection[0], upper: blackKeySpeech.sharpExample[0], promote: true,
  });
  for (const text of [blackKeySpeech.flatExample[0], blackKeySpeech.flatDirection[0], blackKeySpeech.sharpExample[0]]) {
    assert.equal(h.speechHighlights.find(item => item.text === text)?.tone, 'Ab4');
  }
  assert.equal(h.speechHighlights.find(item => item.text === blackKeySpeech.sharpDirection[0])?.tone, null,
    'the temporary teaching highlight ends; the named note keeps its constant fill');
  assert.equal(h.speechNoteLabels.find(item => item.text === blackKeySpeech.flatExample[0])?.label, '');
  assert.equal(h.speechNoteLabels.find(item => item.text === blackKeySpeech.flatDirection[0])?.label, 'A♭');
  assert.equal(h.speechNoteLabels.find(item => item.text === blackKeySpeech.sharpExample[0])?.label, 'A♭');
  assert.equal(h.speechNoteLabels.find(item => item.text === blackKeySpeech.sharpDirection[0])?.label, 'A♭/G♯');
  for (const note of blackKeyDescent) {
    const sounds = h.events.filter(event => event.startsWith('play:')).length;
    assert.equal(h.context.blackKeyLabels.at(-1).toneNote, note);
    assert.equal(h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4').highlighted, true);
    assert.equal(h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4').label, 'A♭/G♯',
      'keep accumulated names through the descending replay');
    assert.equal(h.context.blackKeyLabels.at(-1).text, h.context.sourceRowByTone.get(note).pitch.replace(/\d+$/, ''),
      'the animated cell uses the same compact label as the final canvas legend');
    h.arrive();
    await flush();
    assert.equal(h.events.filter(event => event.startsWith('play:')).length, sounds + 1);
    const named = h.context.displayNotes.find((item: any) => item.toneNote === note);
    assert.equal(named.label, h.context.sourceRowByTone.get(note).pitch.replace(/\d+$/, ''));
    assert.equal(named.highlighted, true, 'each newly labelled note retains its fill');
    assert.equal(named.widthColumns, blackKeyNoteColumns);
  }
  await passage;
  assert.deepEqual(h.pianoSounds, [...blackKeyIntroduction, 'Ab4', 'Ab4', ...blackKeyDescent],
    'every introduction, naming-example, and descending note also plays on the piano');
  assert.equal(h.context.pianoPlayback, false);
  assert.equal(h.context.resolveLegendArrival, null);
  assert.equal(h.context.blackKeyLabels.length, 0);
  assert.equal(h.context.hiddenLegendMidi.size, 0, 'the canvas cells return after the animated replacements clear');
  assert.ok(h.context.displayNotes.every((note: any) => note.label.includes('/') && note.highlighted));
});

test('canceling or seeking during a label entrance cannot play the old pitch', async () => {
  const h = harness();
  const label = h.context.revealBlackKeyLabel('Ab4', 'A♭4', 1);
  const oldVersion = h.context.blackKeyLabelVersion;
  assert.equal(h.events.length, 0);
  h.context.sequenceToken++;
  h.context.clearBlackKeyLabels();
  h.context.blackKeyLabelArrived(oldVersion, 1);
  await label;
  assert.equal(h.events.length, 0);
});

test('Inspector seeks restore earlier labels instantly and wait only for the selected arrival', async () => {
  const h = harness('black-keys/sharp-label');
  const passage = h.context.runBlackKeysIntroduction(1);
  await flush();
  assert.equal(h.context.seeking, false);
  assert.equal(h.context.displayNotes.length, 5);
  assert.equal(h.context.blackKeyLabels.at(-1).instant, false);
  assert.equal(h.context.blackKeyLabels.at(-1).text, 'G♯');
  assert.equal(h.context.getHeldBlackKeyTone(), 'Ab4', 'a seek into b.11 restores the held highlight');
  assert.equal(h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4').label, 'A♭',
    'a seek into b.11 restores only the name already introduced');
  assert.deepEqual(h.events.filter(event => event.startsWith('play:')), []);
  h.arrive();
  await flush();
  assert.deepEqual(h.events.filter(event => event.startsWith('play:')), ['play:Ab4']);
  h.context.sequenceToken++;
  h.context.clearBlackKeyLabels();
  await passage;
  assert.equal(h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4').label, 'A♭/G♯',
    'after the sharp explanation both names remain visible');
});

test('canceling before the sharp label arrives cannot reveal its name inside the stadium note', async () => {
  const h = harness('black-keys/sharp-label');
  const passage = h.context.runBlackKeysIntroduction(1); await flush();
  assert.equal(h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4').label, 'A♭');
  const oldVersion = h.context.blackKeyLabelVersion;
  h.context.sequenceToken++; h.context.clearBlackKeyLabels();
  h.context.blackKeyLabelArrived(oldVersion, 1); await passage;
  assert.equal(h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4').label, 'A♭');
});

test('seeking into either explanation restores earlier names and waits for the selected cell to reveal its name', async () => {
  for (const [action, text, before, after] of [
    ['flat-example', blackKeySpeech.flatExample[0], '', 'A♭'],
    ['sharp-example', blackKeySpeech.sharpExample[0], 'A♭', 'A♭/G♯'],
  ]) {
    const h = harness(`black-keys/${action}`);
    let finishSpeech!: () => void;
    h.context.say = async (spoken: string) => {
      if (!h.context.seeking && spoken === text) await new Promise<void>(resolve => { finishSpeech = resolve; });
    };
    const passage = h.context.runBlackKeysIntroduction(1); await flush();
    assert.equal(h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4').label, before);
    assert.ok(h.context.displayNotes.filter((note: any) => note.toneNote !== 'Ab4').every((note: any) => note.label === ''));
    assert.equal(h.events.filter(event => event.startsWith('play:')).length, 0, 'restoring names does not play earlier sounds');
    h.arrive(); await flush();
    assert.equal(h.context.displayNotes.find((note: any) => note.toneNote === 'Ab4').label, after);
    h.context.sequenceToken++; h.context.clearBlackKeyLabels(); finishSpeech(); await passage;
  }
});

test('seeking into the descending replay restores the previously named, filled notes', async () => {
  const h = harness('black-keys/descend-Gb4');
  const passage = h.context.runBlackKeysIntroduction(1); await flush();
  for (const toneNote of ['Ab4', 'Bb4']) {
    const note = h.context.displayNotes.find((note: any) => note.toneNote === toneNote);
    assert.ok(note.label.includes('/') && note.highlighted && note.widthColumns === blackKeyNoteColumns);
  }
  for (const toneNote of ['Gb4', 'Eb4', 'Db4']) {
    const note = h.context.displayNotes.find((note: any) => note.toneNote === toneNote);
    assert.equal(note.label, ''); assert.equal(note.widthColumns, undefined);
  }
  h.arrive(); await flush();
  assert.equal(h.context.displayNotes.find((note: any) => note.toneNote === 'Gb4').label, 'G♭/F♯');
  h.context.sequenceToken++; h.context.clearBlackKeyLabels(); await passage;
});

test('the held fill clears when the Inspector resets or changes to another section', () => {
  const h = harness();
  Object.assign(h.context, { activeCueId: 'black-keys', activeActionId: 'flat-example' });
  assert.equal(h.context.getHeldBlackKeyTone(), 'Ab4');
  h.context.activeCueId = null; h.context.activeActionId = null;
  assert.equal(h.context.getHeldBlackKeyTone(), null);
  Object.assign(h.context, { activeCueId: 'black-keys', activeActionId: 'sharp-example', section: { id: 'naming-practice' } });
  assert.equal(h.context.getHeldBlackKeyTone(), null);
});
