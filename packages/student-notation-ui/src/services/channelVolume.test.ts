import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '@mlt/student-notation-engine/state';

const audio = vi.hoisted(() => ({
  init: vi.fn(), dispose: vi.fn(), setChannelVolume: vi.fn(), updateSynthForColor: vi.fn()
}));
vi.mock('@mlt/student-notation-engine', () => ({ createSynthEngine: () => audio }));
vi.mock('@state/initStore.ts', async () => {
  const { createStore } = await import('@mlt/student-notation-engine/state');
  return { default: createStore() };
});
vi.mock('@utils/logger.ts', () => ({ default: { moduleLoaded: vi.fn(), info: vi.fn() } }));
vi.mock('@components/audio/harmonicsFilter/overtoneBins.ts', () => ({ getFilteredCoefficients: vi.fn() }));
vi.mock('@services/runtimeGlobals.ts', () => ({ getAudioEffectsManager: vi.fn(), registerSynthEngine: vi.fn() }));

import store from '@state/initStore.ts';
import synth from './initAudio.ts';

afterEach(() => { synth.dispose(); vi.clearAllMocks(); });

describe('channel volume', () => {
  it('keeps a muted channel muted when its preset changes, without changing the selected note', () => {
    const state = createStore();
    const selected = { ...state.state.selectedNote };
    const color = '#81c273';
    state.setChannelVolume(color, 0);
    state.applyPreset(color, { gain: 0.4, activePresetName: 'test' });
    expect(state.state.timbres[color]?.channelVolume).toBe(0);
    expect(state.state.timbres[color]?.gain).toBe(0.4);
    expect(state.state.selectedNote).toEqual(selected);
    expect(state.state.timbres['#44bcef']?.channelVolume ?? 1).toBe(1);
  });

  it('updates audio through a drag and restores an unselected channel on undo and redo', () => {
    synth.init();
    const color = '#81c273';
    store.recordState();
    const historyIndex = store.state.historyIndex;
    store.setChannelVolume(color, 0.8);
    store.setChannelVolume(color, 0.3);
    store.setChannelVolume(color, 0);
    expect(audio.setChannelVolume).toHaveBeenLastCalledWith(color, 0);
    expect(store.state.historyIndex).toBe(historyIndex);
    store.recordState();
    expect(store.state.historyIndex).toBe(historyIndex + 1);
    store.undo();
    expect(audio.setChannelVolume).toHaveBeenLastCalledWith(color, 1);
    store.redo();
    expect(audio.setChannelVolume).toHaveBeenLastCalledWith(color, 0);
  });

  it('clamps drag overshoot and rejects invalid levels before they reach audio', () => {
    const state = createStore();
    const color = '#44bcef';
    state.setChannelVolume(color, -2);
    expect(state.state.timbres[color]?.channelVolume).toBe(0);
    state.setChannelVolume(color, 3);
    expect(state.state.timbres[color]?.channelVolume).toBe(1);
    state.setChannelVolume(color, NaN);
    expect(state.state.timbres[color]?.channelVolume).toBe(1);
  });
});
