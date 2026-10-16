import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importMidiTiming, shiftBeatTimes, withBeatTimes } from '../src/beatMap.js';
import { createBoomwhackerVideoBuilderProject } from '../src/project.js';
import { deriveGuideLines, deriveTimedNotes, deriveTimingModel } from '../src/timing.js';
import { parseBoomwhackerVideoBuilderProject, serializeBoomwhackerVideoBuilderProject } from '../src/serialization.js';

const base = () => createBoomwhackerVideoBuilderProject().songTiming;
const grid = { defaultMacrobeatGrouping: 2 as const };
const vlq = (value: number): number[] => {
  const bytes = [value & 127];
  while ((value >>>= 7)) bytes.unshift((value & 127) | 128);
  return bytes;
};
const track = (data: number[]) => [77, 84, 114, 107, (data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255, ...data];
const midi = (tracks: number[][], format = 0) => new Uint8Array([77, 84, 104, 100, 0, 0, 0, 6, 0, format, 0, tracks.length, 1, 224, ...tracks.flatMap(track)]);
const tempo = [0, 255, 81, 3, 7, 161, 32]; // 120 quarter notes/minute
const signature = [0, 255, 88, 4, 4, 2, 24, 8];
const end = [255, 47, 0];

test('integrates changes inside beats and ignores placeholder notes', () => {
  const timing = importMidiTiming(midi([[
    ...signature, ...tempo,
    0, 144, 0, 1,
    ...vlq(240), 255, 81, 3, 15, 66, 64, // change to 60 halfway through beat 1
    ...vlq(720), 128, 0, 0,
    0, ...end,
  ]]), 'tempo.mid', base());
  assert.deepEqual(timing.beatTimesSec, [0, 0.75, 1.75]);
  assert.equal(timing.firstDownbeatIndex, null);
  assert.equal(deriveGuideLines(deriveTimingModel(timing, grid)).filter(guide => guide.kind === 'measure').length, 0);
});

test('merges conductor track tempo with a format 1 duration track and running status', () => {
  const timing = importMidiTiming(midi([
    [...signature, ...tempo, 0, ...end],
    [0, 144, 60, 1, ...vlq(480), 60, 0, ...vlq(480), ...end],
  ], 1), 'multi.mid', base());
  assert.deepEqual(timing.beatTimesSec, [0, 0.5, 1]);
});

test('6/8 creates eighth-note grid beats, with no implicit downbeats', () => {
  const timing = importMidiTiming(midi([[0, 255, 88, 4, 6, 3, 24, 8, ...tempo, ...vlq(1440), ...end]]), 'six.mid', base());
  assert.equal(timing.beatCount, 6);
  assert.equal(timing.beatTimesSec[1], 0.25);
  assert.equal(timing.firstDownbeatIndex, null);
});

test('count-in and silent lead-in default off, with no extra time or guides', () => {
  const songTiming = withBeatTimes(base(), [0, 0.5, 1]);
  const timing = deriveTimingModel(songTiming, grid);
  assert.equal(songTiming.countInEnabled, false);
  assert.equal(songTiming.silentLeadInEnabled, false);
  assert.equal(timing.countInBeats, 0);
  assert.equal(timing.countInLeadInBeats, 0);
  assert.equal(timing.countInDurationSec, 0);
  assert.equal(timing.countInStartTimeSec, 0);
  assert.ok(deriveGuideLines(timing).every(guide => guide.kind !== 'count-in'));
});

test('count-in and silent lead-in can be enabled independently without shifting notes', () => {
  for (const countInEnabled of [false, true]) {
    for (const silentLeadInEnabled of [false, true]) {
      const songTiming = withBeatTimes({ ...base(), countInEnabled, silentLeadInEnabled }, [0, 0.5, 1]);
      const timing = deriveTimingModel(songTiming, grid);
      const duration = (Number(countInEnabled) * 4 + Number(silentLeadInEnabled)) * 0.5;
      assert.equal(timing.countInDurationSec, duration);
      assert.equal(timing.countInStartTimeSec, duration === 0 ? 0 : -duration);
      assert.equal(timing.slotBoundaries[0].timeSec, 0);
      assert.equal(timing.slotBoundaries[4].timeSec, 0.5);
      const guides = deriveGuideLines(timing).filter(guide => guide.kind === 'count-in');
      assert.deepEqual(guides.map(guide => guide.timeSec), countInEnabled ? [-2, -1.5, -1, -0.5] : []);
      assert.equal(guides.length, countInEnabled ? 4 : 0);
    }
  }
});

test('explicit lead-in choices persist, while earlier implicit count-ins load disabled', () => {
  const project = createBoomwhackerVideoBuilderProject();
  project.songTiming = withBeatTimes({ ...base(), midiFileName: 'tempo.mid', countInEnabled: true, silentLeadInEnabled: true }, [0, 0.5, 1]);
  const restored = parseBoomwhackerVideoBuilderProject(serializeBoomwhackerVideoBuilderProject(project));
  assert.equal(restored.songTiming.countInEnabled, true);
  assert.equal(restored.songTiming.silentLeadInEnabled, true);
  const previous = JSON.parse(JSON.stringify(project));
  delete previous.songTiming.countInEnabled;
  delete previous.songTiming.silentLeadInEnabled;
  previous.songTiming.countInBeats = 4;
  const normalized = parseBoomwhackerVideoBuilderProject(JSON.stringify(previous));
  const timing = deriveTimingModel(normalized.songTiming, grid);
  assert.equal(timing.countInDurationSec, 0);
  assert.equal(timing.countInStartTimeSec, 0);
  assert.deepEqual(normalized.songTiming.beatTimesSec, project.songTiming.beatTimesSec);
});

test('metronome defaults off and click-only preview choices survive save and load', () => {
  const project = createBoomwhackerVideoBuilderProject();
  assert.equal(project.previewState.playMetronome, false);
  project.previewState = { ...project.previewState, playAudio: false, playGrid: false, playMetronome: true, metronomeVolume: 0.35 };
  const restored = parseBoomwhackerVideoBuilderProject(serializeBoomwhackerVideoBuilderProject(project));
  assert.equal(restored.previewState.playGrid, false);
  assert.equal(restored.previewState.playMetronome, true);
  assert.equal(restored.previewState.metronomeVolume, 0.35);
});

test('first downbeat is explicit; changing meter regenerates subsequent measure guides', () => {
  const timing = withBeatTimes({ ...base(), firstDownbeatIndex: 2 }, Array.from({ length: 14 }, (_, i) => i / 2));
  const measures = (numerator: number) => deriveGuideLines(deriveTimingModel({ ...timing, timeSignatureNumerator: numerator }, grid))
    .filter(guide => guide.kind === 'measure').map(guide => [guide.beatIndex, guide.label]);
  assert.deepEqual(measures(4), [[2, '1'], [6, '2'], [10, '3']]);
  assert.deepEqual(measures(3), [[2, '1'], [5, '2'], [8, '3'], [11, '4']]);
});

test('group movement preserves spacing and clamps as one unit at unselected neighbors', () => {
  const original = [0, 0.5, 1.2, 2, 2.5];
  const moved = shiftBeatTimes(original, [1, 2], 8);
  assert.ok(Math.abs((moved[2] - moved[1]) - 0.7) < 1e-12);
  assert.ok(moved[2] < moved[3]);
  assert.equal(moved[0], original[0]);
  assert.equal(moved[3], original[3]);
  assert.deepEqual(shiftBeatTimes(original, [0, 1, 2, 3, 4], -20), original);
  assert.ok(Math.abs(shiftBeatTimes(original, [1], -20)[1] - 0.01) < 1e-12);
  assert.deepEqual(original, [0, 0.5, 1.2, 2, 2.5]);
});

test('notes stay on their slots through timing edits, snapshot undo and project round trips', () => {
  const project = createBoomwhackerVideoBuilderProject();
  project.songTiming = withBeatTimes({ ...base(), midiFileName: 'test.mid', firstDownbeatIndex: 1 }, [0, 0.5, 1.2, 2]);
  project.notes.placedNotes = [{ id: 'note', row: 0, noteId: 'C', pitchInterval: 0, color: '#fff', shape: 'diamond', startSlotIndex: 5, endSlotIndex: 6 }];
  const before = deriveTimedNotes(project.notes.placedNotes, deriveTimingModel(project.songTiming, grid))[0];
  const changed = { ...project, songTiming: withBeatTimes(project.songTiming, shiftBeatTimes(project.songTiming.beatTimesSec, [1, 2], 0.2)) };
  const restored = parseBoomwhackerVideoBuilderProject(serializeBoomwhackerVideoBuilderProject(changed));
  assert.deepEqual(restored.songTiming, changed.songTiming);
  assert.deepEqual(restored.notes.placedNotes.map(n => [n.startSlotIndex, n.endSlotIndex]), [[5, 6]]);
  const after = deriveTimedNotes(restored.notes.placedNotes, deriveTimingModel(restored.songTiming, grid))[0];
  assert.ok(Math.abs(after.startTimeSec - before.startTimeSec - 0.2) < 1e-12);
  assert.equal(deriveTimedNotes(project.notes.placedNotes, deriveTimingModel(project.songTiming, grid))[0].startTimeSec, before.startTimeSec);
});

test('invalid timing, obsolete projects, malformed MIDI and unsupported meters are rejected', () => {
  assert.throws(() => withBeatTimes(base(), [0, 1, 1]));
  assert.throws(() => withBeatTimes(base(), [0, NaN]));
  assert.throws(() => withBeatTimes(base(), [-1, 0]));
  assert.throws(() => parseBoomwhackerVideoBuilderProject(JSON.stringify({ metadata: { schemaVersion: 5 } })), /unsupported format/);
  const good = midi([[...tempo, ...vlq(480), ...end]]);
  for (let length = 0; length < good.length; length++) assert.throws(() => importMidiTiming(good.slice(0, length), 'bad.mid', base()));
  assert.throws(() => importMidiTiming(midi([[...signature, ...tempo, ...vlq(480), 255, 88, 4, 3, 2, 24, 8, ...vlq(480), ...end]]), 'change.mid', base()), /changes time signature/);
  const smpte = good.slice(); smpte[12] = 128;
  assert.throws(() => importMidiTiming(smpte, 'smpte.mid', base()), /musical tick/);
});

if (process.env.BVB_TEST_MIDI) {
  test('provided Dr. Rubato EETV MIDI imports its variable timing without notes or downbeats', () => {
    const timing = importMidiTiming(readFileSync(process.env.BVB_TEST_MIDI!), 'EETV Intro Audio_tempo_ableton.mid', base());
    assert.equal(timing.timeSignatureNumerator, 4);
    assert.equal(timing.timeSignatureDenominator, 4);
    assert.equal(timing.beatCount, 215);
    assert.equal(timing.firstDownbeatIndex, null);
    assert.ok(Math.abs(timing.beatTimesSec[4] - 1.299996) < 1e-6);
    assert.ok(timing.beatTimesSec.at(-1)! > 75.38 && timing.beatTimesSec.at(-1)! < 75.8);
    assert.ok(new Set(timing.beatTimesSec.slice(1).map((time, i) => (time - timing.beatTimesSec[i]).toFixed(5))).size > 3);
  });
}
