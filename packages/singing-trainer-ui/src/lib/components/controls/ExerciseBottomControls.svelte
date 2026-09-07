<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { overdubExerciseState } from '@mlt/singing-trainer-core/stores/overdubExerciseState.svelte.js';
  import { highwayState } from '@mlt/singing-trainer-core/stores/highwayState.svelte.js';

  const isExerciseActive = $derived(
    overdubExerciseState.state.isActive
      && overdubExerciseState.state.template?.category === 'exercises'
  );
  const exerciseName = $derived(overdubExerciseState.state.template?.name ?? '');
  const isPlaying = $derived(overdubExerciseState.state.isPlaying);
  const waitForInputEnabled = $derived(overdubExerciseState.state.waitForInputEnabled);
  const canToggleLabelMode = $derived(
    isExerciseActive
      && appState.state.noteScaleDegrees.length === highwayState.state.targetNotes.length
      && highwayState.state.targetNotes.some((note) => typeof note.lyric === 'string' && note.lyric.length > 0)
  );

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

    </div>
  </div>
{/if}

<style>
  .exercise-controls-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 8px;
    background: var(--color-panel);
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
    background: var(--color-control);
    color: var(--color-text);
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
  }

  .exercise-layout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    align-items: start;
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
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-control);
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
    background: #2366a5;
  }

  .mode-btn--start {
    min-width: 120px;
    color: #fff;
    border-color: rgba(84, 214, 144, 0.65);
    background: #23734d;
  }

  .mode-btn--stop {
    min-width: 100px;
    color: #fff;
    border-color: rgba(221, 93, 93, 0.7);
    background: #a32e2e;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

</style>
