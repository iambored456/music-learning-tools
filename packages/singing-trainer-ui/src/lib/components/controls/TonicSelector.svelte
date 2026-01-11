<script lang="ts">
  /**
   * TonicSelector Component
   *
   * Dropdown for selecting the tonic/key center.
   */

  import { appState, type TonicNote } from '../../stores/appState.svelte.js';
  import { updateDrone } from '../../services/droneAudio.js';

  const TONIC_OPTIONS: TonicNote[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    appState.setTonic(target.value as TonicNote);
    updateDrone();
  }
</script>

<div class="tonic-selector">
  <label for="tonic-select">Key:</label>
  <select
    id="tonic-select"
    value={appState.state.tonic}
    onchange={handleChange}
  >
    {#each TONIC_OPTIONS as tonic}
      <option value={tonic}>{tonic}</option>
    {/each}
  </select>
</div>

<style>
  .tonic-selector {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  label {
    font-weight: 500;
    color: var(--color-text-muted);
  }

  select {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    min-width: 70px;
  }

  select:hover {
    border-color: var(--color-secondary);
  }

  select:focus {
    outline: none;
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 2px rgba(0, 217, 255, 0.2);
  }
</style>
