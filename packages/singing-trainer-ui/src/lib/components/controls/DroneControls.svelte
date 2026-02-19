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
    appState.toggleDrone();
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

  function handleFocusToggle() {
    appState.setDroneFocusLegend(!appState.state.drone.focusLegend);
  }

  function handleDegreesToggle() {
    appState.setDroneShowDegrees(!appState.state.drone.showDegrees);
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

  <div class="engine-row">
    <span class="control-label">Engine:</span>
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
      class="tuning-button"
      onclick={openTuningModal}
      disabled={appState.state.drone.engine !== 'tanpura'}
      title={appState.state.drone.engine === 'tanpura'
        ? 'Open tanpura tuning controls'
        : 'Switch to Tanpura engine to tune behavior'}
    >
      Tuning...
    </button>
  </div>

  <div class="pitch-octave-grid">
    <label class="grid-label" for="drone-tonic-select">Pitch:</label>
    <label class="grid-label" for="drone-octave-select">Octave:</label>
    <div class="grid-control">
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
    <div class="grid-control">
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
    <div class="speaking-pitch-row">
      <button
        class="speaking-pitch-toggle"
        class:active={useSpeakingPitch}
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
    <button
      class="mode-option-toggle"
      class:active={appState.state.drone.focusLegend}
      onclick={handleFocusToggle}
      disabled={!appState.state.drone.modeEnabled}
      aria-pressed={appState.state.drone.focusLegend}
      title="Dim legend pitches outside the selected mode"
    >
      Focus
    </button>
    <button
      class="mode-option-toggle"
      class:active={appState.state.drone.showDegrees}
      onclick={handleDegreesToggle}
      disabled={!appState.state.drone.modeEnabled}
      aria-pressed={appState.state.drone.showDegrees}
      title="Show scale degree numbers instead of pitch names"
    >
      Degrees
    </button>
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
    padding: var(--spacing-xs) var(--spacing-sm);
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

  .pitch-octave-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: var(--spacing-sm);
    row-gap: var(--spacing-xs);
    align-items: start;
  }

  .grid-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .grid-control {
    display: flex;
    align-items: center;
    min-width: 0;
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

  .grid-control select {
    width: 100%;
    min-width: 0;
  }

  .speaking-pitch-row {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-start;
    margin-top: var(--spacing-xs);
  }

  select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .speaking-pitch-toggle {
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
    gap: var(--spacing-xs);
  }

  .mode-option-toggle {
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

  .mode-option-toggle:hover:not(:disabled) {
    border-color: var(--color-secondary);
  }

  .mode-option-toggle.active {
    background-color: var(--color-secondary);
    color: var(--color-bg);
    border-color: var(--color-secondary);
  }

  .mode-option-toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
