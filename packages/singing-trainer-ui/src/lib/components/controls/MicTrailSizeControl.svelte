<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';

  const percentage = $derived(Math.round(appState.state.micTrailSizeScale * 100));
  const opacityPercentage = $derived(Math.round(appState.state.micTrailOpacity * 100));

  function handleSizeInput(event: Event): void {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    appState.setMicTrailSizeScale(value);
  }

  function handleOpacityInput(event: Event): void {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    appState.setMicTrailOpacity(value);
  }

  function handleConnectedTrailChange(event: Event): void {
    appState.setConnectedMicTrailEnabled((event.currentTarget as HTMLInputElement).checked);
  }
</script>

<div class="mic-trail-size-control">
  <div class="slider-group">
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

  <div class="slider-group">
    <label class="control-heading" for="mic-trail-opacity">
      <span>Mic Trail Opacity</span>
      <output for="mic-trail-opacity">{opacityPercentage}%</output>
    </label>
    <input
      id="mic-trail-opacity"
      type="range"
      min="0.1"
      max="1"
      step="0.05"
      value={appState.state.micTrailOpacity}
      oninput={handleOpacityInput}
      aria-label="Maximum combined mic trail opacity"
    />
  </div>

  <label class="toggle-row" for="connected-mic-trail">
    <span>
      <strong>Connected Mic Trail</strong>
      <small>Show a ribbon with a precise centerline</small>
    </span>
    <input
      id="connected-mic-trail"
      type="checkbox"
      checked={appState.state.connectedMicTrailEnabled}
      onchange={handleConnectedTrailChange}
    />
  </label>
</div>

<style>
  .mic-trail-size-control {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    width: 100%;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-panel);
  }

  .slider-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
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

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .toggle-row span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .toggle-row small {
    color: var(--color-text-muted);
  }

  .toggle-row input {
    width: 18px;
    height: 18px;
    accent-color: var(--color-secondary);
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
