<script lang="ts">
  /**
   * DroneControls Component
   *
   * Controls for the drone reference tone.
   */

  import { appState } from '../../stores/appState.svelte.js';
  import { toggleDrone, updateDrone } from '../../services/droneAudio.js';

  const OCTAVE_OPTIONS = [2, 3, 4, 5];

  async function handleToggle() {
    await toggleDrone();
    appState.toggleDrone();
  }

  function handleOctaveChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    appState.setDroneOctave(parseInt(target.value, 10));
    updateDrone();
  }

  function handleVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    appState.setDroneVolume(parseInt(target.value, 10));
    updateDrone();
  }
</script>

<div class="drone-controls">
  <button
    class="drone-toggle"
    class:active={appState.state.drone.isPlaying}
    onclick={handleToggle}
  >
    {appState.state.drone.isPlaying ? 'Drone On' : 'Drone Off'}
  </button>

  <div class="drone-settings">
    <label>
      Oct:
      <select value={appState.state.drone.octave} onchange={handleOctaveChange}>
        {#each OCTAVE_OPTIONS as oct}
          <option value={oct}>{oct}</option>
        {/each}
      </select>
    </label>

    <label>
      Vol:
      <input
        type="range"
        min="-40"
        max="0"
        value={appState.state.drone.volume}
        oninput={handleVolumeChange}
      />
    </label>
  </div>
</div>

<style>
  .drone-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .drone-toggle {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
  }

  .drone-toggle:hover {
    border-color: var(--color-secondary);
  }

  .drone-toggle.active {
    background-color: var(--color-secondary);
    color: var(--color-bg);
    border-color: var(--color-secondary);
  }

  .drone-settings {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  select {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  input[type='range'] {
    width: 80px;
    height: 4px;
    cursor: pointer;
  }
</style>
