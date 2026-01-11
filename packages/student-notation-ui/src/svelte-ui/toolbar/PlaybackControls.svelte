<script lang="ts">
  /**
   * PlaybackControls - Svelte 5 component for playback control buttons
   *
   * This replaces the imperative code in:
   * - src/components/toolbar/initializers/playbackInitializer.ts
   *
   * It subscribes to the store and provides play/pause/stop functionality.
   */
  import store from '@state/initStore.ts';
  import TransportService from '@services/initTransport.ts';
  import { clearAllSixteenthStamps } from '@/rhythm/sixteenthStampPlacements.js';
  import { clearAllTripletStamps } from '@/rhythm/tripletStampPlacements.js';
  import { getIconPath } from '@utils/assetPaths.ts';

  // Reactive state using Svelte 5 runes
  let isPlaying = $state(store.state.isPlaying);
  let isPaused = $state(store.state.isPaused);
  let isLooping = $state(store.state.isLooping);
  let canUndo = $state(store.state.historyIndex > 0);
  let canRedo = $state(store.state.historyIndex < store.state.history.length - 1);

  // Subscribe to store events
  $effect(() => {
    const handlePlaybackState = (data: { isPlaying: boolean; isPaused: boolean }) => {
      isPlaying = data.isPlaying;
      isPaused = data.isPaused;
    };

    const handleLoopingChanged = (data: boolean) => {
      isLooping = data;
    };

    const handleHistoryChanged = () => {
      canUndo = store.state.historyIndex > 0;
      canRedo = store.state.historyIndex < store.state.history.length - 1;
    };

    store.on('playbackStateChanged', handlePlaybackState);
    store.on('loopingChanged', handleLoopingChanged);
    store.on('historyChanged', handleHistoryChanged);

    // Initial update
    handleHistoryChanged();

    // Cleanup on unmount
    return () => {
      // Note: store.off would need to be implemented for proper cleanup
    };
  });

  // Derived state for button display
  const playIcon = $derived(getIconPath('play.svg'));
  const pauseIcon = $derived(getIconPath('pause.svg'));
  const showPauseIcon = $derived(isPlaying && !isPaused);

  // Event handlers
  function handlePlay() {
    if (isPlaying && isPaused) {
      store.setPlaybackState(true, false);
      TransportService.resume();
    } else if (isPlaying && !isPaused) {
      store.setPlaybackState(true, true);
      TransportService.pause();
    } else {
      store.setPlaybackState(true, false);
      TransportService.start();
    }
  }

  function handleStop() {
    store.setPlaybackState(false, false);
    TransportService.stop();
  }

  function handleClear() {
    store.clearAllNotes();
    clearAllSixteenthStamps();
    clearAllTripletStamps();
  }

  function handleLoop() {
    store.setLooping(!isLooping);
  }

  function handleUndo() {
    store.undo();
  }

  function handleRedo() {
    store.redo();
  }
</script>

<div class="playback-controls">
  <button
    class="toolbar-button"
    onclick={handlePlay}
    title={showPauseIcon ? 'Pause' : 'Play'}
  >
    {#if showPauseIcon}
      <img src={pauseIcon} alt="Pause" />
    {:else}
      <img src={playIcon} alt="Play" />
    {/if}
  </button>

  <button
    class="toolbar-button"
    onclick={handleStop}
    title="Stop"
  >
    <img src={getIconPath('stop.svg')} alt="Stop" />
  </button>

  <button
    class="toolbar-button"
    class:active={isLooping}
    onclick={handleLoop}
    title={isLooping ? 'Disable Loop' : 'Enable Loop'}
  >
    <img src={getIconPath('loop.svg')} alt="Loop" />
  </button>

  <div class="separator"></div>

  <button
    class="toolbar-button"
    onclick={handleClear}
    title="Clear All Notes"
  >
    <img src={getIconPath('clear.svg')} alt="Clear" />
  </button>

  <div class="separator"></div>

  <button
    class="toolbar-button"
    onclick={handleUndo}
    disabled={!canUndo}
    title="Undo"
  >
    <img src={getIconPath('undo.svg')} alt="Undo" />
  </button>

  <button
    class="toolbar-button"
    onclick={handleRedo}
    disabled={!canRedo}
    title="Redo"
  >
    <img src={getIconPath('redo.svg')} alt="Redo" />
  </button>
</div>

<style>
  .playback-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 6px;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .toolbar-button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .toolbar-button:active:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .toolbar-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .toolbar-button.active {
    background-color: rgba(100, 149, 237, 0.3);
  }

  .toolbar-button img {
    width: 20px;
    height: 20px;
    filter: brightness(0) invert(1);
  }

  .separator {
    width: 1px;
    height: 24px;
    background-color: rgba(255, 255, 255, 0.2);
    margin: 0 4px;
  }
</style>
