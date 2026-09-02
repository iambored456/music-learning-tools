<script lang="ts">
  /**
   * GridControlsBridge - Headless Svelte component
   *
   * This component attaches event handlers to grid control buttons
   * (zoom in/out, macrobeat increase/decrease).
   */
  import { onMount, onDestroy } from 'svelte';
  import store from '@state/initStore.ts';

  // DOM element references
  let zoomInBtn: HTMLElement | null = null;
  let zoomOutBtn: HTMLElement | null = null;
  let increaseBtn: HTMLElement | null = null;
  let decreaseBtn: HTMLElement | null = null;
  let floatingPanel: HTMLElement | null = null;

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

  function floatMacrobeatPanel(): void {
    if (!floatingPanel || floatingPanel.classList.contains('is-floating')) return;
    const rect = floatingPanel.getBoundingClientRect();
    floatingPanel.style.setProperty('--macrobeat-float-left', `${rect.left}px`);
    floatingPanel.style.setProperty('--macrobeat-float-top', `${rect.top}px`);
    floatingPanel.style.setProperty('--macrobeat-float-width', `${rect.width}px`);
    floatingPanel.style.setProperty('--macrobeat-float-height', `${rect.height}px`);
    floatingPanel.classList.add('is-floating');
  }

  function releaseMacrobeatPanel(): void {
    floatingPanel?.classList.remove('is-floating');
    floatingPanel?.style.removeProperty('--macrobeat-float-left');
    floatingPanel?.style.removeProperty('--macrobeat-float-top');
    floatingPanel?.style.removeProperty('--macrobeat-float-width');
    floatingPanel?.style.removeProperty('--macrobeat-float-height');
  }

  onMount(() => {
    // Find existing DOM elements
    zoomInBtn = document.getElementById('grid-zoom-in');
    zoomOutBtn = document.getElementById('grid-zoom-out');
    increaseBtn = document.getElementById('macrobeat-increase');
    decreaseBtn = document.getElementById('macrobeat-decrease');
    floatingPanel = document.querySelector<HTMLElement>('.macrobeat-floating-panel');

    // Attach event listeners
    zoomInBtn?.addEventListener('click', handleZoomIn);
    zoomOutBtn?.addEventListener('click', handleZoomOut);
    increaseBtn?.addEventListener('click', handleIncreaseMacrobeat);
    decreaseBtn?.addEventListener('click', handleDecreaseMacrobeat);
    increaseBtn?.addEventListener('pointerdown', floatMacrobeatPanel);
    decreaseBtn?.addEventListener('pointerdown', floatMacrobeatPanel);
    floatingPanel?.addEventListener('mouseleave', releaseMacrobeatPanel);

  });

  onDestroy(() => {
    // Remove event listeners
    zoomInBtn?.removeEventListener('click', handleZoomIn);
    zoomOutBtn?.removeEventListener('click', handleZoomOut);
    increaseBtn?.removeEventListener('click', handleIncreaseMacrobeat);
    decreaseBtn?.removeEventListener('click', handleDecreaseMacrobeat);
    increaseBtn?.removeEventListener('pointerdown', floatMacrobeatPanel);
    decreaseBtn?.removeEventListener('pointerdown', floatMacrobeatPanel);
    floatingPanel?.removeEventListener('mouseleave', releaseMacrobeatPanel);
    releaseMacrobeatPanel();

  });
</script>

<!-- This is a headless component - no DOM output -->
