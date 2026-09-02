<script lang="ts">
  import { appState, type TonicNote } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { updateDrone } from '@mlt/singing-trainer-core/services/droneAudio.js';
  import { MODE_KEYS, MODE_NAMES } from '@mlt/singing-trainer-core/constants/modes.js';
  import SpeakingPitchPanel from './SpeakingPitchPanel.svelte';

  interface Props {
    onCalibrate: () => void;
  }

  let { onCalibrate }: Props = $props();

  const TONIC_OPTIONS: TonicNote[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];

  const speakingPitchMidi = $derived(preferencesStore.speakingPitchMidi);
  const speakingPitchAvailable = $derived(preferencesStore.isCalibrated);

  function midiToTonicAndOctave(midi: number): { tonic: TonicNote; octave: number } {
    const tonicIndex = ((Math.round(midi) % 12) + 12) % 12;
    return {
      tonic: TONIC_OPTIONS[tonicIndex] ?? 'C',
      octave: Math.floor(midi / 12) - 1,
    };
  }

  function handleSpeakingPitchToggle(): void {
    if (!speakingPitchAvailable) return;
    appState.setDroneUseSpeakingPitch(!appState.state.drone.useSpeakingPitch);
  }

  function handleCenterGridToggle(): void {
    if (!speakingPitchAvailable) return;
    appState.setCenterGridOnSpeakingPitch(!appState.state.centerGridOnSpeakingPitch);
  }

  function handleCenterColorToggle(): void {
    if (!speakingPitchAvailable) return;
    appState.setCenterColorsOnSpeakingPitch(!appState.state.centerColorsOnSpeakingPitch);
  }

  function handleModeToggle(): void {
    appState.setDroneModeEnabled(!appState.state.drone.modeEnabled);
  }

  function handleModeChange(event: Event): void {
    appState.setDroneSelectedMode((event.currentTarget as HTMLSelectElement).value);
  }

  function handleDegreesToggle(event: Event): void {
    appState.setDroneShowDegrees((event.currentTarget as HTMLInputElement).checked);
  }

  function handleTuningToggle(event: Event): void {
    appState.setPitchTuningMode(
      (event.currentTarget as HTMLInputElement).checked ? 'just' : 'equal'
    );
  }

  function handleFlatToggle(): void {
    appState.toggleAccidentalMode('flat');
  }

  function handleSharpToggle(): void {
    appState.toggleAccidentalMode('sharp');
  }

  $effect(() => {
    if (typeof speakingPitchMidi !== 'number' || !Number.isFinite(speakingPitchMidi)) {
      if (appState.state.drone.useSpeakingPitch) {
        appState.setDroneUseSpeakingPitch(false);
      }
      return;
    }

    updateDrone();
    if (!appState.state.drone.useSpeakingPitch) return;

    const { tonic, octave } = midiToTonicAndOctave(speakingPitchMidi);
    if (appState.state.tonic === tonic && appState.state.drone.octave === octave) return;

    appState.setTonic(tonic);
    appState.setDroneOctave(octave);
  });
</script>

<div class="user-settings-controls">
  <SpeakingPitchPanel {onCalibrate} />

  <section class="settings-panel" aria-labelledby="colour-highlights-title">
    <h2 id="colour-highlights-title" class="panel-title">Colour Highlights</h2>

    <div class="highlight-row">
      <span class="setting-label">Speaking Pitch</span>
      <button
        class="setting-button setting-button--state"
        class:active={appState.state.drone.useSpeakingPitch}
        type="button"
        onclick={handleSpeakingPitchToggle}
        disabled={!speakingPitchAvailable}
        aria-label="Toggle speaking pitch colour highlight"
        aria-pressed={appState.state.drone.useSpeakingPitch}
        title={speakingPitchAvailable
          ? 'Highlight your speaking pitch on the grid'
          : 'Calibrate your speaking pitch to enable this option'}
      >
        {appState.state.drone.useSpeakingPitch ? 'On' : 'Off'}
      </button>
    </div>

    <div class="centering-row">
      <button
        class="setting-button"
        class:active={appState.state.centerGridOnSpeakingPitch}
        type="button"
        onclick={handleCenterGridToggle}
        disabled={!speakingPitchAvailable}
        aria-pressed={appState.state.centerGridOnSpeakingPitch}
        title="Transpose the grid-line pattern around your speaking pitch"
      >
        Center Grid
      </button>
      <button
        class="setting-button"
        class:active={appState.state.centerColorsOnSpeakingPitch}
        type="button"
        onclick={handleCenterColorToggle}
        disabled={!speakingPitchAvailable}
        aria-pressed={appState.state.centerColorsOnSpeakingPitch}
        title="Transpose the C4 colour sequence around your speaking pitch"
      >
        Center Colour
      </button>
    </div>

    <div class="mode-row">
      <button
        class="setting-button"
        class:active={appState.state.drone.modeEnabled}
        type="button"
        onclick={handleModeToggle}
        aria-pressed={appState.state.drone.modeEnabled}
      >
        Mode
      </button>
      <select
        class="mode-select"
        class:active={appState.state.drone.modeEnabled}
        aria-label="Mode"
        value={appState.state.drone.selectedMode}
        onchange={handleModeChange}
      >
        {#each MODE_KEYS as key}
          <option value={key}>{MODE_NAMES[key]}</option>
        {/each}
      </select>
    </div>
  </section>

  <section class="settings-panel" aria-labelledby="legend-title">
    <h2 id="legend-title" class="panel-title">Legend</h2>

    <div class="degree-row">
      <span>Letters</span>
      <label class="switch" aria-label="Toggle legend labels between letters and degrees">
        <input
          type="checkbox"
          checked={appState.state.drone.showDegrees}
          onchange={handleDegreesToggle}
        />
        <span class="slider"></span>
      </label>
      <span>Degrees</span>
    </div>

    <div class="degree-row">
      <span>Equal</span>
      <label class="switch" aria-label="Toggle pitch-grid spacing between equal temperament and just intonation">
        <input
          type="checkbox"
          checked={appState.state.pitchTuningMode === 'just'}
          onchange={handleTuningToggle}
        />
        <span class="slider"></span>
      </label>
      <span>Just</span>
    </div>

    <div class="label-options-row" role="group" aria-label="Pitch label options">
      <button
        class="label-option"
        class:active={!appState.state.showFrequencyLabels && appState.state.accidentalMode.flat}
        type="button"
        onclick={handleFlatToggle}
        aria-pressed={!appState.state.showFrequencyLabels && appState.state.accidentalMode.flat}
      >Flat</button>
      <button
        class="label-option"
        class:active={!appState.state.showFrequencyLabels && appState.state.accidentalMode.sharp}
        type="button"
        onclick={handleSharpToggle}
        aria-pressed={!appState.state.showFrequencyLabels && appState.state.accidentalMode.sharp}
      >Sharp</button>
      <button
        class="label-option"
        class:active={appState.state.showFrequencyLabels}
        type="button"
        onclick={() => appState.toggleFrequencyLabels()}
        aria-pressed={appState.state.showFrequencyLabels}
      >Hz</button>
      <button
        class="label-option"
        class:active={!appState.state.showFrequencyLabels && appState.state.showOctaveLabels}
        type="button"
        onclick={() => appState.toggleOctaveLabels()}
        aria-pressed={!appState.state.showFrequencyLabels && appState.state.showOctaveLabels}
      >Octave</button>
    </div>
  </section>
</div>

<style>
  .user-settings-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    width: 100%;
    color: var(--color-text);
  }

  .settings-panel {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
    width: 100%;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-panel);
    box-shadow: var(--shadow-sm);
  }

  .panel-title {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-align: center;
    text-transform: uppercase;
  }

  .centering-row,
  .highlight-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
  }

  .highlight-row {
    justify-content: space-between;
  }

  .setting-label {
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .setting-button--state {
    flex: 0 0 auto;
    min-width: 3.25rem;
  }

  .setting-button {
    flex: 1;
    min-width: 0;
    padding: 3px 7px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-control);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 600;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .setting-button:hover:not(:disabled) {
    border-color: var(--color-secondary);
  }

  .setting-button.active {
    background: var(--color-secondary);
    border-color: var(--color-secondary);
    color: #fff;
  }

  .mode-row,
  .degree-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .label-options-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    width: 100%;
  }

  .label-option {
    min-width: 0;
    padding: 3px 2px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-control);
    color: var(--color-text);
    font-size: 0.68rem;
    font-weight: 600;
  }

  .label-option.active {
    border-color: var(--color-secondary);
    background: var(--color-secondary);
    color: #fff;
  }

  .mode-select {
    flex: 1;
    min-width: 0;
    padding: var(--spacing-xs) var(--spacing-sm);
    color: var(--color-text);
    background: var(--color-control);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .mode-select.active {
    border-color: var(--color-secondary);
    background: var(--color-secondary);
    color: var(--color-on-accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-secondary) 22%, transparent);
  }

  .mode-select option {
    background: var(--color-panel-strong);
    color: var(--color-text);
  }

  .degree-row {
    justify-content: center;
    font-size: var(--font-size-sm);
    color: var(--color-text);
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
    background: var(--color-control);
    border: 1px solid var(--color-border-strong);
    transition: background-color 0.2s ease;
  }

  .slider::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    left: 2px;
    top: 2px;
    border-radius: 50%;
    background: var(--color-text);
    transition: transform 0.2s ease;
  }

  .switch input:checked + .slider {
    background: var(--color-secondary);
  }

  .switch input:checked + .slider::before {
    transform: translateX(22px);
  }
</style>
