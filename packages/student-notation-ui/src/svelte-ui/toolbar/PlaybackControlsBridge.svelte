<script lang="ts">
  /**
   * PlaybackControlsBridge - Headless Svelte component
   *
   * This component attaches reactive event handlers to existing DOM buttons.
   * It's a bridge pattern that allows Svelte reactivity while keeping
   * the existing HTML structure intact.
   *
   * This replaces: src/components/toolbar/initializers/playbackInitializer.ts
   *
   * Usage: Mount this component anywhere - it finds buttons by ID and attaches handlers.
   */
  import { onMount, onDestroy } from 'svelte';
  import store from '@state/initStore.ts';
  import TransportService from '@services/initTransport.ts';
  import { clearAllSixteenthStamps } from '@/rhythm/sixteenthStampPlacements.js';
  import { clearAllTripletStamps } from '@/rhythm/tripletStampPlacements.js';
  import { getIconPath } from '@utils/assetPaths.ts';

  // Reactive state
  let isPlaying = $state(store.state.isPlaying);
  let isPaused = $state(store.state.isPaused);
  let isLooping = $state(store.state.isLooping);
  let canUndo = $state(store.state.historyIndex > 0);
  let canRedo = $state(store.state.historyIndex < store.state.history.length - 1);

  // DOM element references
  let playBtn: HTMLElement | null = null;
  let stopBtn: HTMLElement | null = null;
  let loopBtn: HTMLElement | null = null;
  let clearBtn: HTMLElement | null = null;
  let undoBtn: HTMLButtonElement | null = null;
  let redoBtn: HTMLButtonElement | null = null;

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
    stopBtn?.blur();
  }

  function handleClear() {
    clearBtn?.classList.add('flash');
    setTimeout(() => clearBtn?.classList.remove('flash'), 300);
    store.clearAllNotes();
    clearAllSixteenthStamps();
    clearAllTripletStamps();
    clearBtn?.blur();
  }

  function handleLoop() {
    store.setLooping(!isLooping);
  }

  function handleUndo() {
    store.undo();
    undoBtn?.blur();
  }

  function handleRedo() {
    store.redo();
    redoBtn?.blur();
  }

  // Update button visuals based on state
  function updatePlayButton() {
    if (!playBtn) return;
    const playIcon = `<img src="${getIconPath('play.svg')}" alt="Play">`;
    const pauseIcon = `<img src="${getIconPath('pause.svg')}" alt="Pause">`;
    playBtn.innerHTML = (isPlaying && !isPaused) ? pauseIcon : playIcon;
  }

  function updateLoopButton() {
    if (!loopBtn) return;
    loopBtn.classList.toggle('active', isLooping);
  }

  function updateHistoryButtons() {
    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
  }

  // Store subscriptions
  const unsubscribers: (() => void)[] = [];

  onMount(() => {
    // Find existing DOM elements
    playBtn = document.getElementById('play-button');
    stopBtn = document.getElementById('stop-button');
    loopBtn = document.getElementById('loop-button');
    clearBtn = document.getElementById('clear-button');
    undoBtn = document.getElementById('undo-button') as HTMLButtonElement | null;
    redoBtn = document.getElementById('redo-button') as HTMLButtonElement | null;

    // Attach event listeners
    playBtn?.addEventListener('click', handlePlay);
    stopBtn?.addEventListener('click', handleStop);
    loopBtn?.addEventListener('click', handleLoop);
    clearBtn?.addEventListener('click', handleClear);
    undoBtn?.addEventListener('click', handleUndo);
    redoBtn?.addEventListener('click', handleRedo);

    // Subscribe to store events
    const handlePlaybackState = (data?: { isPlaying: boolean; isPaused: boolean }) => {
      if (!data) return;
      isPlaying = data.isPlaying;
      isPaused = data.isPaused;
      updatePlayButton();
    };

    const handleLoopingChanged = (data?: boolean) => {
      if (data === undefined) return;
      isLooping = data;
      updateLoopButton();
    };

    const handleHistoryChanged = () => {
      canUndo = store.state.historyIndex > 0;
      canRedo = store.state.historyIndex < store.state.history.length - 1;
      updateHistoryButtons();
    };

    store.on('playbackStateChanged', handlePlaybackState);
    store.on('loopingChanged', handleLoopingChanged);
    store.on('historyChanged', handleHistoryChanged);

    // Initial UI sync
    updatePlayButton();
    updateLoopButton();
    updateHistoryButtons();

    console.log('[Svelte] PlaybackControlsBridge mounted');
  });

  onDestroy(() => {
    // Remove event listeners
    playBtn?.removeEventListener('click', handlePlay);
    stopBtn?.removeEventListener('click', handleStop);
    loopBtn?.removeEventListener('click', handleLoop);
    clearBtn?.removeEventListener('click', handleClear);
    undoBtn?.removeEventListener('click', handleUndo);
    redoBtn?.removeEventListener('click', handleRedo);

    console.log('[Svelte] PlaybackControlsBridge unmounted');
  });
</script>

<!-- This is a headless component - no DOM output -->
