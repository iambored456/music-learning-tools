import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '@mlt/student-notation-engine';
import store from '@state/initStore.ts';
import audioPreviewService from '@services/audioPreviewService.ts';
import type { CanvasSpaceColumn } from '@mlt/types';
import { initPitchGridInteraction } from './pitchGridInteractor.ts';

vi.mock('@state/initStore.ts', async () => {
  const { createStore } = await import('@mlt/student-notation-engine');
  return { default: createStore() };
});
vi.mock('@services/audioPreviewService.ts', () => ({ default: {
  triggerAttack: vi.fn(() => true), triggerAttacks: vi.fn(), releasePitches: vi.fn()
} }));
vi.mock('@components/audio/adsr/adsrPlayheadCanvas.ts', () => ({ triggerAdsrPlayhead: vi.fn() }));
vi.mock('@services/rhythmPlaybackService.ts', () => ({ default: {
  getSixteenthStampAtPosition: () => null, getTripletStampAtPosition: () => null, stopCurrentPattern: vi.fn()
} }));
vi.mock('@services/gridCoordsService.ts', () => ({ default: {
  getColumnIndex: (x: number) => Math.floor(x), getPitchRowIndex: (y: number) => y
} }));
vi.mock('@services/pitchGridViewportService.ts', () => ({ default: { getViewportInfo: () => ({ zoomLevel: 1 }) } }));
vi.mock('@services/annotationService.ts', () => ({ default: {} }));
vi.mock('@services/spacebarHandler.ts', () => ({ setGhostNotePosition: vi.fn(), clearGhostNotePosition: vi.fn() }));
vi.mock('@services/columnMapService.ts', () => ({ canvasToTime: (col: number) => col, timeToCanvas: (col: number) => col }));
vi.mock('@/rhythm/individualSixteenthPlacement.ts', () => ({}));
vi.mock('@/rhythm/sixteenthThreeStampSnap.ts', () => ({ getNearestSixteenthThreeStampSnapTarget: () => null }));
vi.mock('@utils/chordPitchesFromIntervals.ts', () => ({ getChordPitchesFromIntervals: (pitch: string) => [pitch] }));
vi.mock('../renderers/notes.ts', () => ({ drawSingleColumnOvalNote: vi.fn(), drawTwoColumnOvalNote: vi.fn() }));
vi.mock('../renderers/rendererUtils.ts', () => ({ getColumnFromX: (x: number) => x }));
vi.mock('../renderers/sixteenthStampRenderer.ts', () => ({}));
vi.mock('../renderers/sixteenthThreeStampRenderer.ts', () => ({}));
vi.mock('../renderers/tripletStampRenderer.ts', () => ({}));
vi.mock('@components/rhythm/stampToolbars/sixteenthStampsToolbar.ts', () => ({ default: {} }));
vi.mock('@components/rhythm/stampToolbars/sixteenthThreeStampsToolbar.ts', () => ({ default: {} }));
vi.mock('@components/rhythm/stampToolbars/tripletStampsToolbar.ts', () => ({ default: {} }));
vi.mock('@services/typographyService.ts', () => ({}));
vi.mock('./cursorManager.ts', () => ({ clearStampHoverCursor: vi.fn(), setStampHoverCursor: vi.fn() }));
vi.mock('./PitchGridEraserPreview.ts', () => ({}));
vi.mock('./PitchGridRightClickEraserInteractor.ts', () => ({ PitchGridRightClickEraserInteractor: class {
  getIsActive() { return false; }
  handleGlobalMouseUp() {}
} }));
vi.mock('./tools/PitchGridModulationToolInteractor.ts', () => ({ PitchGridModulationToolInteractor: class {
  handleMouseDown() { return false; }
  handleMouseMove() { return false; }
  handleMouseUp() { return false; }
  getHoveredMarker() { return null; }
  updateCursor() {}
} }));
vi.mock('./tools/PitchGridSixteenthStampToolInteractor.ts', () => ({ PitchGridSixteenthStampToolInteractor: class {
  tryStartShapeDrag() { return false; }
  handleMouseMove() { return false; }
  handleMouseUp() { return false; }
  isDraggingShape() { return false; }
} }));
vi.mock('./tools/PitchGridTripletStampToolInteractor.ts', () => ({ PitchGridTripletStampToolInteractor: class {
  tryStartShapeDrag() { return false; }
  handleMouseMove() { return false; }
  handleMouseUp() { return false; }
  isDraggingShape() { return false; }
} }));
vi.mock('./tools/PitchGridSixteenthThreeStampToolInteractor.ts', () => ({ PitchGridSixteenthThreeStampToolInteractor: class {
  tryStartShapeDrag() { return false; }
  handleMouseMove() { return false; }
  handleMouseUp() { return false; }
  isDraggingShape() { return false; }
} }));
vi.mock('./tools/PitchGridTonicizationToolInteractor.ts', () => ({ PitchGridTonicizationToolInteractor: class {
  resetHoverState() {}
} }));

// Exercise the registered mouse handlers without a browser, canvas renderer, or audio context.
class CanvasStub {
  handlers = new Map<string, (event: unknown) => void>();
  width = 8;
  height = 100;
  addEventListener(name: string, handler: (event: unknown) => void) { this.handlers.set(name, handler); }
  getBoundingClientRect() { return { left: 0, top: 0 }; }
  getContext() { return { canvas: this, clearRect: vi.fn() }; }
}

let canvas: CanvasStub;
let windowHandlers: Map<string, () => void>;

function mouse(type: string, column: number, row = 10) {
  canvas.handlers.get(type)!({ button: 0, clientX: column + 0.25, clientY: row, target: canvas });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(store.state, createStore().state, {
    columnWidths: Array(8).fill(1), musicalColumnWidths: Array(8).fill(1), tonicSignGroups: {}
  });
  store.setSelectedNote('circle', '#44bcef');
  store.setSelectedTool('note');
  canvas = new CanvasStub();
  windowHandlers = new Map();
  vi.stubGlobal('Element', CanvasStub);
  vi.stubGlobal('HTMLElement', CanvasStub);
  vi.stubGlobal('document', { getElementById: (id: string) =>
    id === 'notation-grid' || id === 'hover-canvas' ? canvas : null });
  vi.stubGlobal('window', { addEventListener: (name: string, handler: () => void) => windowHandlers.set(name, handler) });
  initPitchGridInteraction();
});

describe('overlapping voice placement', () => {
  const blue = '#44bcef';
  const purple = '#d786f3';

  function addHeldBlueNote() {
    return store.addNote({
      shape: 'circle', color: blue, row: 10, globalRow: 10,
      startColumnIndex: 0 as CanvasSpaceColumn, endColumnIndex: 6 as CanvasSpaceColumn
    })!;
  }

  it.each([
    ['circle', 0], ['circle', 4], ['oval', 0], ['oval', 4]
  ] as const)('places a different voice %s at column %s over a held note', (shape, column) => {
    const held = addHeldBlueNote();
    store.setSelectedNote(shape, purple);
    mouse('mousedown', column);
    expect(store.state.placedNotes).toHaveLength(2);
    expect(store.state.placedNotes[1]).toMatchObject({ shape, color: purple, startColumnIndex: column, row: 10, globalRow: 10 });
    expect(held).toMatchObject({ startColumnIndex: 0, endColumnIndex: 6, color: blue });
    expect(audioPreviewService.triggerAttack).toHaveBeenLastCalledWith(expect.any(String), purple, expect.any(Object));
  });

  it('previews the selected voice when another voice was placed first', () => {
    addHeldBlueNote();
    store.setSelectedNote('circle', purple);
    mouse('mousedown', 0);
    windowHandlers.get('mouseup')!();
    vi.clearAllMocks();
    mouse('mousedown', 0);
    expect(store.state.placedNotes).toHaveLength(2);
    expect(audioPreviewService.triggerAttack).toHaveBeenCalledWith(expect.any(String), purple, expect.any(Object));
  });

  it('keeps previewing the held note when the same voice is selected', () => {
    addHeldBlueNote();
    mouse('mousedown', 4);
    expect(store.state.placedNotes).toHaveLength(1);
    expect(audioPreviewService.triggerAttack).toHaveBeenCalledWith(expect.any(String), blue, expect.any(Object));
  });

  it('undoes and redoes an overlapping placement without changing the held note', () => {
    addHeldBlueNote();
    store.recordState();
    store.setSelectedNote('circle', purple);
    mouse('mousedown', 4);
    mouse('mousemove', 7);
    windowHandlers.get('mouseup')!();
    expect(store.state.placedNotes).toHaveLength(2);
    store.undo();
    expect(store.state.placedNotes).toHaveLength(1);
    expect(store.state.placedNotes[0]).toMatchObject({ color: blue, endColumnIndex: 6 });
    store.redo();
    expect(store.state.placedNotes[1]).toMatchObject({ color: purple, startColumnIndex: 4, endColumnIndex: 7 });
  });
});

afterEach(() => {
  windowHandlers.get('mouseup')?.();
  vi.unstubAllGlobals();
});

describe('pitch grid right edge', () => {
  it.each(['note', 'chord'])('extends a sustained %s through the final microbeat', tool => {
    store.setSelectedTool(tool as 'note' | 'chord');
    mouse('mousedown', 0);
    expect(store.state.placedNotes).toHaveLength(1);
    mouse('mousemove', 6);
    expect(store.state.placedNotes[0]?.endColumnIndex).toBe(6);
    mouse('mousemove', 7);
    expect(store.state.placedNotes[0]?.endColumnIndex).toBe(7);
    mouse('mousemove', 8);
    expect(store.state.placedNotes[0]?.endColumnIndex).toBe(7);
    mouse('mousemove', -1);
    expect(store.state.placedNotes[0]?.endColumnIndex).toBe(7);
  });

  it('still rejects starting a two-column circle in the final column', () => {
    mouse('mousedown', 7);
    expect(store.state.placedNotes).toHaveLength(0);
  });

  it('still places an eighth-note oval in the final column', () => {
    store.setSelectedNote('oval', '#44bcef');
    mouse('mousedown', 7);
    expect(store.state.placedNotes[0]).toMatchObject({ startColumnIndex: 7, endColumnIndex: 7 });
  });
});
