<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getRelaxedMicGatesEnabled,
    setRelaxedMicGatesEnabled,
  } from '@mlt/singing-trainer-core/services/pitchDetection.js';

  let relaxedMicGatesEnabled = $state(false);

  function handleToggle(event: Event): void {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    relaxedMicGatesEnabled = checked;
    setRelaxedMicGatesEnabled(checked);
  }

  onMount(() => {
    relaxedMicGatesEnabled = getRelaxedMicGatesEnabled();
  });
</script>

<div class="testing-mode-panel">
  <label class="testing-toggle">
    <input
      id="mic-relaxed-gates"
      type="checkbox"
      checked={relaxedMicGatesEnabled}
      onchange={handleToggle}
    />
    <span>User testing mode: ignore confidence and dB gates</span>
  </label>

  {#if relaxedMicGatesEnabled}
    <p class="hint">
      Low-confidence and low-level mic input is accepted while this mode is on.
    </p>
  {/if}
</div>

<style>
  .testing-mode-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .testing-toggle {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    cursor: pointer;
    user-select: none;
    line-height: 1.35;
  }

  .testing-toggle input[type='checkbox'] {
    margin-top: 0.15rem;
    cursor: pointer;
  }

  .hint {
    margin: 0;
    font-size: var(--font-size-xs);
    line-height: 1.4;
    color: var(--color-text);
  }
</style>
