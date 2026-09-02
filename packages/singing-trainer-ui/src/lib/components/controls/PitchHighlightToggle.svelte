<script lang="ts">
  /**
   * PitchHighlightToggle Component
   *
   * Toggles the yellow pitch highlight overlay.
   */

  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';

  function handleToggle() {
    appState.togglePitchHighlight();
  }
</script>

<div class="pitch-highlight-toggle">
  <span class="toggle-label">Pitch Highlight</span>
  <button
    class="toggle-button"
    class:active={appState.state.pitchHighlightEnabled}
    onclick={handleToggle}
  >
    {appState.state.pitchHighlightEnabled ? 'On' : 'Off'}
  </button>
</div>

<style>
  .pitch-highlight-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    padding: 16px;
    background: var(--color-panel);
    border: 1px solid var(--color-border);
    border-radius: 12px;
  }

  .toggle-label {
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }

  .toggle-button {
    padding: var(--spacing-xs) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
    background-color: var(--color-control);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
    min-width: 64px;
  }

  .toggle-button:hover {
    border-color: var(--color-secondary);
  }

  .toggle-button.active {
    background-color: var(--color-secondary);
    color: var(--color-bg);
    border-color: var(--color-secondary);
  }
</style>
