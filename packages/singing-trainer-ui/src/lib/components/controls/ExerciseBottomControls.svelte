<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { overdubExerciseState } from '@mlt/singing-trainer-core/stores/overdubExerciseState.svelte.js';
  import { highwayState } from '@mlt/singing-trainer-core/stores/highwayState.svelte.js';
  import { toggleDrone, updateDrone } from '@mlt/singing-trainer-core/services/droneAudio.js';

  const OCTAVE_OPTIONS = [2, 3, 4, 5];
  const MIN_KEY_SHIFT = -6;
  const MAX_KEY_SHIFT = 6;

  const isExerciseActive = $derived(
    overdubExerciseState.state.isActive
      && overdubExerciseState.state.template?.category === 'exercises'
  );
  const exerciseName = $derived(overdubExerciseState.state.template?.name ?? '');
  const isPlaying = $derived(overdubExerciseState.state.isPlaying);
  const waitForInputEnabled = $derived(overdubExerciseState.state.waitForInputEnabled);
  const keyShiftSemitones = $derived(overdubExerciseState.getExerciseKeyShiftSemitones());
  const lockedTonic = $derived(overdubExerciseState.getExerciseLockedTonic());
  const canToggleLabelMode = $derived(
    isExerciseActive
      && appState.state.noteScaleDegrees.length === highwayState.state.targetNotes.length
      && highwayState.state.targetNotes.some((note) => typeof note.lyric === 'string' && note.lyric.length > 0)
  );
  const canShiftDown = $derived(keyShiftSemitones > MIN_KEY_SHIFT);
  const canShiftUp = $derived(keyShiftSemitones < MAX_KEY_SHIFT);
  const droneModeEnabled = $derived(appState.state.drone.modeEnabled);
  const beatGridLinesEnabled = $derived(appState.state.showBeatGridLines);
  const measureGridLinesEnabled = $derived(appState.state.showMeasureGridLines);
  const horizontalGridLinesEnabled = $derived(appState.state.showHorizontalGridLines);

  async function handleStartExercise() {
    const template = overdubExerciseState.state.template;
    const leadInBeats = Math.max(0, Math.round(template?.config.countInBeats ?? 0));
    const tempoBpm = Math.max(20, Math.round(overdubExerciseState.state.tempo || template?.config.tempo || 80));
    await overdubExerciseState.start({
      leadInBeats,
      tempoBpm,
    });
  }

  function handleStopExercise() {
    overdubExerciseState.stop();
  }

  function handleCloseExercise() {
    overdubExerciseState.reset();
    appState.setUseDegrees(false);
  }

  function handleWaitgateToggle(enabled: boolean) {
    overdubExerciseState.setWaitForInputEnabled(enabled);
  }

  function handleLabelModeToggle(useDegrees: boolean) {
    appState.setUseDegrees(useDegrees);
  }

  function handleKeyShift(delta: number) {
    overdubExerciseState.shiftExerciseKey(delta);
  }

  async function handleDroneToggle() {
    await toggleDrone();
    appState.toggleDrone();
  }

  function handleDroneOctaveChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const octave = Number.parseInt(target.value, 10);
    if (!Number.isFinite(octave)) return;
    appState.setDroneOctave(octave);
    updateDrone();
  }

  function handleDroneVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const volume = Number.parseInt(target.value, 10);
    if (!Number.isFinite(volume)) return;
    appState.setDroneVolume(volume);
    updateDrone();
  }

  function handleDroneModeToggle(enabled: boolean) {
    appState.setDroneModeEnabled(enabled);
  }

  function handleDroneFocusToggle() {
    appState.setDroneFocusLegend(!appState.state.drone.focusLegend);
  }

  function handleDroneDegreesToggle() {
    appState.setDroneShowDegrees(!appState.state.drone.showDegrees);
  }

  function handleBeatGridLinesToggle(enabled: boolean) {
    appState.setShowBeatGridLines(enabled);
  }

  function handleMeasureGridLinesToggle(enabled: boolean) {
    appState.setShowMeasureGridLines(enabled);
  }

  function handleHorizontalGridLinesToggle(enabled: boolean) {
    appState.setShowHorizontalGridLines(enabled);
  }

  // Keep tonic locked to the exercise key while exercise mode is active.
  $effect(() => {
    if (!isExerciseActive || !lockedTonic) return;
    if (appState.state.tonic !== lockedTonic) {
      appState.setTonic(lockedTonic);
      updateDrone();
    }
  });
</script>

{#if isExerciseActive}
  <div class="exercise-controls-panel">
    <div class="exercise-header">
      <span class="title">{exerciseName}</span>
      <button class="close-btn" onclick={handleCloseExercise} aria-label="Close exercise">
        &#10005;
      </button>
    </div>

    <div class="exercise-layout">
      <section class="column">
        <div class="field">
          <span>Exercise</span>
          <div class="row-buttons" role="group" aria-label="Exercise transport">
            {#if isPlaying}
              <button class="mode-btn mode-btn--stop" onclick={handleStopExercise}>
                Stop
              </button>
            {:else}
              <button class="mode-btn mode-btn--start" onclick={handleStartExercise}>
                Start Exercise
              </button>
            {/if}
          </div>
        </div>

        <div class="field">
          <span>Waitgate</span>
          <div class="row-buttons" role="group" aria-label="Waitgate mode">
            <button
              class="mode-btn"
              class:mode-btn--active={waitForInputEnabled}
              onclick={() => handleWaitgateToggle(true)}
            >
              On
            </button>
            <button
              class="mode-btn"
              class:mode-btn--active={!waitForInputEnabled}
              onclick={() => handleWaitgateToggle(false)}
            >
              Off
            </button>
          </div>
        </div>

        {#if canToggleLabelMode}
          <div class="field">
            <span>Labels</span>
            <div class="row-buttons" role="group" aria-label="Melody label mode">
              <button
                class="mode-btn"
                class:mode-btn--active={!appState.state.useDegrees}
                onclick={() => handleLabelModeToggle(false)}
              >
                Lyrics
              </button>
              <button
                class="mode-btn"
                class:mode-btn--active={appState.state.useDegrees}
                onclick={() => handleLabelModeToggle(true)}
              >
                Degrees
              </button>
            </div>
          </div>
        {/if}
      </section>

      <section class="column">
        <div class="field">
          <span>Key Shift</span>
          <div class="key-shift-row" role="group" aria-label="Exercise key shift">
            <button
              class="shift-btn"
              onclick={() => handleKeyShift(-1)}
              disabled={!canShiftDown}
              aria-label="Shift key down one semitone"
            >
              -
            </button>
            <span class="shift-value">
              {keyShiftSemitones >= 0 ? '+' : ''}{keyShiftSemitones} semitones
            </span>
            <button
              class="shift-btn"
              onclick={() => handleKeyShift(1)}
              disabled={!canShiftUp}
              aria-label="Shift key up one semitone"
            >
              +
            </button>
          </div>
        </div>

        <div class="field">
          <span>Locked Key</span>
          <div class="locked-key-value">
            {lockedTonic ?? appState.state.tonic}
          </div>
        </div>

        <div class="field">
          <span>Beat Lines</span>
          <div class="row-buttons" role="group" aria-label="Beat line visibility">
            <button
              class="mode-btn"
              class:mode-btn--active={beatGridLinesEnabled}
              onclick={() => handleBeatGridLinesToggle(true)}
            >
              On
            </button>
            <button
              class="mode-btn"
              class:mode-btn--active={!beatGridLinesEnabled}
              onclick={() => handleBeatGridLinesToggle(false)}
            >
              Off
            </button>
          </div>
        </div>

        <div class="field">
          <span>Measure Lines</span>
          <div class="row-buttons" role="group" aria-label="Measure line visibility">
            <button
              class="mode-btn"
              class:mode-btn--active={measureGridLinesEnabled}
              onclick={() => handleMeasureGridLinesToggle(true)}
            >
              On
            </button>
            <button
              class="mode-btn"
              class:mode-btn--active={!measureGridLinesEnabled}
              onclick={() => handleMeasureGridLinesToggle(false)}
            >
              Off
            </button>
          </div>
        </div>

        <div class="field">
          <span>Horizontal Grid</span>
          <div class="row-buttons" role="group" aria-label="Horizontal gridline visibility">
            <button
              class="mode-btn"
              class:mode-btn--active={horizontalGridLinesEnabled}
              onclick={() => handleHorizontalGridLinesToggle(true)}
            >
              On
            </button>
            <button
              class="mode-btn"
              class:mode-btn--active={!horizontalGridLinesEnabled}
              onclick={() => handleHorizontalGridLinesToggle(false)}
            >
              Off
            </button>
          </div>
        </div>
      </section>

      <section class="column">
        <div class="field">
          <span>Drone</span>
          <div class="row-buttons" role="group" aria-label="Drone toggle">
            <button
              class="mode-btn"
              class:mode-btn--active={appState.state.drone.isPlaying}
              onclick={handleDroneToggle}
            >
              {appState.state.drone.isPlaying ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div class="field">
          <span>Drone Mode</span>
          <div class="row-buttons" role="group" aria-label="Drone mode toggle">
            <button
              class="mode-btn"
              class:mode-btn--active={droneModeEnabled}
              onclick={() => handleDroneModeToggle(true)}
            >
              On
            </button>
            <button
              class="mode-btn"
              class:mode-btn--active={!droneModeEnabled}
              onclick={() => handleDroneModeToggle(false)}
            >
              Off
            </button>
          </div>
        </div>

        <div class="field">
          <span>Mode View</span>
          <div class="row-buttons" role="group" aria-label="Drone mode view controls">
            <button
              class="mode-btn"
              class:mode-btn--active={appState.state.drone.focusLegend}
              onclick={handleDroneFocusToggle}
              disabled={!droneModeEnabled}
            >
              Focus
            </button>
            <button
              class="mode-btn"
              class:mode-btn--active={appState.state.drone.showDegrees}
              onclick={handleDroneDegreesToggle}
              disabled={!droneModeEnabled}
            >
              Degrees
            </button>
          </div>
        </div>

        <div class="field">
          <span>Octave</span>
          <select value={appState.state.drone.octave} onchange={handleDroneOctaveChange}>
            {#each OCTAVE_OPTIONS as oct}
              <option value={oct}>{oct}</option>
            {/each}
          </select>
        </div>

        <div class="field">
          <span>Volume</span>
          <input
            class="volume-slider"
            type="range"
            min="-40"
            max="0"
            value={appState.state.drone.volume}
            oninput={handleDroneVolumeChange}
            aria-label="Drone volume"
          />
        </div>
      </section>
    </div>
  </div>
{/if}

<style>
  .exercise-controls-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 8px;
    background: rgba(9, 14, 22, 0.55);
  }

  .exercise-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  .title {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text);
  }

  .close-btn {
    border: none;
    border-radius: 6px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-text);
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
  }

  .exercise-layout {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-xs);
    align-items: start;
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-width: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .row-buttons {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .mode-btn {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-muted);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    padding: 6px 10px;
    min-width: 44px;
    cursor: pointer;
  }

  .mode-btn--active {
    color: #fff;
    border-color: rgba(98, 181, 255, 0.65);
    background: rgba(34, 110, 186, 0.52);
  }

  .mode-btn--start {
    min-width: 120px;
    color: #fff;
    border-color: rgba(84, 214, 144, 0.65);
    background: rgba(32, 147, 93, 0.5);
  }

  .mode-btn--stop {
    min-width: 100px;
    color: #fff;
    border-color: rgba(221, 93, 93, 0.7);
    background: rgba(155, 43, 43, 0.58);
  }

  .key-shift-row {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .shift-btn {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
    font-size: 12px;
    font-weight: 700;
    width: 28px;
    height: 28px;
    cursor: pointer;
  }

  .shift-value {
    min-width: 95px;
    font-size: 11px;
    font-weight: 700;
    color: #dfe8ff;
    font-variant-numeric: tabular-nums;
  }

  .locked-key-value {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text);
    padding: 5px 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
    width: fit-content;
  }

  select {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
    font-size: 11px;
    font-weight: 700;
    padding: 6px 10px;
    max-width: 96px;
  }

  .volume-slider {
    width: 100%;
    accent-color: #5f95ff;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 1000px) {
    .exercise-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
