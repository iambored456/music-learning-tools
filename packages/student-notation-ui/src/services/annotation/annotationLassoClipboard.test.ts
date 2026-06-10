import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AppState,
  LassoSelection,
  PlacedNote,
  SixteenthStampPlacement,
  SixteenthThreeStampPlacement,
  TripletStampPlacement
} from '@mlt/types';

vi.mock('@components/canvas/PitchGrid/renderers/rendererUtils.ts', () => ({
  getColumnX: (column: number, options: { cellWidth: number }) => column * options.cellWidth,
  getRowY: (row: number, options: { cellHeight: number }) => row * options.cellHeight
}));

vi.mock('@services/columnMapService.ts', () => ({
  canvasToTime: (canvasIndex: number) => canvasIndex,
  timeToCanvas: (timeIndex: number) => timeIndex
}));

vi.mock('@state/initStore.ts', () => ({
  default: {
    state: {}
  }
}));

import { clearLassoClipboard, copyLassoSelection, pasteLassoClipboard } from './annotationLassoClipboard.ts';

function createState(): AppState {
  return {
    placedNotes: [],
    sixteenthStampPlacements: [],
    sixteenthThreeStampPlacements: [],
    tripletStampPlacements: [],
    columnWidths: Array.from({ length: 32 }, () => 1),
    fullRowData: Array.from({ length: 80 }, () => ({})),
    tempoModulationMarkers: [],
    cellWidth: 20,
    cellHeight: 10
  } as unknown as AppState;
}

function createSelection(state: AppState): LassoSelection {
  const note: PlacedNote = {
    uuid: 'note-1',
    row: 10,
    globalRow: 10,
    startColumnIndex: 4 as PlacedNote['startColumnIndex'],
    endColumnIndex: 5 as PlacedNote['endColumnIndex'],
    shape: 'circle',
    color: '#4a90e2'
  };
  const sixteenthStamp: SixteenthStampPlacement = {
    id: 'sixteenth-1',
    sixteenthStampId: 7,
    startTimeIndex: 8,
    row: 12,
    globalRow: 12,
    color: '#4a90e2',
    timestamp: 1,
    shapeOffsets: { diamond_0: 2 }
  };
  const sixteenthThreeStamp: SixteenthThreeStampPlacement = {
    id: 'three-1',
    sixteenthThreeStampId: 7,
    startTimeIndex: 12,
    row: 14,
    globalRow: 14,
    color: '#4a90e2',
    timestamp: 1,
    shapeOffsets: { diamond_2: -1 }
  };
  const tripletStamp: TripletStampPlacement = {
    id: 'triplet-1',
    tripletStampId: 7,
    startTimeIndex: 16,
    span: 1,
    row: 16,
    globalRow: 16,
    color: '#4a90e2',
    timestamp: 1,
    shapeOffsets: { triplet_1: 1 }
  };

  state.placedNotes.push(note);
  state.sixteenthStampPlacements.push(sixteenthStamp);
  state.sixteenthThreeStampPlacements.push(sixteenthThreeStamp);
  state.tripletStampPlacements.push(tripletStamp);

  return {
    selectedItems: [
      { type: 'note', id: 'note-selection', data: note, index: 0 },
      { type: 'sixteenthStamp', id: 'sixteenth-selection', data: sixteenthStamp, index: 0 },
      { type: 'sixteenthThreeStamp', id: 'three-selection', data: sixteenthThreeStamp, index: 0 },
      { type: 'tripletStamp', id: 'triplet-selection', data: tripletStamp, index: 0 }
    ],
    convexHull: null,
    isActive: true
  };
}

describe('annotation lasso clipboard', () => {
  const renderOptions = {
    cellWidth: 20,
    cellHeight: 10,
    columnWidths: Array.from({ length: 32 }, () => 1),
    tempoModulationMarkers: []
  };

  beforeEach(() => {
    clearLassoClipboard();
  });

  it('copies and pastes selected lasso contents with fresh identifiers and a visible selection hull', () => {
    const state = createState();
    const selection = createSelection(state);

    expect(copyLassoSelection(selection)).toBe(4);

    const result = pasteLassoClipboard(state, renderOptions);

    expect(result?.pastedCount).toBe(4);
    expect(result?.selection.isActive).toBe(true);
    expect(result?.selection.convexHull?.length).toBeGreaterThanOrEqual(3);
    expect(result?.selection.selectedItems.map(item => item.type)).toEqual([
      'note',
      'sixteenthStamp',
      'sixteenthThreeStamp',
      'tripletStamp'
    ]);

    const pastedNote = state.placedNotes[1]!;
    expect(pastedNote.uuid).not.toBe('note-1');
    expect(pastedNote.startColumnIndex).toBe(5);
    expect(pastedNote.endColumnIndex).toBe(6);
    expect(pastedNote.row).toBe(11);
    expect(pastedNote.globalRow).toBe(11);

    const pastedSixteenth = state.sixteenthStampPlacements[1]!;
    expect(pastedSixteenth.id).not.toBe('sixteenth-1');
    expect(pastedSixteenth.startTimeIndex).toBe(9);
    expect(pastedSixteenth.row).toBe(13);
    expect(pastedSixteenth.shapeOffsets).toEqual({ diamond_0: 2 });

    const pastedThree = state.sixteenthThreeStampPlacements[1]!;
    expect(pastedThree.id).not.toBe('three-1');
    expect(pastedThree.startTimeIndex).toBe(13);
    expect(pastedThree.row).toBe(15);
    expect(pastedThree.shapeOffsets).toEqual({ diamond_2: -1 });

    const pastedTriplet = state.tripletStampPlacements[1]!;
    expect(pastedTriplet.id).not.toBe('triplet-1');
    expect(pastedTriplet.startTimeIndex).toBe(17);
    expect(pastedTriplet.row).toBe(17);
    expect(pastedTriplet.shapeOffsets).toEqual({ triplet_1: 1 });
  });

  it('repeated paste continues offsetting from the copied snapshot', () => {
    const state = createState();
    const selection = createSelection(state);

    expect(copyLassoSelection(selection)).toBe(4);

    pasteLassoClipboard(state, renderOptions);
    const secondPaste = pasteLassoClipboard(state, renderOptions);

    expect(secondPaste?.pastedCount).toBe(4);
    expect(state.placedNotes[2]?.startColumnIndex).toBe(6);
    expect(state.placedNotes[2]?.row).toBe(12);
    expect(state.sixteenthStampPlacements[2]?.startTimeIndex).toBe(10);
    expect(state.sixteenthThreeStampPlacements[2]?.startTimeIndex).toBe(14);
    expect(state.tripletStampPlacements[2]?.startTimeIndex).toBe(18);
  });

  it('does not copy when no lasso selection is active', () => {
    expect(copyLassoSelection({ selectedItems: [], convexHull: null, isActive: false })).toBe(0);
  });
});
