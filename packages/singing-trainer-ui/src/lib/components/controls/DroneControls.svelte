<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { startDrone, stopDrone, updateDrone } from '@mlt/singing-trainer-core/services/droneAudio.js';
  import volumeIconUrl from '../../assets/volume-icon.svg?url';

  import SegmentedToggle from './SegmentedToggle.svelte';

  let starting = $state(false);
  let error = $state('');

  function handleVolumeChange(event: Event): void {
    appState.setDroneVolume(Number((event.currentTarget as HTMLInputElement).value));
    updateDrone();
  }

  async function selectEngine(label: string): Promise<void> {
    if (starting) return;
    const engine = label === 'Sawtooth' ? 'synth' : 'tanpura';
    error = '';
    if (appState.state.drone.engine === engine && appState.state.drone.isPlaying) {
      stopDrone();
      return;
    }
    starting = true;
    try {
      stopDrone();
      appState.setDroneEngine(engine);
      await startDrone();
    } catch {
      stopDrone();
      error = 'Could not start the drone. Click a sound to retry.';
    } finally {
      starting = false;
    }
  }
</script>

<div class="drone-controls">
  <div class="drone-primary-row">
    <label class="volume-control" class:active={appState.state.drone.isPlaying}>
      <span
        class="volume-icon"
        aria-hidden="true"
        style={`--volume-icon-url: url("${volumeIconUrl}")`}
      ></span>
      <span class="sr-only">Drone volume</span>
      <input
        type="range"
        min="-40"
        max="0"
        value={appState.state.drone.volume}
        oninput={handleVolumeChange}
      />
    </label>
  </div>

  <SegmentedToggle label="Drone sound: click the playing sound to turn it off"
    options={['Sawtooth', 'Tanpura']} selected={appState.state.drone.engine === 'synth' ? 'Sawtooth' : 'Tanpura'}
    active={appState.state.drone.isPlaying} disabled={starting} onselect={selectEngine} />
  {#if error}<small role="alert">{error}</small>{/if}

</div>

<style>
  .drone-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    width: 100%;
    color: var(--color-text);
  }

  .drone-primary-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    min-width: 0;
  }

  .volume-control {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--spacing-sm);
    min-width: 0;
    color: var(--color-text-muted);
    opacity: 0.38;
    filter: grayscale(0.7);
    transition: color 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
  }

  .volume-control.active {
    color: var(--color-text);
    opacity: 1;
    filter: none;
  }

  .volume-icon {
    width: 1.35rem;
    height: 1.35rem;
    flex: 0 0 auto;
    background: currentColor;
    -webkit-mask: var(--volume-icon-url) center / contain no-repeat;
    mask: var(--volume-icon-url) center / contain no-repeat;
  }

  input[type='range'] {
    width: 100%;
    min-width: 0;
    height: 4px;
    accent-color: var(--color-primary);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
