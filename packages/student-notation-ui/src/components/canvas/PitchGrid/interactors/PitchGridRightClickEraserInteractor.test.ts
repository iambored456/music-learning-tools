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

describe('unified pointer Eraser', () => {
  beforeEach(() => {
    mockStore.state.selectedTool = 'modulation';
    vi.clearAllMocks();
  });

  it.each(['note', 'draw', 'select', 'modulation', 'sixteenthStamp', 'tripletStamp'])('erases all object families from %s and records one history state', (tool) => {
    mockStore.state.selectedTool = tool;
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
    expect(mockStore.eraseInPitchArea).toHaveBeenCalledTimes(2);
    expect(mockStore.eraseTonicSignAt).toHaveBeenCalledTimes(2);
    expect(mockStore.eraseSixteenthStampsInArea).toHaveBeenCalledTimes(2);
    expect(mockStore.eraseSixteenthThreeStampsInArea).toHaveBeenCalledTimes(2);
    expect(mockStore.eraseTripletStampsInArea).toHaveBeenCalledTimes(2);
    expect(annotationService.eraseAtPoint).toHaveBeenCalledTimes(2);
    expect(interactor.shouldShowEraserHighlight()).toBe(true);

    expect(interactor.handleGlobalMouseUp()).toBe(true);
    expect(mockStore.recordState).toHaveBeenCalledTimes(1);
    expect(mockStore.state.selectedTool).toBe(tool);
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

  it('uses left-click for the toolbar Eraser and never restores over an explicitly chosen tool', () => {
    const interactor = new PitchGridRightClickEraserInteractor();
    mockStore.state.selectedTool = 'eraser';
    const erase = vi.fn(() => true);
    expect(interactor.handleMouseDown({
      event: { button: 0, preventDefault: vi.fn() } as unknown as MouseEvent,
      colIndex: 3 as CanvasSpaceColumn, rowIndex: 4, actualX: 120, canvasY: 40,
      annotationService: { eraseAtPoint: erase }, eraseModulationAtPoint: erase
    })).toBe(true);
    mockStore.state.selectedTool = 'chord';
    interactor.handleGlobalMouseUp();
    expect(mockStore.state.selectedTool).toBe('chord');
    expect(mockStore.setSelectedTool).not.toHaveBeenCalled();
  });
});
