<script lang="ts">
  import { onMount } from 'svelte';
  import { appState, type TonicNote } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { updateDrone } from '@mlt/singing-trainer-core/services/droneAudio.js';
  import SegmentedToggle from './SegmentedToggle.svelte';
  import SpeakingPitchPanel from './SpeakingPitchPanel.svelte';

  interface Props {
    onCalibrate: () => void;
  }

  let { onCalibrate }: Props = $props();

  const TONIC_OPTIONS: TonicNote[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];

  const speakingPitchMidi = $derived(preferencesStore.speakingPitchMidi);

  function midiToTonicAndOctave(midi: number): { tonic: TonicNote; octave: number } {
    const tonicIndex = ((Math.round(midi) % 12) + 12) % 12;
    return {
      tonic: TONIC_OPTIONS[tonicIndex] ?? 'C',
      octave: Math.floor(midi / 12) - 1,
    };
  }

  // Mode highlighting is retired; clear any active state when this panel mounts.
  onMount(() => {
    appState.setDroneModeEnabled(false);
  });

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

  <section class="settings-panel" aria-labelledby="legend-title">
    <h2 id="legend-title" class="panel-title">Legend</h2>

    <SegmentedToggle label="Legend labels" options={['Letters', 'Degrees']}
      selected={appState.state.drone.showDegrees ? 'Degrees' : 'Letters'}
      onselect={(value) => appState.setDroneShowDegrees(value === 'Degrees')} />

    <SegmentedToggle label="Temperament" options={['Equal', 'Just']}
      selected={appState.state.pitchTuningMode === 'just' ? 'Just' : 'Equal'}
      onselect={(value) => appState.setPitchTuningMode(value === 'Just' ? 'just' : 'equal')} />

    <div class="label-options-row" role="group" aria-label="Pitch label options">
      <button
        class="label-option accidental-label"
        class:active={!appState.state.showFrequencyLabels && appState.state.accidentalMode.flat}
        type="button"
        onclick={handleFlatToggle}
        aria-label="Flat" title="Flat"
        aria-pressed={!appState.state.showFrequencyLabels && appState.state.accidentalMode.flat}
      ><span aria-hidden="true">♭</span></button>
      <button
        class="label-option"
        class:active={!appState.state.showFrequencyLabels && appState.state.accidentalMode.sharp}
        type="button"
        onclick={handleSharpToggle}
        aria-label="Sharp" title="Sharp"
        aria-pressed={!appState.state.showFrequencyLabels && appState.state.accidentalMode.sharp}
      ><span class="accidental-symbol" aria-hidden="true">♯</span></button>
      <button
        class="label-option"
        class:active={appState.state.showFrequencyLabels}
        type="button"
        onclick={() => appState.toggleFrequencyLabels()}
        aria-label="Frequency labels in Hz" title="Frequency labels in Hz"
        aria-pressed={appState.state.showFrequencyLabels}
      >Hz</button>
      <button
        class="label-option"
        class:active={!appState.state.showFrequencyLabels && appState.state.showOctaveLabels}
        type="button"
        onclick={() => appState.toggleOctaveLabels()}
        aria-label="Octave digits" title="Show SPN octave digits"
        aria-pressed={!appState.state.showFrequencyLabels && appState.state.showOctaveLabels}
      ><span class="octave-label" aria-hidden="true">A<span class="octave-digit">1</span></span></button>
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

  .label-options-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    width: 100%;
  }

  .label-option {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    min-width: 0;
    padding: 3px 2px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-control);
    color: var(--color-text);
    font-size: 0.95rem;
    font-weight: 600;
  }

  .label-option.active {
    border-color: var(--color-secondary);
    background: var(--color-secondary);
    color: var(--color-on-accent);
  }

  /* Match Student Notation's glyphs and A1 label proportions, with this app's theme. */
  .accidental-label, .accidental-symbol { font-size: 1.2rem; }
  .octave-label { display: inline-flex; align-items: center; gap: 0.08em; line-height: 1; }
  .octave-digit { font-size: 0.72em; transition: opacity 0.15s ease; }
  .label-option:not(.active) .octave-digit { opacity: 0.4; }

</style>
