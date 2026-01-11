/**
 * Playback State Module
 *
 * This module provides reactive playback state that Svelte components can use.
 * It bridges the existing store event system with Svelte's reactivity.
 *
 * Usage from Svelte:
 *   import { playbackState, playbackActions } from './playbackState';
 *
 *   // Access state
 *   $effect(() => {
 *     console.log('Playing:', playbackState.isPlaying);
 *   });
 *
 *   // Call actions
 *   playbackActions.play();
 */

import store from '@state/initStore.ts';
import TransportService from '@services/initTransport.ts';
import { clearAllSixteenthStamps } from '@/rhythm/sixteenthStampPlacements.js';
import { clearAllTripletStamps } from '@/rhythm/tripletStampPlacements.js';

// Create reactive state object
export const playbackState = $state({
  isPlaying: store.state.isPlaying,
  isPaused: store.state.isPaused,
  isLooping: store.state.isLooping,
  canUndo: store.state.historyIndex > 0,
  canRedo: store.state.historyIndex < store.state.history.length - 1,
});

// Subscribe to store events to keep state in sync
function initPlaybackStateSync(): void {
  store.on('playbackStateChanged', (data?: { isPlaying: boolean; isPaused: boolean }) => {
    if (!data) {return;}
    playbackState.isPlaying = data.isPlaying;
    playbackState.isPaused = data.isPaused;
  });

  store.on('loopingChanged', (data?: boolean) => {
    if (typeof data !== 'boolean') {return;}
    playbackState.isLooping = data;
  });

  store.on('historyChanged', () => {
    playbackState.canUndo = store.state.historyIndex > 0;
    playbackState.canRedo = store.state.historyIndex < store.state.history.length - 1;
  });
}

// Initialize on module load
initPlaybackStateSync();

// Action functions
export const playbackActions = {
  play(): void {
    if (playbackState.isPlaying && playbackState.isPaused) {
      store.setPlaybackState(true, false);
      TransportService.resume();
    } else if (playbackState.isPlaying && !playbackState.isPaused) {
      store.setPlaybackState(true, true);
      TransportService.pause();
    } else {
      store.setPlaybackState(true, false);
      TransportService.start();
    }
  },

  stop(): void {
    store.setPlaybackState(false, false);
    TransportService.stop();
  },

  toggleLoop(): void {
    store.setLooping(!playbackState.isLooping);
  },

  clear(): void {
    store.clearAllNotes();
    clearAllSixteenthStamps();
    clearAllTripletStamps();
  },

  undo(): void {
    store.undo();
  },

  redo(): void {
    store.redo();
  },
};
