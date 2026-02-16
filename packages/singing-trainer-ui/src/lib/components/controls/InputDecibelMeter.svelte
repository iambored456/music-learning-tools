<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { pitchState } from '@mlt/singing-trainer-core/stores/pitchState.svelte.js';

  const METER_MIN_DB = -60;
  const METER_MAX_DB = 0;

  const isDetecting = $derived(appState.state.isDetecting);
  const inputLevelDb = $derived(pitchState.state.inputLevelDb);

  const normalizedLevel = $derived(() => {
    if (inputLevelDb === null) return 0;
    const clamped = Math.max(METER_MIN_DB, Math.min(METER_MAX_DB, inputLevelDb));
    return (clamped - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB);
  });

  const levelLabel = $derived(
    isDetecting && inputLevelDb !== null ? `${inputLevelDb.toFixed(1)} dB` : '-- dB'
  );
</script>

<div class="input-decibel-meter">
  <div class="meter-header">
    <span class="meter-title">Input Level</span>
    <span class="meter-value">{levelLabel}</span>
  </div>

  <div class="meter-track" aria-hidden="true">
    <div class="meter-fill" style={`transform: scaleX(${normalizedLevel});`}></div>
  </div>

  <div class="meter-scale">
    <span>{METER_MIN_DB} dB</span>
    <span>{METER_MAX_DB} dB</span>
  </div>

  {#if !isDetecting}
    <p class="meter-hint">Start the microphone to view live input level.</p>
  {/if}
</div>

<style>
  .input-decibel-meter {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    width: 100%;
    padding: 12px;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.05);
  }

  .meter-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  .meter-title {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }

  .meter-value {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .meter-track {
    position: relative;
    width: 100%;
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .meter-fill {
    width: 100%;
    height: 100%;
    transform-origin: left center;
    transition: transform 80ms linear;
    background: linear-gradient(90deg, #3ca55c 0%, #f8b500 62%, #ff4d4d 100%);
  }

  .meter-scale {
    display: flex;
    justify-content: space-between;
    font-size: 0.68rem;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .meter-hint {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
</style>
