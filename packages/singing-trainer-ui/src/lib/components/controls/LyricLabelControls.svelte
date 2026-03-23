<script lang="ts">
  /**
   * LyricLabelControls Component
   *
   * Shared control for lyric text sizing across highway labels and karaoke text.
   */

  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';

  interface Props {
    showModeToggle?: boolean;
  }

  let { showModeToggle = false }: Props = $props();

  const isEqualMode = $derived(appState.state.lyricLabelMode === 'fixed');
  const valueLabel = $derived(
    isEqualMode
      ? `${appState.state.lyricLabelFixedPx}px`
      : `${Math.round(appState.state.lyricLabelScale * 100)}%`
  );
  const canDecrease = $derived(
    isEqualMode ? appState.state.lyricLabelFixedPx > 8 : appState.state.lyricLabelScale > 0.5
  );
  const canIncrease = $derived(
    isEqualMode ? appState.state.lyricLabelFixedPx < 48 : appState.state.lyricLabelScale < 2.5
  );
</script>

<div class="lyric-label-controls">
  <div class="label-row">
    <span class="label-text">Lyric Text Size</span>
    {#if showModeToggle}
      <div class="mode-toggle" role="group" aria-label="Lyric sizing mode">
        <button
          class="mode-button"
          class:mode-button--active={isEqualMode}
          type="button"
          onclick={() => appState.setLyricLabelMode('fixed')}
        >
          Equal
        </button>
        <button
          class="mode-button"
          class:mode-button--active={!isEqualMode}
          type="button"
          onclick={() => appState.setLyricLabelMode('auto')}
        >
          Relative
        </button>
      </div>
    {/if}
  </div>
  <div class="size-controls">
    <button
      class="size-button"
      type="button"
      aria-label="Decrease lyric text size"
      title="Decrease lyric text size"
      onclick={() => appState.decreaseLyricTextSize()}
      disabled={!canDecrease}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 13 5 7h10Z" />
      </svg>
    </button>
    <span class="size-value">{valueLabel}</span>
    <button
      class="size-button"
      type="button"
      aria-label="Increase lyric text size"
      title="Increase lyric text size"
      onclick={() => appState.increaseLyricTextSize()}
      disabled={!canIncrease}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 7 5 13h10Z" />
      </svg>
    </button>
  </div>
</div>

<style>
  .lyric-label-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    width: 100%;
    min-width: 0;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .label-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .mode-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .mode-button {
    padding: 0.35rem 0.75rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--font-size-xs, 0.75rem);
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .mode-button:hover {
    color: var(--color-text);
  }

  .mode-button--active {
    background: rgba(95, 149, 255, 0.2);
    color: #fff;
  }

  .size-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.6rem;
    width: 100%;
  }

  .size-button {
    width: 32px;
    height: 32px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text);
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .size-button:hover:not(:disabled) {
    background: rgba(95, 149, 255, 0.18);
    border-color: rgba(95, 149, 255, 0.5);
    color: #fff;
  }

  .size-button:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .size-button svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .size-value {
    font-size: var(--font-size-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-text);
    min-width: 52px;
    text-align: center;
  }
</style>
