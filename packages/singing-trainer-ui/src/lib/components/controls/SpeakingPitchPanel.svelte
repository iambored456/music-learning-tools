<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { untrack } from 'svelte';
  import { getPitchByMidi } from '@mlt/pitch-data';

  interface Props {
    onCalibrate: () => void;
  }

  let { onCalibrate }: Props = $props();

  const DEFAULT_SPEAKING_PITCH_MIDI = 60;
  const speakingPitchMidi = $derived(preferencesStore.speakingPitchMidi);
  const displayedSpeakingPitchMidi = $derived(speakingPitchMidi ?? DEFAULT_SPEAKING_PITCH_MIDI);
  const speakingPitchDisplay = $derived((() => {
    const roundedMidi = Math.round(displayedSpeakingPitchMidi);
    const pitch = getPitchByMidi(roundedMidi);

    if (appState.state.showFrequencyLabels) {
      const frequency = pitch?.frequency ?? 440 * Math.pow(2, (roundedMidi - 69) / 12);
      return `${Math.round(frequency)} Hz`;
    }

    let label = preferencesStore.speakingPitchNoteName ?? 'C4';
    if (pitch) {
      const { flat, sharp } = appState.state.accidentalMode;
      if (!pitch.isAccidental) label = pitch.flatName;
      else if (flat && sharp) label = pitch.pitch;
      else if (flat) label = pitch.flatName;
      else if (sharp) label = pitch.sharpName;
      else label = '—';
    }

    return appState.state.showOctaveLabels ? label : label.replace(/\d+$/, '');
  })());

  function adjustSpeakingPitch(semitones: number): void {
    if (speakingPitchMidi !== null) {
      preferencesStore.adjustSpeakingPitch(semitones);
      return;
    }

    preferencesStore.setSpeakingPitch({
      speakingPitchMidi: DEFAULT_SPEAKING_PITCH_MIDI + semitones,
      speakingPitchLastCalibratedAt: new Date().toISOString(),
    });
  }

  function centerRangeAroundSpeakingPitch(): void {
    const centerMidi = Math.round(displayedSpeakingPitchMidi);
    appState.setYAxisRange({ minMidi: centerMidi - 6, maxMidi: centerMidi + 20 });
  }

  function applyNaturalKeyAccidentalPreference(midi: number): void {
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    if ([2, 4, 7, 9, 11].includes(pitchClass)) {
      appState.setAccidentalMode({ sharp: true, flat: false });
    } else if (pitchClass === 5) {
      appState.setAccidentalMode({ sharp: false, flat: true });
    }
  }

  $effect(() => {
    void displayedSpeakingPitchMidi;
    centerRangeAroundSpeakingPitch();
    appState.setCenterGridOnSpeakingPitch(true);
    appState.setCenterColorsOnSpeakingPitch(true);
    untrack(() => applyNaturalKeyAccidentalPreference(displayedSpeakingPitchMidi));
  });
</script>

<div class="speaking-pitch-panel">
  <h2 class="panel-title">Speaking Pitch</h2>

  <div class="pitch-display">
    <div class="pitch-value-row">
      <button class="adjust-btn" type="button" onclick={() => adjustSpeakingPitch(-1)} aria-label="Lower pitch">
        &minus;
      </button>
      <span class="note-name">{speakingPitchDisplay}</span>
      <button class="adjust-btn" type="button" onclick={() => adjustSpeakingPitch(1)} aria-label="Raise pitch">
        +
      </button>
    </div>
    <div class="pitch-action-row">
      <button class="recalibrate-button" type="button" onclick={onCalibrate}>Recalibrate</button>
      <button class="center-range-button" type="button" onclick={centerRangeAroundSpeakingPitch}>
        Zoom to
      </button>
    </div>
  </div>
</div>

<style>
  .speaking-pitch-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-panel);
    color: var(--color-text);
  }

  .panel-title {
    margin: 0;
    width: 100%;
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-align: center;
    text-transform: uppercase;
  }

  .recalibrate-button {
    flex: 1;
    min-width: 0;
    padding: 3px 7px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-control);
    color: var(--color-text);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  .recalibrate-button:hover {
    text-decoration: underline;
  }

  .pitch-display {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .pitch-value-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  .pitch-action-row {
    display: flex;
    align-items: stretch;
    gap: var(--spacing-sm);
    width: 100%;
  }

  .adjust-btn {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-control);
    color: var(--color-text);
    font-size: var(--font-size-lg);
    font-weight: 600;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .adjust-btn:hover {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }

  .note-name {
    min-width: 80px;
    color: var(--color-text);
    font-size: var(--font-size-2xl);
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }

  .center-range-button {
    flex: 1;
    min-width: 0;
    padding: 3px 7px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-control);
    color: var(--color-text);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  .center-range-button:hover {
    border-color: var(--color-secondary);
  }

</style>
