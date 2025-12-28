<script lang="ts">
  /**
   * ModeToggle Component
   *
   * Toggle between stationary and highway visualization modes.
   */

  import { appState, type VisualizationMode } from '../../stores/appState.svelte.js';

  const modes: { value: VisualizationMode; label: string }[] = [
    { value: 'stationary', label: 'Stationary' },
    { value: 'highway', label: 'Highway' },
  ];

  function handleClick(mode: VisualizationMode) {
    appState.setVisualizationMode(mode);
  }
</script>

<div class="mode-toggle">
  {#each modes as { value, label }}
    <button
      class="mode-button"
      class:active={appState.state.visualizationMode === value}
      onclick={() => handleClick(value)}
    >
      {label}
    </button>
  {/each}
</div>

<style>
  .mode-toggle {
    display: flex;
    background-color: var(--color-surface);
    border-radius: var(--radius-md);
    padding: 4px;
  }

  .mode-button {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-muted);
    background: transparent;
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
  }

  .mode-button:hover:not(.active) {
    color: var(--color-text);
  }

  .mode-button.active {
    color: var(--color-bg);
    background-color: var(--color-secondary);
  }
</style>
