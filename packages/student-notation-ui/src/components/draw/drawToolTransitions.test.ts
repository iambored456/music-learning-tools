import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@state/initStore.ts', async () => {
  const { createStore } = await import('@mlt/student-notation-engine');
  return { default: createStore() };
});
vi.mock('@services/annotationService.ts', () => ({ default: { setTool: vi.fn() } }));
vi.mock('@utils/logger.ts', () => ({ default: { warn: vi.fn() } }));

import store from '@state/initStore.ts';
import annotationService from '@services/annotationService.ts';
import controller from './drawToolsController.ts';

function element(tool = '') {
  const classes = new Set<string>();
  return {
    dataset: { drawTool: tool },
    classList: {
      contains: (name: string) => classes.has(name),
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
      toggle: (name: string, active: boolean) => active ? classes.add(name) : classes.delete(name)
    },
    setAttribute: vi.fn(), removeAttribute: vi.fn(), addEventListener: vi.fn(),
    querySelector: () => null, querySelectorAll: () => []
  };
}

const buttons = ['arrow', 'text', 'marker'].map(element);
const panels = ['arrow', 'text', 'marker'].map(element);

describe('Draw controller follows the store', () => {
  beforeAll(() => {
    vi.stubGlobal('document', {
      querySelectorAll: (selector: string) => selector === '.draw-tool-button' ? buttons : selector === '.draw-tool-panel' ? panels : [],
      querySelector: () => element(), getElementById: () => element(), addEventListener: vi.fn()
    });
    controller.initialize();
  });
  beforeEach(() => { store.setSelectedTool('select'); vi.clearAllMocks(); });

  it('inherits the last note-bank colour on first Marker selection, then remembers it', () => {
    store.setSelectedNote('oval', '#ee9561');
    controller.selectTool('marker');
    expect(controller.getSettings().marker.color).toBe('#ee9561');

    store.setSelectedTool('note');
    store.setSelectedNote('circle', '#81c273');
    controller.selectTool('marker');
    expect(controller.getSettings().marker.color).toBe('#ee9561');
  });

  it.each(['arrow', 'text', 'marker'] as const)('fully releases %s for every notation tool', drawingTool => {
    for (const tool of ['note', 'tonicization', 'chord', 'modulation', 'sixteenthStamp', 'sixteenthThreeStamp', 'tripletStamp', 'eraser']) {
      controller.selectTool(drawingTool);
      expect(annotationService.setTool).toHaveBeenLastCalledWith(drawingTool, controller.getSettings());
      store.setSelectedTool(tool);
      expect(annotationService.setTool).toHaveBeenLastCalledWith(null, controller.getSettings());
      expect(buttons.some(button => button.classList.contains('active'))).toBe(false);
      expect(panels.some(panel => panel.classList.contains('active'))).toBe(false);
    }
  });

  it.each(['arrow', 'text', 'marker'] as const)(
    'returns from an active %s tool to the last used circle note',
    drawingTool => {
      store.setSelectedNote('circle', '#d293e0');
      store.setSelectedNote('oval', '#81c273');

      controller.selectTool(drawingTool);
      controller.selectTool(drawingTool);

      expect(store.state.selectedTool).toBe('note');
      expect(store.state.selectedNote).toEqual({ shape: 'circle', color: '#d293e0' });
    }
  );

  it('switches between drawing tools without returning to the note tool', () => {
    controller.selectTool('arrow');
    controller.selectTool('text');

    expect(store.state.selectedTool).toBe('draw');
    expect(store.state.selectedDrawTool).toBe('text');
  });

  it('restores Text through the toolbar Eraser with matching controls', () => {
    controller.selectTool('text');
    store.setSelectedTool('eraser');
    store.setSelectedTool(store.state.previousTool);
    expect(annotationService.setTool).toHaveBeenLastCalledWith('text', controller.getSettings());
    expect(buttons[1]!.classList.contains('active')).toBe(true);
    expect(buttons[0]!.classList.contains('active')).toBe(false);
  });

  it('Select enables selection without leaving any drawing button active', () => {
    controller.selectTool('text');
    store.setSelectedTool('select');
    expect(annotationService.setTool).toHaveBeenLastCalledWith('select', controller.getSettings());
    expect(buttons.some(button => button.classList.contains('active'))).toBe(false);
  });

  it('does not aria-hide panels that contain the visible tool buttons', () => {
    controller.selectTool('arrow');
    controller.selectTool('text');
    panels.forEach(panel => {
      expect(panel.setAttribute).not.toHaveBeenCalledWith('aria-hidden', expect.any(String));
    });
  });

  it('initialization is idempotent', () => {
    controller.initialize();
    controller.selectTool('text');
    expect(annotationService.setTool).toHaveBeenCalledTimes(1);
  });
});
