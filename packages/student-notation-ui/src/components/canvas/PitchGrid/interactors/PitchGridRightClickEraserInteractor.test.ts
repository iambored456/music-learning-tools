import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasSpaceColumn } from '@mlt/types';

const { mockStore } = vi.hoisted(() => ({
  mockStore: {
    state: { selectedTool: 'modulation' },
    setSelectedTool: vi.fn(),
    recordState: vi.fn(),
    eraseInPitchArea: vi.fn(),
    eraseTonicSignAt: vi.fn(),
    eraseSixteenthStampsInArea: vi.fn(),
    eraseSixteenthThreeStampsInArea: vi.fn(),
    eraseTripletStampsInArea: vi.fn()
  }
}));

vi.mock('@state/initStore.ts', () => ({ default: mockStore }));
vi.mock('@services/domCache.ts', () => ({
  default: { get: vi.fn(() => undefined) }
}));

import { PitchGridRightClickEraserInteractor } from './PitchGridRightClickEraserInteractor.ts';

function createRightClickEvent(): MouseEvent {
  return {
    button: 2,
    preventDefault: vi.fn()
  } as unknown as MouseEvent;
}

describe('PitchGridRightClickEraserInteractor modulation mode', () => {
  beforeEach(() => {
    mockStore.state.selectedTool = 'modulation';
    vi.clearAllMocks();
  });

  it('erases only modulation markers across a right-drag and records one history state', () => {
    const interactor = new PitchGridRightClickEraserInteractor();
    const eraseModulationAtPoint = vi.fn(() => true);
    const annotationService = { eraseAtPoint: vi.fn(() => true) };

    expect(interactor.handleMouseDown({
      event: createRightClickEvent(),
      colIndex: 3 as CanvasSpaceColumn,
      rowIndex: 4,
      actualX: 120,
      canvasY: 40,
      annotationService,
      eraseModulationAtPoint
    })).toBe(true);

    expect(interactor.handleMouseMove({
      event: createRightClickEvent(),
      colIndex: 8 as CanvasSpaceColumn,
      rowIndex: 5,
      actualX: 280,
      canvasY: 50,
      annotationService,
      eraseModulationAtPoint
    })).toBe(true);

    expect(eraseModulationAtPoint).toHaveBeenNthCalledWith(1, 120, 40);
    expect(eraseModulationAtPoint).toHaveBeenNthCalledWith(2, 280, 50);
    expect(mockStore.setSelectedTool).not.toHaveBeenCalled();
    expect(mockStore.eraseInPitchArea).not.toHaveBeenCalled();
    expect(mockStore.eraseTonicSignAt).not.toHaveBeenCalled();
    expect(mockStore.eraseSixteenthStampsInArea).not.toHaveBeenCalled();
    expect(mockStore.eraseSixteenthThreeStampsInArea).not.toHaveBeenCalled();
    expect(mockStore.eraseTripletStampsInArea).not.toHaveBeenCalled();
    expect(annotationService.eraseAtPoint).not.toHaveBeenCalled();
    expect(interactor.shouldShowEraserHighlight()).toBe(true);

    expect(interactor.handleGlobalMouseUp()).toBe(true);
    expect(mockStore.recordState).toHaveBeenCalledTimes(1);
  });

  it('does not create a history state when right-clicking empty canvas', () => {
    const interactor = new PitchGridRightClickEraserInteractor();
    const eraseModulationAtPoint = vi.fn(() => false);

    interactor.handleMouseDown({
      event: createRightClickEvent(),
      colIndex: 3 as CanvasSpaceColumn,
      rowIndex: 4,
      actualX: 120,
      canvasY: 40,
      annotationService: { eraseAtPoint: vi.fn(() => false) },
      eraseModulationAtPoint
    });
    interactor.handleGlobalMouseUp();

    expect(eraseModulationAtPoint).toHaveBeenCalledTimes(1);
    expect(mockStore.recordState).not.toHaveBeenCalled();
  });
});
