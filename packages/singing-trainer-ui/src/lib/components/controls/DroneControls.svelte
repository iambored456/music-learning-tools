<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { toggleDrone, updateDrone } from '@mlt/singing-trainer-core/services/droneAudio.js';
  import volumeIconUrl from '../../assets/volume-icon.svg?url';

  async function handleToggle(): Promise<void> {
    await toggleDrone();
  }

  function handleVolumeChange(event: Event): void {
    appState.setDroneVolume(Number((event.currentTarget as HTMLInputElement).value));
    updateDrone();
  }

  function selectEngine(engine: 'synth' | 'tanpura'): void {
    if (appState.state.drone.engine === engine) return;
    appState.setDroneEngine(engine);
    updateDrone();
  }
</script>

<div class="drone-controls">
  <div class="drone-primary-row">
    <button
      class="drone-toggle"
      class:active={appState.state.drone.isPlaying}
      type="button"
      onclick={handleToggle}
    >
      {appState.state.drone.isPlaying ? 'Drone On' : 'Drone Off'}
    </button>

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

  <div
    class="engine-selector"
    data-engine={appState.state.drone.engine}
    role="group"
    aria-label="Drone sound"
  >
    <button
      class:active={appState.state.drone.engine === 'synth'}
      type="button"
      onclick={() => selectEngine('synth')}
      aria-pressed={appState.state.drone.engine === 'synth'}
    >
      Synth
    </button>
    <button
      class:active={appState.state.drone.engine === 'tanpura'}
      type="button"
      onclick={() => selectEngine('tanpura')}
      aria-pressed={appState.state.drone.engine === 'tanpura'}
    >
      Tanpura
    </button>
  </div>
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

  .drone-toggle {
    flex: 0 0 auto;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-control);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .drone-toggle:hover {
    border-color: var(--color-secondary);
  }

  .drone-toggle.active {
    background: var(--color-secondary);
    border-color: var(--color-secondary);
    color: var(--color-on-accent);
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

  .engine-selector {
    position: relative;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-self: center;
    width: min(100%, 230px);
    padding: 2px;
    border: 1px solid var(--color-border-strong);
    border-radius: 999px;
    background: var(--color-control);
    isolation: isolate;
  }

  .engine-selector::before {
    position: absolute;
    z-index: 0;
    top: 2px;
    bottom: 2px;
    left: 2px;
    width: calc((100% - 4px) / 2);
    border-radius: 999px;
    background: var(--color-secondary);
    box-shadow: 0 1px 4px color-mix(in srgb, var(--color-secondary) 35%, transparent);
    content: '';
    transition: transform 0.18s ease;
  }

  .engine-selector[data-engine='tanpura']::before {
    transform: translateX(100%);
  }

  .engine-selector button {
    position: relative;
    z-index: 1;
    min-height: 28px;
    padding: 3px 10px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-weight: 700;
    transition: color 0.18s ease;
  }

  .engine-selector button:hover:not(.active) {
    color: var(--color-text);
  }

  .engine-selector button.active {
    color: var(--color-on-accent);
  }

  .engine-selector button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
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
