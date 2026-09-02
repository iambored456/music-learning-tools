<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';

  const percentage = $derived(Math.round(appState.state.micTrailSizeScale * 100));

  function handleSizeInput(event: Event): void {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    appState.setMicTrailSizeScale(value);
  }
</script>

<div class="mic-trail-size-control">
  <label class="control-heading" for="mic-trail-size">
    <span>Mic Trail Size</span>
    <output for="mic-trail-size">{percentage}%</output>
  </label>
  <input
    id="mic-trail-size"
    type="range"
    min="0.5"
    max="2"
    step="0.05"
    value={appState.state.micTrailSizeScale}
    oninput={handleSizeInput}
    aria-label="Mic trail size"
  />
</div>

<style>
  .mic-trail-size-control {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    width: 100%;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-panel);
  }

  .control-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  output {
    min-width: 3.25rem;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--color-secondary);
    cursor: pointer;
  }
</style>
