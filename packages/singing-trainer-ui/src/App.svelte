<script lang="ts">
  /**
   * App Component
   *
   * Main application layout for the Singing Trainer.
   */
  import { onMount, onDestroy } from 'svelte';
  import {
    SingingCanvas,
    StartButton,
    MicInputSelector,
    PitchReadout,
    UserSettingsControls,
    DroneControls,
    ExerciseControls,
    OverdubBuilderToolbar,
    ExerciseBuilderToolbar,
    ConstructionZoneModal,
  } from './lib/components/index.js';
  import { ResultsModal } from './lib/components/feedback/index.js';
  import {
    ExerciseChooserModal,
    OverdubExerciseChooserModal,
    SimpleExerciseChooserModal,
  } from './lib/components/chooser/index.js';
  import { overdubExerciseState } from '@mlt/singing-trainer-core/stores/overdubExerciseState.svelte.js';
  import { CalibrationWizard } from './lib/calibration/index.js';
  import { handoffState } from '@mlt/singing-trainer-core/stores/handoffState.svelte.js';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { highwayState } from '@mlt/singing-trainer-core/stores/highwayState.svelte.js';
  import { ultrastarState } from '@mlt/singing-trainer-core/stores/ultrastarState.svelte.js';
  import { resultsState } from '@mlt/singing-trainer-core/stores/resultsState.svelte.js';
  import { exerciseState } from '@mlt/singing-trainer-core/stores/exerciseState.svelte.js';
  import { overdubState } from '@mlt/singing-trainer-core/stores/overdubState.svelte.js';
  import { startDetection, stopDetection } from '@mlt/singing-trainer-core/services/pitchDetection.js';
  import { ensureLessonTemplatesRegistered } from './lib/lessonTemplates.js';
  import homeIconUrl from './lib/assets/home-icon.svg?url';
  import settingsIconUrl from './lib/assets/settings-icon.svg?url';

  const hubHref = import.meta.env.BASE_URL;

  // Calibration wizard state
  let showCalibrationWizard = $state(false);
  type ColorTheme = 'light' | 'dark';
  const THEME_STORAGE_KEY = 'mlt-singing-trainer-theme';

  let showSettings = $state(false);
  let theme = $state<ColorTheme>('light');

  // Accordion state: only one sidebar section open at a time
  let openSection: number | null = $state(null);

  function handleToggle(index: number) {
    return (event: Event & { currentTarget: EventTarget & HTMLDetailsElement }) => {
      if (event.currentTarget.open) {
        openSection = index;
      } else if (openSection === index) {
        openSection = null;
      }
    };
  }

  // Exercise Controls component reference
  let exerciseControlsRef: {
    handleLessonStart: (lessonId: string, settings: Record<string, number | boolean>) => void;
    handleExerciseStart: (exerciseId: string, settings: Record<string, number | boolean>) => void;
  } | undefined;

  function openCalibrationWizard() {
    showCalibrationWizard = true;
  }

  function handleCalibrationComplete() {
    showCalibrationWizard = false;
  }

  function handleCalibrationCancel() {
    showCalibrationWizard = false;
  }

  // Reactive state for Ultrastar
  const showOverdubBuilderToolbar = $derived(
    overdubExerciseState.state.isActive
      && overdubExerciseState.state.template?.category === 'workshop'
  );
  const showExerciseBuilderToolbar = $derived(
    overdubExerciseState.state.isActive
      && overdubExerciseState.state.template?.category === 'exercises'
  );

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
      // Exercises handle their own results display
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
    } else if (resultsState.state.source === 'exercise') {
      // Reset highway and request restart - ExerciseControls will auto-start
      highwayState.reset();
      exerciseState.reset();
      exerciseState.requestRestart();
    }
  }

  // Handle results modal close
  function handleResultsClose() {
    // Clear highway and reset to clean state
    highwayState.reset();
    if (resultsState.state.source === 'exercise') {
      exerciseState.reset();
    }
  }

  function handleThemeChange(nextTheme: ColorTheme): void {
    theme = nextTheme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Storage may be unavailable; the selected theme still applies for this session.
    }
  }

  // Check for handoff on mount
  onMount(async () => {
    try {
      theme = localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      theme = 'light';
    }

    const wasHandoff = await handoffState.checkAndConsumeHandoff();

    if (wasHandoff) {
      // Update the pitch range based on imported data
      const suggestedRange = handoffState.suggestedPitchRange;
      if (suggestedRange) {
        appState.setYAxisRange(suggestedRange);
      }
    }

    const speakingPitchMidi = preferencesStore.speakingPitchMidi ?? 60;
    appState.setYAxisRange({ minMidi: speakingPitchMidi - 6, maxMidi: speakingPitchMidi + 20 });
    appState.setCenterGridOnSpeakingPitch(true);
    appState.setCenterColorsOnSpeakingPitch(true);

    // Auto-start microphone pitch detection by default on app startup.
    try {
      await startDetection();
      appState.setDetecting(true);
    } catch (error) {
      appState.setDetecting(false);
      console.warn('[App] Auto-start mic detection failed; user can start manually.', error);
    }
  });

  // Clean up on unmount
  onDestroy(() => {
    stopDetection();
    void overdubState.dispose();
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

  /**
   * Handle starting a lesson from the chooser modal
   */
  function handleLessonStart(lessonId: string, settings: Record<string, number | boolean>) {
    exerciseControlsRef?.handleLessonStart(lessonId, settings);
  }

  /**
   * Handle starting an exercise from the exercise chooser modal
   */
  function handleExerciseStart(exerciseId: string, settings: Record<string, number | boolean>) {
    exerciseControlsRef?.handleExerciseStart(exerciseId, settings);
  }

  /**
   * Handle starting a workshop template from the workshop chooser modal
   */
  function handleWorkshopStart(exerciseId: string, settings: Record<string, number | boolean>) {
    ensureLessonTemplatesRegistered();
    overdubExerciseState.loadExercise(exerciseId, settings);
  }
</script>

<div class="app singing-trainer-app" data-theme={theme}>
  {#if handoffError}
    <div class="error-banner">
      {handoffError}
    </div>
  {/if}

  <main class="main">
    <aside class="sidebar sidebar--left">
      <div class="sidebar-header">
        <div class="sidebar-title-row">
          <div class="sidebar-nav-actions">
            <a class="header-icon-control" href={hubHref} aria-label="Back to home" title="Back to home">
              <span class="header-icon" aria-hidden="true" style={`--header-icon-url: url("${homeIconUrl}")`}></span>
            </a>
            <button
              class="header-icon-control"
              type="button"
              aria-label="Open settings"
              aria-haspopup="dialog"
              aria-expanded={showSettings}
              aria-controls="settings-menu"
              title="Settings"
              onclick={() => (showSettings = true)}
            >
              <span
                class="header-icon"
                aria-hidden="true"
                style={`--header-icon-url: url("${settingsIconUrl}")`}
              ></span>
            </button>
          </div>
          <h1 class="sidebar-title">Singing Trainer</h1>
        </div>
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

      <section class="sidebar-settings-panels" aria-label="Singing Trainer controls">
        <section class="sidebar-settings-panel" aria-labelledby="mic-settings-title">
          <h2 id="mic-settings-title" class="sidebar-settings-title">Mic Settings</h2>
          <div class="sidebar-settings-stack">
            <StartButton compact={true} />
            <PitchReadout compact={true} showHint={false} />
            <MicInputSelector />
          </div>
        </section>

        <UserSettingsControls onCalibrate={openCalibrationWizard} />

        <section class="sidebar-settings-panel" aria-labelledby="drone-controls-title">
          <h2 id="drone-controls-title" class="sidebar-settings-title">Drone Controls</h2>
          <DroneControls />
        </section>
      </section>

      <details class="settings-details" open={openSection === 0} ontoggle={handleToggle(0)}>
        <summary class="settings-summary">Lessons &amp; Exercises</summary>
        <div class="settings-content">
          <ExerciseControls bind:this={exerciseControlsRef} />
        </div>
      </details>

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
      <div class="canvas-main">
        <SingingCanvas {theme} />
      </div>
      <ExerciseBuilderToolbar visible={showExerciseBuilderToolbar} />
      <OverdubBuilderToolbar visible={showOverdubBuilderToolbar} />
    </section>
  </main>

  <!-- Avatar mount point for lesson instructions -->
  <div id="lesson-avatar-mount" class="avatar-mount"></div>

  <!-- Lesson Chooser Modal -->
  <ExerciseChooserModal onstart={handleLessonStart} />

  <!-- Exercise Chooser Modal -->
  <SimpleExerciseChooserModal onstart={handleExerciseStart} />

  <!-- Workshop Chooser Modal -->
  <OverdubExerciseChooserModal onstart={handleWorkshopStart} />

  <!-- Results Modal -->
  <ResultsModal onRetry={handleResultsRetry} onClose={handleResultsClose} />

  <!-- Calibration Wizard Modal -->
  {#if showCalibrationWizard}
    <CalibrationWizard
      onComplete={handleCalibrationComplete}
      onCancel={handleCalibrationCancel}
    />
  {/if}

  <ConstructionZoneModal
    open={showSettings}
    {theme}
    onClose={() => (showSettings = false)}
    onThemeChange={handleThemeChange}
  />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    color: var(--color-text);
    background: var(--color-bg);
  }

  .main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-lg);
    background-color: var(--color-bg-light);
    border-right: 1px solid var(--color-border);
    min-width: 260px;
    max-width: 300px;
    overflow-y: auto; /* Allow vertical scrolling */
  }

  .sidebar-header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .sidebar-title-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    min-width: 0;
  }

  .sidebar-nav-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex: 0 0 auto;
  }

  .sidebar-title {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.1;
  }

  .header-icon-control {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    flex: 0 0 auto;
    padding: 0;
    border-radius: 999px;
    color: var(--color-text);
    background: var(--color-panel);
    border: 1px solid var(--color-border);
    cursor: pointer;
    appearance: none;
    text-decoration: none;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .header-icon-control:hover,
  .header-icon-control[aria-expanded='true'] {
    color: #fff;
    border-color: rgba(95, 149, 255, 0.65);
    background: rgba(95, 149, 255, 0.18);
  }

  .header-icon {
    width: var(--font-size-xl);
    height: var(--font-size-xl);
    display: block;
    background-color: currentColor;
    -webkit-mask-image: var(--header-icon-url);
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
    mask-image: var(--header-icon-url);
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
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
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: 12px;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
  }

  .sidebar-settings-panels {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    width: 100%;
  }

  .sidebar-settings-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    width: 100%;
    min-width: 0;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-panel);
    box-shadow: var(--shadow-sm);
  }

  .sidebar-settings-title {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-align: center;
  }

  .sidebar-settings-stack {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    width: 100%;
    min-width: 0;
  }

  .canvas-main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
  }

  /* Handoff controls */
  .handoff-controls {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
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
    width: 100%;
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
    background-color: var(--color-panel);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs);
    width: 100%;
  }

  .settings-summary {
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
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
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-sm) 0;
    width: 100%;
  }

  @media (max-width: 900px) {
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
      border-top: 1px solid var(--color-border);
      padding: var(--spacing-xs) var(--spacing-md) var(--spacing-md);
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

  /* Avatar mount point for lesson instructions */
  .avatar-mount {
    position: fixed;
    bottom: 20px;
    left: calc(33vw - 90px);
    width: 180px;
    height: 180px;
    z-index: 1000;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .avatar-mount {
      left: 20px;
      bottom: 20px;
      width: 120px;
      height: 120px;
    }
  }
</style>
