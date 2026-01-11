<script lang="ts">
  /**
   * App Component
   *
   * Main application layout for the Singing Trainer.
   */
  import { onMount, onDestroy } from 'svelte';
  import {
    SingingCanvas,
    TonicSelector,
    DroneControls,
    PitchHighlightToggle,
    PitchReadout,
    RangeControl,
    DemoExerciseControls,
    UltrastarControls,
  } from './lib/components/index.js';
  import { ResultsModal } from './lib/components/feedback/index.js';
  import { handoffState } from './lib/stores/handoffState.svelte.js';
  import { appState } from './lib/stores/appState.svelte.js';
  import { highwayState } from './lib/stores/highwayState.svelte.js';
  import { ultrastarState } from './lib/stores/ultrastarState.svelte.js';
  import { resultsState } from './lib/stores/resultsState.svelte.js';
  import { demoExerciseState } from './lib/stores/demoExerciseState.svelte.js';
  import { startDetection, stopDetection } from './lib/services/pitchDetection.js';

  // Settings panel state
  let showSettings = $state(false);

  // Reactive state for Ultrastar
  const isUltrastarActive = $derived(ultrastarState.state.isActive);

  // Register performance complete callbacks
  $effect(() => {
    // Register highway completion callback
    const unsubscribe = highwayState.onPerformanceComplete((results) => {
      // Check if this is an Ultrastar song
      if (ultrastarState.state.isActive && ultrastarState.state.isPlaying) {
        const summary = resultsState.calculateSummary(
          results,
          ultrastarState.state.targetNotes
        );
        resultsState.show(summary, {
          title: ultrastarState.title,
          artist: ultrastarState.artist,
          source: 'ultrastar',
        });
        ultrastarState.setPlaying(false);
      }
      // Demo exercise handles its own results display
    });

    return unsubscribe;
  });

  // Handle results modal retry
  function handleResultsRetry() {
    if (resultsState.state.source === 'ultrastar') {
      // Restart Ultrastar song
      highwayState.reset();
      highwayState.setTargetNotes(ultrastarState.state.targetNotes);
      appState.setVisualizationMode('highway');
    } else if (resultsState.state.source === 'demo') {
      // Restart demo exercise - handled by DemoExerciseControls
    }
  }

  // Check for handoff and auto-start pitch detection on mount
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

    // Auto-start pitch detection
    try {
      await startDetection();
      appState.setDetecting(true);
      console.log('[App] Pitch detection auto-started');
    } catch (err) {
      console.error('[App] Failed to auto-start pitch detection:', err);
    }
  });

  // Clean up on unmount
  onDestroy(() => {
    stopDetection();
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
        <PitchReadout />
      </div>

      <div class="control-group">
        <DemoExerciseControls />
      </div>

      <div class="control-group">
        <UltrastarControls />
      </div>

      <div class="control-group">
        <details class="settings-details" bind:open={showSettings}>
          <summary class="settings-summary">Settings</summary>
          <div class="settings-content">
            <TonicSelector />
            <DroneControls />
            <PitchHighlightToggle />
          </div>
        </details>
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

  <!-- Results Modal -->
  <ResultsModal onRetry={handleResultsRetry} />
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

  /* Settings dropdown */
  .settings-details {
    background-color: var(--color-surface, rgba(255, 255, 255, 0.05));
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs);
  }

  .settings-summary {
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--spacing-xs);
    user-select: none;
    list-style: none;
  }

  .settings-summary::-webkit-details-marker {
    display: none;
  }

  .settings-summary::before {
    content: '▶';
    display: inline-block;
    margin-right: var(--spacing-xs);
    font-size: 0.7em;
    transition: transform 0.2s ease;
  }

  .settings-details[open] .settings-summary::before {
    transform: rotate(90deg);
  }

  .settings-summary:hover {
    color: var(--color-primary);
  }

  .settings-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    padding-top: var(--spacing-md);
  }

  @media (max-width: 900px) {
    .header {
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .title {
      font-size: var(--font-size-lg);
    }

    .header-controls {
      width: 100%;
      flex-wrap: wrap;
      justify-content: flex-start;
    }

    .handoff-controls {
      flex-wrap: wrap;
    }

    .main {
      flex-direction: column;
    }

    .canvas-area {
      order: 1;
      padding: var(--spacing-md);
      min-height: 300px;
    }

    .sidebar {
      order: 2;
      width: 100%;
      max-width: none;
      min-width: 0;
      border-right: none;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: var(--spacing-md);
      max-height: 40vh;
    }
  }

  @media (max-width: 600px) {
    .canvas-area {
      padding: var(--spacing-sm);
    }

    .sidebar {
      max-height: 50vh;
    }
  }
</style>
