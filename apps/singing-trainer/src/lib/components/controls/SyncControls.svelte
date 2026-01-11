<script lang="ts">
  /**
   * Sync Controls Component
   *
   * Provides manual offset adjustment for YouTube-highway synchronization.
   * Allows fine-tuning with +/- 0.01s and coarse with +/- 0.1s buttons.
   */

  import { ultrastarState } from '../../stores/ultrastarState.svelte.js';

  // Reactive state
  const manualOffset = $derived(ultrastarState.state.syncConfig.manualOffsetSec);
  const isActive = $derived(ultrastarState.state.isActive);

  /**
   * Format offset for display
   */
  function formatOffset(offset: number): string {
    const sign = offset >= 0 ? '+' : '';
    return `${sign}${offset.toFixed(2)}s`;
  }

  /**
   * Adjust offset by delta
   */
  function adjust(delta: number) {
    ultrastarState.adjustOffset(delta);
  }

  /**
   * Reset offset to zero
   */
  function reset() {
    ultrastarState.resetOffset();
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeydown(event: KeyboardEvent) {
    if (!isActive) return;

    // Only handle if not focused on an input
    if (event.target instanceof HTMLInputElement) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        adjust(event.shiftKey ? -0.1 : -0.01);
        break;
      case 'ArrowRight':
        event.preventDefault();
        adjust(event.shiftKey ? 0.1 : 0.01);
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="sync-controls">
  <div class="sync-header">
    <span class="sync-label">Sync Offset</span>
    <span class="sync-value">{formatOffset(manualOffset)}</span>
  </div>

  <div class="sync-buttons">
    <button
      class="sync-btn coarse"
      onclick={() => adjust(-0.1)}
      disabled={!isActive}
      title="Earlier by 0.1s"
    >
      -0.1s
    </button>
    <button
      class="sync-btn fine"
      onclick={() => adjust(-0.01)}
      disabled={!isActive}
      title="Earlier by 0.01s"
    >
      -0.01s
    </button>
    <button
      class="sync-btn reset"
      onclick={reset}
      disabled={!isActive || manualOffset === 0}
      title="Reset offset"
    >
      0
    </button>
    <button
      class="sync-btn fine"
      onclick={() => adjust(0.01)}
      disabled={!isActive}
      title="Later by 0.01s"
    >
      +0.01s
    </button>
    <button
      class="sync-btn coarse"
      onclick={() => adjust(0.1)}
      disabled={!isActive}
      title="Later by 0.1s"
    >
      +0.1s
    </button>
  </div>

  <div class="sync-hint">
    Use arrow keys to adjust (Shift for coarse)
  </div>
</div>

<style>
  .sync-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  .sync-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sync-label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .sync-value {
    font-size: var(--font-size-md);
    font-weight: 600;
    font-family: monospace;
    color: var(--color-text);
  }

  .sync-buttons {
    display: flex;
    gap: 2px;
    justify-content: center;
  }

  .sync-btn {
    flex: 1;
    padding: var(--spacing-xs);
    font-size: var(--font-size-xs);
    font-weight: 500;
    background-color: var(--color-bg);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sync-btn:hover:not(:disabled) {
    background-color: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .sync-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .sync-btn.reset {
    flex: 0.5;
    font-weight: 600;
  }

  .sync-btn.reset:hover:not(:disabled) {
    background-color: var(--color-secondary, #00d9ff);
  }

  .sync-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-align: center;
    opacity: 0.7;
  }
</style>
