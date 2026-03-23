<script lang="ts">
  /**
   * RangeControl Component
   *
   * Preset buttons for pitch range selection.
   */
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';

  const voicePresets = [
    { label: 'Voice I', minMidi: 57, maxMidi: 81 },   // A3-A5
    { label: 'Voice II', minMidi: 48, maxMidi: 72 },  // C3-C5
    { label: 'Voice III', minMidi: 40, maxMidi: 64 }, // E2-E4
  ];

  const topMidi = $derived(appState.state.yAxisRange.maxMidi);
  const bottomMidi = $derived(appState.state.yAxisRange.minMidi);
</script>

<div class="range-control">
  <h3 class="control-title">Pitch Range Presets</h3>

  <div class="preset-row">
    {#each voicePresets as preset}
      <button
        class="preset-btn"
        class:preset-btn--active={topMidi === preset.maxMidi && bottomMidi === preset.minMidi}
        onclick={() => appState.setYAxisRange({ minMidi: preset.minMidi, maxMidi: preset.maxMidi })}
      >
        {preset.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .range-control {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .control-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
    letter-spacing: 0.5px;
  }

  .preset-row {
    display: flex;
    gap: 6px;
  }

  .preset-btn {
    flex: 1;
    padding: 4px 2px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.3);
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .preset-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .preset-btn--active {
    background: var(--color-primary, #5b8dd9);
    color: white;
    border-color: transparent;
  }
</style>
