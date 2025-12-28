<script lang="ts">
  /**
   * App Component
   *
   * Main application layout for the Singing Trainer.
   */
  import { onMount } from 'svelte';
  import {
    SingingCanvas,
    StartButton,
    TonicSelector,
    DroneControls,
    ModeToggle,
    PitchReadout,
    RangeControl,
  } from './lib/components/index.js';
  import { handoffState } from './lib/stores/handoffState.svelte.js';
  import { appState } from './lib/stores/appState.svelte.js';

  // Check for handoff on mount
  onMount(async () => {
    const wasHandoff = await handoffState.checkAndConsumeHandoff();

    if (wasHandoff) {
      console.log('[App] Handoff detected and processed');

      // Update the pitch range based on imported data
      const suggestedRange = handoffState.suggestedPitchRange;
      if (suggestedRange) {
        appState.setYAxisRange(suggestedRange);
      }
    }
  });

  // Reactive state
  const hasImportedSnapshot = $derived(handoffState.state.hasImportedSnapshot);
  const transposition = $derived(handoffState.state.transpositionSemitones);
  const handoffError = $derived(handoffState.state.error);

  function handleBringBack() {
    handoffState.bringBackToStudentNotation();
  }

  function handleTransposeUp() {
    handoffState.transposeUp();
  }

  function handleTransposeDown() {
    handoffState.transposeDown();
  }
</script>

<div class="app">
  <header class="header">
    <h1 class="title">Singing Trainer</h1>
    <div class="header-controls">
      {#if hasImportedSnapshot}
        <div class="handoff-controls">
          <div class="transposition-control">
            <button class="transpose-btn" onclick={handleTransposeDown} title="Transpose down">-</button>
            <span class="transposition-label">
              {transposition >= 0 ? '+' : ''}{transposition}
            </span>
            <button class="transpose-btn" onclick={handleTransposeUp} title="Transpose up">+</button>
          </div>
          <button class="bring-back-btn" onclick={handleBringBack}>
            Bring Back to Student Notation
          </button>
        </div>
      {/if}
      <ModeToggle />
    </div>
  </header>

  {#if handoffError}
    <div class="error-banner">
      {handoffError}
    </div>
  {/if}

  <main class="main">
    <aside class="sidebar sidebar--left">
      <div class="control-group">
        <StartButton />
      </div>

      <div class="control-group">
        <PitchReadout />
      </div>

      <div class="control-group">
        <h3 class="control-group-title">Settings</h3>
        <TonicSelector />
        <DroneControls />
      </div>

      <div class="control-group">
        <RangeControl />
      </div>

      {#if hasImportedSnapshot}
        <div class="control-group">
          <h3 class="control-group-title">Imported Material</h3>
          <div class="import-info">
            <span class="import-label">Voices:</span>
            <span class="import-value">{handoffState.voices.length}</span>
          </div>
          <div class="import-info">
            <span class="import-label">Tempo:</span>
            <span class="import-value">{handoffState.tempo} BPM</span>
          </div>
          {#if handoffState.timeGrid}
            <div class="import-info">
              <span class="import-label">Microbeats:</span>
              <span class="import-value">{handoffState.timeGrid.microbeatCount}</span>
            </div>
          {/if}
        </div>
      {/if}
    </aside>

    <section class="canvas-area">
      <SingingCanvas />
    </section>
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    background-color: var(--color-bg-light);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .header-controls {
    display: flex;
    gap: var(--spacing-md);
  }

  .main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    background-color: var(--color-bg-light);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 260px;
    max-width: 300px;
    overflow-y: auto; /* Allow vertical scrolling */
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .control-group-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .canvas-area {
    flex: 1;
    display: flex;
    padding: var(--spacing-lg);
    overflow: hidden;
  }

  /* Handoff controls */
  .handoff-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .transposition-control {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .transpose-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-light);
    color: var(--color-text);
    font-size: var(--font-size-lg);
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease;
  }

  .transpose-btn:hover {
    background-color: var(--color-primary);
    color: white;
  }

  .transposition-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    min-width: 32px;
    text-align: center;
  }

  .bring-back-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--color-primary);
    color: white;
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .bring-back-btn:hover {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  /* Error banner */
  .error-banner {
    background-color: var(--color-error, #dc3545);
    color: white;
    padding: var(--spacing-sm) var(--spacing-lg);
    text-align: center;
    font-size: var(--font-size-sm);
  }

  /* Import info */
  .import-info {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
    padding: var(--spacing-xs) 0;
  }

  .import-label {
    color: var(--color-text-muted);
  }

  .import-value {
    color: var(--color-text);
    font-weight: 600;
  }
</style>
