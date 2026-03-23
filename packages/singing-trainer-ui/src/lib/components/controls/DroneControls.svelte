<script lang="ts">
  /**
   * DroneControls Component
   *
   * Controls for the drone reference tone.
   */

  import { appState, type TonicNote } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { toggleDrone, updateDrone } from '@mlt/singing-trainer-core/services/droneAudio.js';
  import { MODE_NAMES, MODE_KEYS } from '@mlt/singing-trainer-core/constants/modes.js';
  import TanpuraTuningModal from './TanpuraTuningModal.svelte';
  import tanpuraTuningIconUrl from '../../assets/tanpura-tuning-icon.svg?url';

  const TONIC_OPTIONS: TonicNote[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];
  const OCTAVE_OPTIONS = [2, 3, 4, 5];

  let useSpeakingPitch = $state(false);
  let showTuningModal = $state(false);

  const speakingPitchMidi = $derived(preferencesStore.speakingPitchMidi);
  const speakingPitchAvailable = $derived(preferencesStore.isCalibrated);

  async function handleToggle() {
    await toggleDrone();
  }

  function handleTonicChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    appState.setTonic(target.value as TonicNote);
    updateDrone();
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

  function handleSpeakingPitchToggle() {
    if (!speakingPitchAvailable) return;
    useSpeakingPitch = !useSpeakingPitch;
  }

  function handleModeToggle() {
    appState.setDroneModeEnabled(!appState.state.drone.modeEnabled);
  }

  function handleEngineToggle(event: Event) {
    const target = event.target as HTMLInputElement;
    appState.setDroneEngine(target.checked ? 'tanpura' : 'synth');
    updateDrone();
  }

  function openTuningModal() {
    showTuningModal = true;
  }

  function closeTuningModal() {
    showTuningModal = false;
  }

  function handleModeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    appState.setDroneSelectedMode(target.value);
  }

  function handleDegreesToggle(event: Event) {
    const target = event.target as HTMLInputElement;
    appState.setDroneShowDegrees(target.checked);
  }

  function midiToTonicAndOctave(midi: number): { tonic: TonicNote; octave: number } {
    const tonicIndex = ((Math.round(midi) % 12) + 12) % 12;
    const tonic = TONIC_OPTIONS[tonicIndex] ?? 'C';
    const octave = Math.floor(midi / 12) - 1;
    return { tonic, octave };
  }

  $effect(() => {
    if (!useSpeakingPitch) return;
    if (typeof speakingPitchMidi !== 'number' || !Number.isFinite(speakingPitchMidi)) {
      useSpeakingPitch = false;
      return;
    }

    const { tonic, octave } = midiToTonicAndOctave(speakingPitchMidi);
    const currentTonic = appState.state.tonic;
    const currentOctave = appState.state.drone.octave;
    const shouldUpdate = currentTonic !== tonic || currentOctave !== octave;

    if (!shouldUpdate) return;

    appState.setTonic(tonic);
    appState.setDroneOctave(octave);
    updateDrone();
  });
</script>

<div class="drone-controls">
  <button
    class="drone-toggle"
    class:active={appState.state.drone.isPlaying}
    onclick={handleToggle}
  >
    {appState.state.drone.isPlaying ? 'Drone On' : 'Drone Off'}
  </button>

  <label class="control-row">
    <span class="control-label">Volume:</span>
    <input
      type="range"
      min="-40"
      max="0"
      value={appState.state.drone.volume}
      oninput={handleVolumeChange}
    />
  </label>

  <div class="engine-row">
    <div class="engine-toggle-wrap">
      <span class="engine-label">Synth</span>
      <label class="switch" aria-label="Toggle drone engine">
        <input
          type="checkbox"
          checked={appState.state.drone.engine === 'tanpura'}
          onchange={handleEngineToggle}
        />
        <span class="slider"></span>
      </label>
      <span class="engine-label">Tanpura</span>
    </div>
    <button
      class="tuning-button tuning-button--icon"
      type="button"
      onclick={openTuningModal}
      disabled={appState.state.drone.engine !== 'tanpura'}
      aria-label="Open Tanpura tuning popup"
      title={appState.state.drone.engine === 'tanpura'
        ? 'Open Tanpura tuning popup'
        : 'Switch to Tanpura engine to tune behavior'}
    >
      <span
        class="tuning-icon"
        aria-hidden="true"
        style={`--tuning-icon-url: url("${tanpuraTuningIconUrl}")`}
      ></span>
    </button>
  </div>

  <div class="pitch-settings-row">
    <div class="stacked-control">
      <label class="grid-label" for="drone-tonic-select">Pitch</label>
      <select
        id="drone-tonic-select"
        value={appState.state.tonic}
        onchange={handleTonicChange}
        disabled={useSpeakingPitch}
      >
        {#each TONIC_OPTIONS as tonic}
          <option value={tonic}>{tonic}</option>
        {/each}
      </select>
    </div>
    <div class="stacked-control">
      <label class="grid-label" for="drone-octave-select">Octave</label>
      <select
        id="drone-octave-select"
        value={appState.state.drone.octave}
        onchange={handleOctaveChange}
        disabled={useSpeakingPitch}
      >
        {#each OCTAVE_OPTIONS as oct}
          <option value={oct}>{oct}</option>
        {/each}
      </select>
    </div>
    <div class="stacked-control stacked-control--action">
      <span class="grid-label grid-label--placeholder" aria-hidden="true">Speaking</span>
      <button
        class="speaking-pitch-toggle speaking-pitch-toggle--inline"
        class:active={useSpeakingPitch}
        type="button"
        onclick={handleSpeakingPitchToggle}
        disabled={!speakingPitchAvailable}
        aria-pressed={useSpeakingPitch}
        title={speakingPitchAvailable
          ? 'Use your calibrated speaking pitch for the drone'
          : 'Calibrate your speaking pitch to enable this option'}
      >
        Speaking Pitch
      </button>
    </div>
  </div>

  <div class="mode-row">
    <button
      class="mode-toggle"
      class:active={appState.state.drone.modeEnabled}
      onclick={handleModeToggle}
      aria-pressed={appState.state.drone.modeEnabled}
      title="Highlight diatonic mode pitches on the grid"
    >
      Mode
    </button>
    <select
      class="mode-select"
      value={appState.state.drone.selectedMode}
      onchange={handleModeChange}
      disabled={!appState.state.drone.modeEnabled}
    >
      {#each MODE_KEYS as key}
        <option value={key}>{MODE_NAMES[key]}</option>
      {/each}
    </select>
  </div>

  <div class="mode-options-row">
    <div class="mode-toggle-wrap">
      <span class="mode-toggle-label">Letters</span>
      <label class="switch" aria-label="Toggle legend labels between letters and degrees">
        <input
          type="checkbox"
          checked={appState.state.drone.showDegrees}
          onchange={handleDegreesToggle}
          disabled={!appState.state.drone.modeEnabled}
        />
        <span class="slider"></span>
      </label>
      <span class="mode-toggle-label">Degrees</span>
    </div>
  </div>
</div>

{#if showTuningModal}
  <TanpuraTuningModal onClose={closeTuningModal} />
{/if}

<style>
  .drone-controls {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
    width: 100%;
  }

  .drone-toggle {
    align-self: flex-start;
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

  .control-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    min-width: 0;
  }

  .control-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    min-width: 52px;
  }

  .engine-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .engine-toggle-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .engine-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    min-width: 3.5rem;
    text-align: center;
  }

  .switch {
    position: relative;
    width: 46px;
    height: 24px;
    display: inline-block;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.18);
    transition: all 0.2s ease;
  }

  .slider::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    left: 2px;
    top: 2px;
    border-radius: 999px;
    background: #fff;
    transition: transform 0.2s ease;
  }

  .switch input:checked + .slider {
    background: rgba(95, 149, 255, 0.55);
    border-color: rgba(95, 149, 255, 0.9);
  }

  .switch input:checked + .slider::before {
    transform: translateX(22px);
  }

  .tuning-button {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text);
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tuning-button:hover:not(:disabled) {
    border-color: var(--color-secondary);
  }

  .tuning-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .tuning-button--icon {
    width: 2.2rem;
    height: 2.2rem;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tuning-icon {
    width: 1.2rem;
    height: 1.2rem;
    display: block;
    background-color: currentColor;
    -webkit-mask-image: var(--tuning-icon-url);
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
    mask-image: var(--tuning-icon-url);
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
  }

  .pitch-settings-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-sm);
    align-items: end;
  }

  .stacked-control {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-width: 0;
  }

  .stacked-control--action {
    justify-content: flex-end;
  }

  .grid-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    white-space: nowrap;
    line-height: 1.1;
  }

  .grid-label--placeholder {
    visibility: hidden;
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

  .stacked-control select {
    width: 100%;
    min-width: 0;
  }

  select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .speaking-pitch-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--color-text);
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .speaking-pitch-toggle--inline {
    width: 100%;
    min-width: 0;
    text-align: center;
    line-height: 1.15;
  }

  .speaking-pitch-toggle:hover:not(:disabled) {
    border-color: var(--color-secondary);
  }

  .speaking-pitch-toggle.active {
    background-color: var(--color-secondary);
    color: var(--color-bg);
    border-color: var(--color-secondary);
  }

  .speaking-pitch-toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input[type='range'] {
    width: 120px;
    height: 4px;
    cursor: pointer;
    max-width: 100%;
  }

  .mode-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .mode-toggle {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text);
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mode-toggle:hover {
    border-color: var(--color-secondary);
  }

  .mode-toggle.active {
    background-color: var(--color-secondary);
    color: var(--color-bg);
    border-color: var(--color-secondary);
  }

  .mode-select {
    flex: 1;
    min-width: 0;
  }

  .mode-options-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .mode-toggle-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .mode-toggle-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    min-width: 3.25rem;
    text-align: center;
  }
</style>
