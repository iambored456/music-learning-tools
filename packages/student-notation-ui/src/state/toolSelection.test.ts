import { describe, expect, it, vi } from 'vitest';
import { createStore } from '@mlt/student-notation-engine';

describe('tool transitions', () => {
  const tools = ['note', 'tonicization', 'chord', 'modulation', 'sixteenthStamp', 'sixteenthThreeStamp', 'tripletStamp', 'select', 'eraser'];

  it.each(tools)('switches from Text to %s without replacing the remembered note', tool => {
    const store = createStore();
    store.setSelectedNote('oval', '#81c273');
    store.setSelectedTool('draw', undefined, 'text');
    const changed = vi.fn();
    store.on('toolChanged', changed);
    store.setSelectedTool(tool);
    expect(store.state.selectedTool).toBe(tool);
    expect(store.state.selectedNote).toEqual({ shape: 'oval', color: '#81c273' });
    expect(changed).toHaveBeenCalledWith({ oldTool: 'draw', newTool: tool });
  });

  it('retains the exact drawing subtype through Eraser, including repeated activation', () => {
    const store = createStore();
    store.setSelectedTool('draw', undefined, 'marker');
    store.setSelectedTool('eraser');
    store.setSelectedTool('eraser');
    store.setSelectedTool(store.state.previousTool);
    expect(store.state.selectedTool).toBe('draw');
    expect(store.state.selectedDrawTool).toBe('marker');
  });

  it('finishes the outgoing gesture before replacing tool state', () => {
    const store = createStore();
    store.setSelectedTool('draw', undefined, 'text');
    const observed: string[] = [];
    store.on('toolChanging', () => observed.push(store.state.selectedDrawTool!));
    store.setSelectedTool('draw', undefined, 'arrow');
    expect(observed).toEqual(['text']);
    expect(store.state.selectedDrawTool).toBe('arrow');
  });

  it('keeps the playback-start macrobeat transient and validates its range', () => {
    const store = createStore();
    const changed = vi.fn();
    store.on('playbackStartMacrobeatChanged', changed);

    store.setPlaybackStartMacrobeat(2);
    expect(store.state.playbackStartMacrobeatIndex).toBe(2);
    expect(changed).toHaveBeenLastCalledWith(2);

    store.setPlaybackStartMacrobeat(store.state.macrobeatGroupings.length);
    expect(store.state.playbackStartMacrobeatIndex).toBeNull();
    expect(changed).toHaveBeenLastCalledWith(null);
  });

});
