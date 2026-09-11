import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callOrder, mockPreviewService, mockStore } = vi.hoisted(() => {
  const callOrder: string[] = [];
  return {
    callOrder,
    mockPreviewService: {
      clearAlignedGridPreviews: vi.fn(() => callOrder.push('clear-preview')),
      renderPitchSnapshot: vi.fn(),
      renderAlignedGridPreviews: vi.fn()
    },
    mockStore: {
      state: {
        selectedTool: 'tonicization',
        selectedToolTonicNumber: 5,
        fullRowData: []
      },
      addTonicSignGroup: vi.fn(() => callOrder.push('commit-tonic'))
    }
  };
});

vi.mock('@state/initStore.ts', () => ({ default: mockStore }));
vi.mock('@state/selectors.ts', () => ({
  getMacrobeatInfo: vi.fn(),
  getPlacedTonicSigns: vi.fn(() => [])
}));
vi.mock('@state/pitchData.ts', () => ({ fullRowData: [] }));
vi.mock('@services/pitchGridViewportService.ts', () => ({ default: {} }));
vi.mock('../../renderers/notes.ts', () => ({ drawTonicShape: vi.fn() }));
vi.mock('../../renderers/gridLines.ts', () => ({ drawHorizontalLines: vi.fn() }));
vi.mock('../../renderers/rendererUtils.ts', () => ({
  getColumnX: vi.fn(),
  getVisibleRowRange: vi.fn()
}));
vi.mock('@utils/canvasDimensions.ts', () => ({
  getLogicalCanvasHeight: vi.fn(),
  getLogicalCanvasWidth: vi.fn()
}));
vi.mock('./tonicInsertionPreviewService.ts', () => ({ default: mockPreviewService }));

import { PitchGridTonicizationToolInteractor } from './PitchGridTonicizationToolInteractor.ts';

describe('PitchGridTonicizationToolInteractor', () => {
  beforeEach(() => {
    callOrder.length = 0;
    vi.clearAllMocks();
  });

  it('clears preview geometry before committing a tonic and triggering layout', () => {
    const interactor = new PitchGridTonicizationToolInteractor();
    const mutableInteractor = interactor as unknown as {
      lastHoveredTonicPoint: { drawColumn: number; preMacrobeatIndex: number };
      lastHoveredOctaveRows: number[];
    };
    mutableInteractor.lastHoveredTonicPoint = { drawColumn: 8, preMacrobeatIndex: 2 };
    mutableInteractor.lastHoveredOctaveRows = [4, 11];

    expect(interactor.handleMouseDown()).toBe(true);

    expect(callOrder).toEqual(['clear-preview', 'commit-tonic']);
    expect(mockStore.addTonicSignGroup).toHaveBeenCalledWith([
      { row: 4, tonicNumber: 5, preMacrobeatIndex: 2, columnIndex: 8 },
      { row: 11, tonicNumber: 5, preMacrobeatIndex: 2, columnIndex: 8 }
    ]);
  });
});
