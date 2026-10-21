import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '@mlt/student-notation-engine';
import type { CanvasSpaceColumn } from '@mlt/types';
import store from '@state/initStore.ts';
import { initKeyboardHandler } from './keyboardHandler.ts';
import { clearLassoClipboard } from './annotation/annotationLassoClipboard.ts';
import annotationService from './annotationService.ts';

vi.mock('@state/initStore.ts', async () => {
  const { createStore } = await import('@mlt/student-notation-engine');
  return { default: createStore() };
});
vi.mock('@components/canvas/PitchGrid/renderers/rendererUtils.ts', () => ({
  getColumnX: (col: number, options: { cellWidth: number }) => col * options.cellWidth,
  getColumnFromX: (x: number, options: { cellWidth: number }) => x / options.cellWidth,
  getRowY: (row: number, options: { cellHeight: number }) => (row + 1) * options.cellHeight / 2
}));
vi.mock('@services/columnMapService.ts', () => ({
  canvasToTime: (col: number) => col, timeToCanvas: (col: number) => col
}));
vi.mock('@components/canvas/PitchGrid/renderers/modulationRenderer.ts', () => ({ getModulationMarkerCanvasX: () => 0 }));
vi.mock('@services/pitchGridViewportService.ts', () => ({ default: { getViewportInfo: () => ({ startRank: 0 }) } }));
vi.mock('@components/canvas/PitchGrid/pitchGrid.ts', () => ({ default: { render: vi.fn() } }));
vi.mock('@services/runtimeGlobals.ts', () => ({ getDrawToolsController: () => undefined }));
vi.mock('@services/typographyService.ts', () => ({}));

let activeElement: { tagName: string; isContentEditable: boolean };
const handlers = new Set<(event: KeyboardEvent) => void>();
const col = (value: number) => value as CanvasSpaceColumn;

function key(key: string, modifiers: Partial<KeyboardEvent> = { ctrlKey: true }) {
  const event = { key, preventDefault: vi.fn(), ...modifiers } as unknown as KeyboardEvent;
  handlers.forEach(handler => handler(event));
  return event;
}

beforeEach(() => {
  clearLassoClipboard();
  Object.assign(store.state, createStore().state, {
    columnWidths: Array(32).fill(1), musicalColumnWidths: Array(32).fill(1),
    macrobeatGroupings: Array(16).fill(2), tonicSignGroups: {}, cellWidth: 20, cellHeight: 10
  });
  store.addNote({ uuid: 'first', row: 10, globalRow: 10, startColumnIndex: col(0), endColumnIndex: col(3), color: '#44bcef', shape: 'circle' });
  store.addNote({ uuid: 'offscreen', row: 70, globalRow: 70, startColumnIndex: col(20), endColumnIndex: col(21), color: '#d293e0', shape: 'circle' });
  store.addNote({ row: 22, globalRow: 22, startColumnIndex: col(12.5), endColumnIndex: col(12.5), durationMicrobeats: 0.5, color: '#44bcef', shape: 'diamond' });
  store.addNote({ row: 0, startColumnIndex: col(4), endColumnIndex: col(4), color: '#44bcef', shape: 'circle', isDrum: true });
  store.state.sixteenthStampPlacements = [{ id: 'sixteenth', sixteenthStampId: 7, row: 30, globalRow: 30, startTimeIndex: 6, color: '#44bcef', timestamp: 0 }];
  store.state.sixteenthThreeStampPlacements = [{ id: 'three', sixteenthThreeStampId: 7, row: 40, globalRow: 40, startTimeIndex: 10.5, color: '#44bcef', timestamp: 0 }];
  store.state.tripletStampPlacements = [{ id: 'triplet', tripletStampId: 1, row: 50, globalRow: 50, startTimeIndex: 16, color: '#44bcef', span: 1, timestamp: 0 }];
  store.recordState();
  handlers.clear();
  activeElement = { tagName: 'BODY', isContentEditable: false };
  vi.stubGlobal('document', {
    get activeElement() { return activeElement; },
    addEventListener: (_name: string, handler: (event: KeyboardEvent) => void) => handlers.add(handler),
    removeEventListener: (_name: string, handler: (event: KeyboardEvent) => void) => handlers.delete(handler)
  });
  initKeyboardHandler();
});

afterEach(() => {
  annotationService.isDraggingSelection = false;
  annotationService.selectionDidMove = false;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('pitch grid selection shortcuts', () => {
  it.each([{ ctrlKey: true }, { metaKey: true }])('selects all pitched notes and stamps with %j', modifiers => {
    const history = vi.spyOn(store, 'recordState');
    const event = key('a', modifiers);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(store.state.selectedTool).toBe('select');
    expect(store.state.lassoSelection.selectedItems.map(item => item.type)).toEqual([
      'note', 'note', 'note', 'sixteenthStamp', 'sixteenthThreeStamp', 'tripletStamp'
    ]);
    expect(store.state.lassoSelection.convexHull?.length).toBeGreaterThan(2);
    expect(history).not.toHaveBeenCalled();
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT', 'editable'])('leaves native text selection alone in %s', tag => {
    activeElement = { tagName: tag, isContentEditable: tag === 'editable' };
    const event = key('a');
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(store.state.lassoSelection.isActive).toBe(false);
  });

  it('cuts and pastes all musical items and can undo both operations', () => {
    const originalNotes = structuredClone(store.state.placedNotes);
    key('a');
    const history = vi.spyOn(store, 'recordState');
    expect(key('x').preventDefault).toHaveBeenCalled();
    expect(store.state.placedNotes).toHaveLength(1);
    expect(store.state.placedNotes[0]?.isDrum).toBe(true);
    expect(store.state.sixteenthStampPlacements).toHaveLength(0);
    expect(store.state.sixteenthThreeStampPlacements).toHaveLength(0);
    expect(store.state.tripletStampPlacements).toHaveLength(0);
    expect(history).toHaveBeenCalledOnce();
    key('v');
    expect(store.state.placedNotes).toHaveLength(4);
    expect(store.state.lassoSelection.selectedItems).toHaveLength(6);
    store.undo();
    expect(store.state.placedNotes).toHaveLength(1);
    store.undo();
    expect(store.state.placedNotes).toEqual(originalNotes);
    expect(store.state.tripletStampPlacements).toHaveLength(1);
  });

  it('copies without removing the originals', () => {
    key('a');
    key('c');
    expect(store.state.placedNotes).toHaveLength(4);
    key('v');
    expect(store.state.placedNotes).toHaveLength(7);
    expect(store.state.tripletStampPlacements).toHaveLength(2);
  });

  it('keeps the full selection when dragging from one of its notes', () => {
    key('a');
    const selection = store.state.lassoSelection;
    const before = store.state.placedNotes.map(note => ({ ...note }));
    annotationService.canvas = { getBoundingClientRect: () => ({ left: 0, top: 0 }), style: {} } as HTMLCanvasElement;
    annotationService.currentTool = 'select';
    annotationService.toolSettings = {} as NonNullable<typeof annotationService.toolSettings>;
    annotationService.handleMouseDown({ button: 0, clientX: 20, clientY: 55 } as MouseEvent);
    expect(store.state.lassoSelection).toBe(selection);
    expect(annotationService.isDraggingSelection).toBe(true);
    annotationService.applySelectionDrag(40, 60);
    annotationService.handleMouseUp({ button: 0 } as MouseEvent);
    store.state.placedNotes.forEach((note, index) => {
      expect(note.startColumnIndex).toBe(before[index]!.startColumnIndex + (note.isDrum ? 0 : 1));
      if (!note.isDrum) expect(note.globalRow).toBe(before[index]!.globalRow! + 1);
    });
    expect(store.state.sixteenthStampPlacements[0]?.startTimeIndex).toBe(7);
    expect(store.state.sixteenthThreeStampPlacements[0]?.startTimeIndex).toBe(11.5);
    expect(store.state.tripletStampPlacements[0]?.startTimeIndex).toBe(17);
  });

  it('does not duplicate the handler when initialized twice', () => {
    initKeyboardHandler();
    key('a');
    const history = vi.spyOn(store, 'recordState');
    key('x');
    expect(history).toHaveBeenCalledOnce();
  });

  it('handles an empty grid without creating a selection', () => {
    store.state.placedNotes = [];
    store.state.sixteenthStampPlacements = [];
    store.state.sixteenthThreeStampPlacements = [];
    store.state.tripletStampPlacements = [];
    key('a');
    expect(store.state.lassoSelection).toEqual({ selectedItems: [], convexHull: null, isActive: false });
  });
});
