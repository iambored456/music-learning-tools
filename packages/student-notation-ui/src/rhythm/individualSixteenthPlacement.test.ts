import { beforeEach, describe, expect, it, vi } from 'vitest';
import { convertToSnapshot, convertFromSnapshot, notesOverlap } from '@mlt/handoff';
import { createStore } from '@mlt/student-notation-engine';
import { getNoteEndColumn, type CanvasSpaceColumn, type PlacedNote } from '@mlt/types';
import store from '@state/initStore.ts';
import columnMapService, { canvasToTime, timeToCanvas } from '@services/columnMapService.ts';
import { canPlaceIndividualSixteenth, canPlaceStampAlongsideIndividuals } from './individualSixteenthPlacement.ts';
import { PitchGridNoteToolInteractor } from '@components/canvas/PitchGrid/interactors/tools/PitchGridNoteToolInteractor.ts';
import { parseImportedStudentNotationData, serializeStudentNotationScoreFile } from '@services/studentNotationScoreFile.ts';

vi.mock('@state/initStore.ts', async () => {
  const { createStore } = await import('@mlt/student-notation-engine');
  return { default: createStore() };
});
vi.mock('@services/audioPreviewService.ts', () => ({ default: { triggerAttack: vi.fn(() => true), quickReleasePitches: vi.fn() } }));
vi.mock('@components/audio/adsr/adsrPlayheadCanvas.ts', () => ({ triggerAdsrPlayhead: vi.fn() }));
vi.mock('@services/rhythmPlaybackService.ts', () => ({ default: { getSixteenthStampAtPosition: vi.fn(() => null) } }));

const color = '#44bcef';
const col = (n: number) => n as CanvasSpaceColumn;
const note = (start: number, extras: Partial<PlacedNote> = {}): PlacedNote => ({
  uuid: `note-${start}`, row: 10, globalRow: 10, startColumnIndex: col(start), endColumnIndex: col(start),
  durationMicrobeats: 0.5, shape: 'diamond', color, ...extras
});
const interaction = () => ({ activeNote: null, lastDragRow: null, activePreviewPitches: [] });
const options = { getPitchForRow: () => 'C4' };

beforeEach(() => {
  Object.assign(store.state, createStore().state, { macrobeatGroupings: [2, 2], macrobeatBoundaryStyles: ['solid'],
    columnWidths: [1, 1, 1, 1], musicalColumnWidths: [1, 1, 1, 1], tonicSignGroups: {} });
  store.setSelectedNote('diamond', color);
  store.setSelectedTool('note');
  columnMapService.invalidate();
});

describe('individual sixteenths', () => {
  it.each([0, 0.5, 1, 1.5, 3.5])('places a half-microbeat note at %s', start => {
    const result = new PitchGridNoteToolInteractor().attemptPlaceNoteAt(start, 10, interaction(), new Set(), options);
    expect(result.placed).toBe(true);
    expect(result.state.activeNote?.startColumnIndex).toBe(start);
    expect(getNoteEndColumn(result.state.activeNote!)).toBe(start + 0.5);
    expect(result.state.activeNote?.globalRow).toBe(10);
  });

  it.each([-0.5, 0.25, 4, NaN])('rejects invalid position %s', start => {
    expect(canPlaceIndividualSixteenth(store.state, start, 10, color)).toBe(false);
  });

  it('allows adjacent notes and other pitches/voices but blocks overlapping ordinary notes', () => {
    store.state.placedNotes = [note(0), note(2, { shape: 'circle', durationMicrobeats: undefined, endColumnIndex: col(3) })];
    expect(canPlaceIndividualSixteenth(store.state, 0, 10, color)).toBe(false);
    expect(canPlaceIndividualSixteenth(store.state, 0.5, 10, color)).toBe(true);
    expect(canPlaceIndividualSixteenth(store.state, 3.5, 10, color)).toBe(false);
    expect(canPlaceIndividualSixteenth(store.state, 0, 11, color)).toBe(true);
    expect(canPlaceIndividualSixteenth(store.state, 0, 10, '#81c273')).toBe(true);
  });

  it('checks stamp slots and per-shape pitches, leaving rests available', () => {
    store.state.sixteenthStampPlacements = [{ id: 'stamp', sixteenthStampId: 5, startTimeIndex: 0, row: 10,
      globalRow: 10, color, timestamp: 0, shapeOffsets: { diamond_1: 2 } }];
    expect(canPlaceIndividualSixteenth(store.state, 0, 10, color)).toBe(false);
    expect(canPlaceIndividualSixteenth(store.state, 0.5, 10, color)).toBe(true);
    expect(canPlaceIndividualSixteenth(store.state, 0.5, 12, color)).toBe(false);
    expect(canPlaceIndividualSixteenth(store.state, 1, 10, color)).toBe(true);
  });

  it('also blocks three-sixteenth and triplet stamp notes', () => {
    store.state.sixteenthThreeStampPlacements = [{ id: 'three', sixteenthThreeStampId: 1, startTimeIndex: 1.5, row: 10, color, timestamp: 0 }];
    expect(canPlaceIndividualSixteenth(store.state, 1.5, 10, color)).toBe(false);
    store.state.sixteenthThreeStampPlacements = [];
    store.state.tripletStampPlacements = [{ id: 'triplet', tripletStampId: 1, startTimeIndex: 0, row: 10, color, span: 1, timestamp: 0 }];
    expect(canPlaceIndividualSixteenth(store.state, 0.5, 10, color)).toBe(false);
    expect(canPlaceIndividualSixteenth(store.state, 1, 10, color)).toBe(true);
  });

  it('blocks stamp placement over an individual, while allowing empty slots and other voices', () => {
    store.state.placedNotes = [note(0.5)];
    expect(canPlaceStampAlongsideIndividuals(store.state, 'sixteenthStamp', 15, 0, 10, color)).toBe(false);
    expect(canPlaceStampAlongsideIndividuals(store.state, 'sixteenthStamp', 1, 0, 10, color)).toBe(true);
    expect(canPlaceStampAlongsideIndividuals(store.state, 'sixteenthStamp', 15, 0, 10, '#81c273')).toBe(true);
  });

  it('keeps half-cell positions outside zero-duration tonic columns', () => {
    store.state.columnWidths = store.state.musicalColumnWidths = [1, 1, 1, 1, 1, 1];
    store.state.tonicSignGroups = { tonic: [{ uuid: 'tonic', columnIndex: col(2), row: 10, globalRow: 10, tonicNumber: 1, preMacrobeatIndex: 0 }] };
    columnMapService.invalidate();
    expect(timeToCanvas(1.5, store.state)).toBe(1.5);
    expect(canvasToTime(1.5, store.state)).toBe(1.5);
    expect(canvasToTime(2.5, store.state)).toBeNull();
    expect(canPlaceIndividualSixteenth(store.state, 2.5, 10, color)).toBe(false);
    expect(canPlaceIndividualSixteenth(store.state, 3.5, 10, color)).toBe(false);
    expect(timeToCanvas(2.5, store.state)).toBe(4.5);
    expect(canPlaceIndividualSixteenth(store.state, 4.5, 10, color)).toBe(true);
  });

  it('drags a note to a half-cell and another pitch without stretching it', () => {
    const tool = new PitchGridNoteToolInteractor();
    const placed = tool.attemptPlaceNoteAt(0, 10, interaction(), new Set(), options);
    const moved = tool.handleActiveNoteDrag(1.5, 12, placed.state, options);
    expect(moved.activeNote).toMatchObject({ startColumnIndex: 1.5, endColumnIndex: 1.5, row: 12, globalRow: 12, durationMicrobeats: 0.5 });
    const clicked = tool.handleExistingNoteMouseDown(1.5, 12, interaction(), options);
    expect(clicked.state.activeNote?.uuid).toBe(moved.activeNote?.uuid);
  });

  it('blocks a drag into another note and permits staying on itself', () => {
    const tool = new PitchGridNoteToolInteractor();
    const placed = tool.attemptPlaceNoteAt(0, 10, interaction(), new Set(), options);
    store.state.placedNotes.push(note(1.5));
    tool.handleActiveNoteDrag(1.5, 10, placed.state, options);
    expect(placed.state.activeNote?.startColumnIndex).toBe(0);
    expect(canPlaceIndividualSixteenth(store.state, 0, 10, color, placed.state.activeNote!.uuid)).toBe(true);
  });

  it('erases a note in the second half of the final brush column', () => {
    store.state.placedNotes = [note(1.5), note(2)];
    store.eraseInPitchArea(col(0), 10, 2, false);
    expect(store.state.placedNotes.map(n => n.startColumnIndex)).toEqual([2]);
  });

  it('round-trips fractional positions and durations through score files', () => {
    store.state.placedNotes = [note(0.5), note(3.5)];
    const imported = parseImportedStudentNotationData(serializeStudentNotationScoreFile(store.state));
    expect(imported.data.placedNotes.map(n => [n.startColumnIndex, n.durationMicrobeats])).toEqual([[0.5, 0.5], [3.5, 0.5]]);
  });

  it('retains sixteenth timing through handoff and detects mixed-duration overlaps', () => {
    store.state.placedNotes = [note(0.5), note(1)];
    const snapshot = convertToSnapshot(store.state);
    const notes = snapshot.voices[0]!.notes;
    expect(notes[0]).toMatchObject({ startMicrobeatCol: 0.5, durationMicrobeats: 0.5 });
    expect(notesOverlap(notes[0]!, notes[1]!)).toBe(false);
    expect(notesOverlap({ ...notes[0]!, startMicrobeatCol: 0, endMicrobeatCol: 0, durationMicrobeats: undefined }, notes[0]!)).toBe(true);
    const restored = convertFromSnapshot(snapshot, store.state.fullRowData, store.state.pitchRange);
    expect(restored[0]).toMatchObject({ startColumnIndex: 0.5, durationMicrobeats: 0.5 });
  });

  it('undoes and redoes single-note placement without losing its duration', () => {
    store.recordState();
    store.addNote(note(0.5));
    store.recordState();
    store.undo();
    expect(store.state.placedNotes).toHaveLength(0);
    store.redo();
    expect(store.state.placedNotes[0]).toMatchObject({ startColumnIndex: 0.5, durationMicrobeats: 0.5 });
  });
});
