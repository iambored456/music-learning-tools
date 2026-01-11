<script lang="ts">
  /**
   * GridControlsBridge - Headless Svelte component
   *
   * This component attaches event handlers to grid control buttons
   * (zoom in/out, macrobeat increase/decrease).
   *
   * This replaces: src/components/toolbar/initializers/gridControlsInitializer.ts
   */
  import { onMount, onDestroy } from 'svelte';
  import store from '@state/initStore.ts';

  // DOM element references
  let zoomInBtn: HTMLElement | null = null;
  let zoomOutBtn: HTMLElement | null = null;
  let increaseBtn: HTMLElement | null = null;
  let decreaseBtn: HTMLElement | null = null;

  // Helper function to jump to pitch range tab
  function jumpToPitchRangeTab() {
    const pitchTab = document.querySelector<HTMLButtonElement>('.tab-button[data-tab="pitch"]');
    const rangeTab = document.querySelector<HTMLButtonElement>('.pitch-tab-button[data-pitch-tab="range"]');
    pitchTab?.click();
    rangeTab?.click();
  }

  // Event handlers
  function handleZoomIn() {
    jumpToPitchRangeTab();
    store.emit('zoomIn', { source: 'button' });
    zoomInBtn?.blur();
  }

  function handleZoomOut() {
    jumpToPitchRangeTab();
    store.emit('zoomOut', { source: 'button' });
    zoomOutBtn?.blur();
  }

  function handleIncreaseMacrobeat() {
    store.increaseMacrobeatCount();
  }

  function handleDecreaseMacrobeat() {
    store.decreaseMacrobeatCount();
  }

  onMount(() => {
    // Find existing DOM elements
    zoomInBtn = document.getElementById('grid-zoom-in');
    zoomOutBtn = document.getElementById('grid-zoom-out');
    increaseBtn = document.getElementById('macrobeat-increase');
    decreaseBtn = document.getElementById('macrobeat-decrease');

    // Attach event listeners
    zoomInBtn?.addEventListener('click', handleZoomIn);
    zoomOutBtn?.addEventListener('click', handleZoomOut);
    increaseBtn?.addEventListener('click', handleIncreaseMacrobeat);
    decreaseBtn?.addEventListener('click', handleDecreaseMacrobeat);

    console.log('[Svelte] GridControlsBridge mounted');
  });

  onDestroy(() => {
    // Remove event listeners
    zoomInBtn?.removeEventListener('click', handleZoomIn);
    zoomOutBtn?.removeEventListener('click', handleZoomOut);
    increaseBtn?.removeEventListener('click', handleIncreaseMacrobeat);
    decreaseBtn?.removeEventListener('click', handleDecreaseMacrobeat);

    console.log('[Svelte] GridControlsBridge unmounted');
  });
</script>

<!-- This is a headless component - no DOM output -->
