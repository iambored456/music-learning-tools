<script lang="ts">
  /**
   * LyricLabelControls Component
   *
   * Controls for highway lyric label sizing.
   */

  import { appState } from '../../stores/appState.svelte.js';

  const isUniform = $derived(appState.state.lyricLabelMode === 'fixed');

  const sliderMin = $derived(isUniform ? 8 : 0.5);
  const sliderMax = $derived(isUniform ? 48 : 2.5);
  const sliderStep = $derived(isUniform ? 1 : 0.05);
  const sliderValue = $derived(
    isUniform ? appState.state.lyricLabelFixedPx : appState.state.lyricLabelScale
  );
  const valueLabel = $derived(
    isUniform
      ? `${appState.state.lyricLabelFixedPx}px`
      : `${Math.round(appState.state.lyricLabelScale * 100)}%`
  );

  function handleUniformToggle() {
    appState.setLyricLabelMode(isUniform ? 'auto' : 'fixed');
  }

  function handleSizeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);
    if (isUniform) {
      appState.setLyricLabelFixedPx(value);
    } else {
      appState.setLyricLabelScale(value);
    }
  }
</script>

<div class="lyric-label-controls">
  <div class="lyric-label-row">
    <span class="label-text">Lyric Size</span>
    <button
      class="toggle-button"
      class:active={isUniform}
      onclick={handleUniformToggle}
    >
      {isUniform ? 'Uniform' : 'Auto'}
    </button>
  </div>

  <div class="lyric-label-row">
    <input
      type="range"
      min={sliderMin}
      max={sliderMax}
      step={sliderStep}
      value={sliderValue}
      oninput={handleSizeChange}
    />
    <span class="size-value">{valueLabel}</span>
  </div>
</div>

<style>
  .lyric-label-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    width: 100%;
    min-width: 0;
  }

  .lyric-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    min-width: 0;
  }

  .label-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .toggle-button {
    padding: var(--spacing-xs) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
    min-width: 80px;
    text-align: center;
  }

  .toggle-button:hover {
    border-color: var(--color-secondary);
  }

  .toggle-button.active {
    background-color: var(--color-secondary);
    color: var(--color-bg);
    border-color: var(--color-secondary);
  }

  input[type='range'] {
    flex: 1 1 140px;
    height: 4px;
    cursor: pointer;
    min-width: 120px;
    max-width: 100%;
  }

  .size-value {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    min-width: 48px;
    text-align: right;
  }
</style>
