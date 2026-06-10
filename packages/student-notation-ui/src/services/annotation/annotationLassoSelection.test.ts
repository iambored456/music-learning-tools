import { describe, expect, it, vi } from 'vitest';
import type { SixteenthStampPlacement, SixteenthThreeStampPlacement, TripletStampPlacement } from '@mlt/types';

vi.mock('@components/canvas/PitchGrid/renderers/rendererUtils.ts', () => ({
  getColumnX: (column: number, options: { cellWidth: number }) => column * options.cellWidth,
  getRowY: (row: number, options: { cellHeight: number }) => row * options.cellHeight
}));

vi.mock('@services/columnMapService.ts', () => ({
  timeToCanvas: (timeIndex: number) => timeIndex >= 6 ? timeIndex + 2 : timeIndex
}));

vi.mock('@state/initStore.ts', () => ({
  default: {
    state: {}
  }
}));

import { computeLassoSelection } from './annotationLassoSelection.ts';

function createSixteenthStamp(overrides: Partial<SixteenthStampPlacement> = {}): SixteenthStampPlacement {
  return {
    id: 'stamp-1',
    sixteenthStampId: 1,
    startTimeIndex: 4,
    row: 10,
    globalRow: 10,
    color: '#4a90e2',
    timestamp: 1,
    shapeOffsets: {},
    ...overrides
  };
}

function createSixteenthThreeStamp(overrides: Partial<SixteenthThreeStampPlacement> = {}): SixteenthThreeStampPlacement {
  return {
    id: 'three-stamp-1',
    sixteenthThreeStampId: 7,
    startTimeIndex: 4,
    row: 10,
    globalRow: 10,
    color: '#4a90e2',
    timestamp: 1,
    shapeOffsets: {},
    ...overrides
  };
}

function createTripletStamp(overrides: Partial<TripletStampPlacement> = {}): TripletStampPlacement {
  return {
    id: 'triplet-1',
    tripletStampId: 1,
    startTimeIndex: 4,
    span: 1,
    row: 10,
    globalRow: 10,
    color: '#4a90e2',
    timestamp: 1,
    shapeOffsets: {},
    ...overrides
  };
}

describe('computeLassoSelection', () => {
  const renderOptions = {
    cellWidth: 20,
    cellHeight: 10,
    columnWidths: Array.from({ length: 16 }, () => 1),
    tempoModulationMarkers: []
  };

  it('selects a sixteenth stamp by its rendered glyph area', () => {
    const stamp = createSixteenthStamp();
    const selection = computeLassoSelection({
      lassoPath: [
        { x: 78, y: 94 },
        { x: 122, y: 94 },
        { x: 122, y: 106 },
        { x: 78, y: 106 }
      ],
      state: {
        placedNotes: [],
        sixteenthStampPlacements: [stamp],
        sixteenthThreeStampPlacements: [],
        tripletStampPlacements: [],
        tempoModulationMarkers: []
      },
      renderOptions,
      isAdditive: false
    });

    expect(selection.selectedItems).toHaveLength(1);
    expect(selection.selectedItems[0]?.type).toBe('sixteenthStamp');
    expect(selection.convexHull?.length).toBeGreaterThanOrEqual(3);
  });

  it('does not select a sixteenth stamp by an empty part of its stamp span', () => {
    const stamp = createSixteenthStamp();
    const selection = computeLassoSelection({
      lassoPath: [
        { x: 100, y: 96 },
        { x: 118, y: 96 },
        { x: 118, y: 104 },
        { x: 100, y: 104 }
      ],
      state: {
        placedNotes: [],
        sixteenthStampPlacements: [stamp],
        sixteenthThreeStampPlacements: [],
        tripletStampPlacements: [],
        tempoModulationMarkers: []
      },
      renderOptions,
      isAdditive: false
    });

    expect(selection.selectedItems).toHaveLength(0);
    expect(selection.convexHull).toBeNull();
  });

  it('does not stretch a sixteenth stamp across a later tonic gap', () => {
    const stamp = createSixteenthStamp({ sixteenthStampId: 4 });
    const selection = computeLassoSelection({
      lassoPath: [
        { x: 144, y: 94 },
        { x: 156, y: 94 },
        { x: 156, y: 106 },
        { x: 144, y: 106 }
      ],
      state: {
        placedNotes: [],
        sixteenthStampPlacements: [stamp],
        sixteenthThreeStampPlacements: [],
        tripletStampPlacements: [],
        tempoModulationMarkers: []
      },
      renderOptions,
      isAdditive: false
    });

    expect(selection.selectedItems).toHaveLength(0);
    expect(selection.convexHull).toBeNull();
  });

  it('selects a sixteenth stamp by a shape dragged away from its base row', () => {
    const stamp = createSixteenthStamp({
      shapeOffsets: {
        diamond_0: 4
      }
    });

    const selection = computeLassoSelection({
      lassoPath: [
        { x: 78, y: 134 },
        { x: 94, y: 134 },
        { x: 94, y: 146 },
        { x: 78, y: 146 }
      ],
      state: {
        placedNotes: [],
        sixteenthStampPlacements: [stamp],
        sixteenthThreeStampPlacements: [],
        tripletStampPlacements: [],
        tempoModulationMarkers: []
      },
      renderOptions,
      isAdditive: false
    });

    expect(selection.selectedItems).toHaveLength(1);
    expect(selection.selectedItems[0]?.type).toBe('sixteenthStamp');
    expect(selection.convexHull?.length).toBeGreaterThanOrEqual(3);
  });

  it('selects a three-slot sixteenth stamp by its rendered glyph area', () => {
    const stamp = createSixteenthThreeStamp();
    const selection = computeLassoSelection({
      lassoPath: [
        { x: 78, y: 94 },
        { x: 112, y: 94 },
        { x: 112, y: 106 },
        { x: 78, y: 106 }
      ],
      state: {
        placedNotes: [],
        sixteenthStampPlacements: [],
        sixteenthThreeStampPlacements: [stamp],
        tripletStampPlacements: [],
        tempoModulationMarkers: []
      },
      renderOptions,
      isAdditive: false
    });

    expect(selection.selectedItems).toHaveLength(1);
    expect(selection.selectedItems[0]?.type).toBe('sixteenthThreeStamp');
    expect(selection.convexHull?.length).toBeGreaterThanOrEqual(3);
  });

  it('does not select a three-slot sixteenth stamp by an empty part of its stamp span', () => {
    const stamp = createSixteenthThreeStamp({ sixteenthThreeStampId: 1 });
    const selection = computeLassoSelection({
      lassoPath: [
        { x: 96, y: 96 },
        { x: 108, y: 96 },
        { x: 108, y: 104 },
        { x: 96, y: 104 }
      ],
      state: {
        placedNotes: [],
        sixteenthStampPlacements: [],
        sixteenthThreeStampPlacements: [stamp],
        tripletStampPlacements: [],
        tempoModulationMarkers: []
      },
      renderOptions,
      isAdditive: false
    });

    expect(selection.selectedItems).toHaveLength(0);
    expect(selection.convexHull).toBeNull();
  });

  it('selects a three-slot sixteenth stamp by a shape dragged away from its base row', () => {
    const stamp = createSixteenthThreeStamp({
      sixteenthThreeStampId: 3,
      shapeOffsets: {
        diamond_2: 4
      }
    });

    const selection = computeLassoSelection({
      lassoPath: [
        { x: 99, y: 134 },
        { x: 111, y: 134 },
        { x: 111, y: 146 },
        { x: 99, y: 146 }
      ],
      state: {
        placedNotes: [],
        sixteenthStampPlacements: [],
        sixteenthThreeStampPlacements: [stamp],
        tripletStampPlacements: [],
        tempoModulationMarkers: []
      },
      renderOptions,
      isAdditive: false
    });

    expect(selection.selectedItems).toHaveLength(1);
    expect(selection.selectedItems[0]?.type).toBe('sixteenthThreeStamp');
    expect(selection.convexHull?.length).toBeGreaterThanOrEqual(3);
  });

  it('returns a visible hull for a selected triplet stamp', () => {
    const selection = computeLassoSelection({
      lassoPath: [
        { x: 80, y: 94 },
        { x: 94, y: 94 },
        { x: 94, y: 106 },
        { x: 80, y: 106 }
      ],
      state: {
        placedNotes: [],
        sixteenthStampPlacements: [],
        sixteenthThreeStampPlacements: [],
        tripletStampPlacements: [createTripletStamp()],
        tempoModulationMarkers: []
      },
      renderOptions,
      isAdditive: false
    });

    expect(selection.selectedItems).toHaveLength(1);
    expect(selection.selectedItems[0]?.type).toBe('tripletStamp');
    expect(selection.convexHull?.length).toBeGreaterThanOrEqual(3);
  });

  it('does not select a triplet stamp by an empty part of its stamp span', () => {
    const selection = computeLassoSelection({
      lassoPath: [
        { x: 104, y: 96 },
        { x: 118, y: 96 },
        { x: 118, y: 104 },
        { x: 104, y: 104 }
      ],
      state: {
        placedNotes: [],
        sixteenthStampPlacements: [],
        sixteenthThreeStampPlacements: [],
        tripletStampPlacements: [createTripletStamp()],
        tempoModulationMarkers: []
      },
      renderOptions,
      isAdditive: false
    });

    expect(selection.selectedItems).toHaveLength(0);
    expect(selection.convexHull).toBeNull();
  });
});
