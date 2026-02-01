<script lang="ts">
  /**
   * Demo Exercise Controls Component
   *
   * UI for starting/stopping the pitch-matching demo exercise.
   * Supports speaking pitch integration and lesson templates.
   * Now includes "Choose Exercise" button to open the exercise chooser modal.
   */

  import { demoExerciseState } from '../../stores/demoExerciseState.svelte.js';
  import { highwayState } from '../../stores/highwayState.svelte.js';
  import { appState } from '../../stores/appState.svelte.js';
  import { resultsState, type ResultsSummary } from '../../stores/resultsState.svelte.js';
  import { preferencesStore } from '../../stores/preferencesStore.svelte.js';
  import { chooserState } from '../../stores/chooserState.svelte.js';
  import { referenceAudio } from '../../services/referenceAudio.js';
  import { getPitchByMidi } from '@mlt/pitch-data';
  import { onDestroy } from 'svelte';
  import type { SpeakingPitchUsage, AnyLessonTemplate } from '@mlt/lesson-templates';
  import { getTemplate } from '@mlt/lesson-templates';

  // Local state for exercise defaults
  let numLoops = $state(5);
  let tempo = $state(108);
  let referenceVolume = $state(-12);
  let speakingPitchUsage = $state<SpeakingPitchUsage>('none');

  // Active lesson state
  let activeLessonId = $state<string | null>(null);
  let activeLesson = $derived<AnyLessonTemplate | null>(
    activeLessonId ? (getTemplate(activeLessonId) ?? null) : null
  );
  const usesSpeakingPitch = $derived(
    activeLesson?.speakingPitchUsage && activeLesson.speakingPitchUsage !== 'none'
  );

  // Speaking pitch note label
  const speakingPitchNote = $derived(preferencesStore.speakingPitchNoteName);

  // Completion tracking
  let completionTriggered = $state(false);

  // Polling interval for results collection (bypasses Svelte reactivity issues with 60fps animation)
  let resultsPollingInterval: ReturnType<typeof setInterval> | null = null;

  // Reactive state from stores
  const isActive = $derived(demoExerciseState.state.isActive);
  const isPlaying = $derived(demoExerciseState.state.isPlaying);
  const currentPhase = $derived(demoExerciseState.state.currentPhase);
  const progress = $derived(demoExerciseState.getCurrentProgress());
  const results = $derived(demoExerciseState.getResults());
  const hasResults = $derived(results.length > 0);

  // Calculate stats from results
  const averageAccuracy = $derived(demoExerciseState.getAverageAccuracy());
  const hitCount = $derived(demoExerciseState.getHitCount());
  const totalCount = $derived(results.length);

  /**
   * Track phase based on highway currentTimeMs
   */
  $effect(() => {
    if (!isActive || !isPlaying) return;

    const currentTimeMs = highwayState.state.currentTimeMs;
    demoExerciseState.updatePhase(currentTimeMs);
  });

  /**
   * Watch for restart request (from "Try Again" button)
   */
  $effect(() => {
    if (demoExerciseState.state.restartRequested && !isActive) {
      demoExerciseState.consumeRestartRequest();
      handleStart();
    }
  });

  /**
   * Start polling for results (called when exercise starts)
   */
  function startResultsPolling() {
    console.log('[DemoExercise] Starting results polling');
    resultsPollingInterval = setInterval(() => {
      collectResults();
      checkCompletion();
    }, 200); // Poll every 200ms
  }

  /**
   * Stop polling for results (called when exercise stops)
   */
  function stopResultsPolling() {
    if (resultsPollingInterval) {
      clearInterval(resultsPollingInterval);
      resultsPollingInterval = null;
    }
  }

  /**
   * Collect results from highway performance data
   */
  function collectResults() {
    const performances = highwayState.getPerformanceResults();
    const notes = demoExerciseState.getGeneratedNotes();

    console.log('[DemoExercise] collectResults:', {
      performanceCount: performances.size,
      notesCount: notes.length,
      currentResults: demoExerciseState.state.results.length,
    });

    // Check each input note for completion
    notes.forEach((note, index) => {
      if (note.lyric !== '🎤') return; // Only process input notes

      const noteId = `target-${index}`;
      const perf = performances.get(noteId);

      if (perf && !demoExerciseState.hasResultForLoop(Math.floor(index / 2))) {
        // Calculate accuracy percentage from performance data
        const accuracy = calculateAccuracy(perf);

        console.log('[DemoExercise] Adding result for loop', Math.floor(index / 2), { noteId, accuracy });

        demoExerciseState.addResult({
          loopIndex: Math.floor(index / 2),
          targetPitch: note.midi,
          accuracy,
          performance: perf,
        });
      }
    });
  }

  /**
   * Check if exercise is complete and trigger results modal
   */
  function checkCompletion() {
    const completedLoops = demoExerciseState.state.results.length;
    const totalLoops = demoExerciseState.state.config.numLoops;

    console.log('[DemoExercise] checkCompletion:', { completedLoops, totalLoops, completionTriggered });

    if (completedLoops >= totalLoops && totalLoops > 0 && !completionTriggered) {
      console.log('[DemoExercise] Exercise complete! Showing results modal');
      completionTriggered = true;
      handleExerciseComplete();
    }
  }

  /**
   * Handle exercise completion - stop and show results modal
   */
  function handleExerciseComplete() {
    handleStop();

    // Reset highway to clear the pitch grid
    highwayState.reset();

    // Build summary from collected results
    const exerciseResults = demoExerciseState.getResults();
    const notesHit = exerciseResults.filter(r => r.performance?.hitStatus === 'hit').length;
    const totalNotes = exerciseResults.length;

    // Calculate average pitch deviation from hits
    let totalDeviation = 0;
    let deviationCount = 0;
    exerciseResults.forEach(r => {
      if (r.performance?.hitStatus === 'hit' && typeof r.performance.pitchAccuracyCents === 'number') {
        totalDeviation += Math.abs(r.performance.pitchAccuracyCents);
        deviationCount++;
      }
    });

    const summary: ResultsSummary = {
      totalNotes,
      notesHit,
      notesMissed: totalNotes - notesHit,
      accuracyPercent: totalNotes > 0 ? (notesHit / totalNotes) * 100 : 0,
      goldenNotesHit: 0,
      goldenNotesTotal: 0,
      phraseResults: exerciseResults.map((r, i) => ({
        phraseIndex: i,
        notesHit: r.performance?.hitStatus === 'hit' ? 1 : 0,
        totalNotes: 1,
        accuracyPercent: r.accuracy,
        lyricPreview: `Loop ${i + 1}: ${getPitchName(r.targetPitch)}`,
      })),
      averagePitchDeviationCents: deviationCount > 0 ? totalDeviation / deviationCount : 0,
    };

    // Show results modal
    resultsState.show(summary, {
      title: 'Pitch Matching Exercise',
      source: 'demo',
    });
  }

  /**
   * Calculate accuracy percentage from performance data
   */
  function calculateAccuracy(perf: any): number {
    // Simple accuracy: 100% if hit, based on pitch accuracy if available
    if (perf.hitStatus === 'hit') {
      // If we have pitch accuracy data, use it
      if (perf.pitchAccuracyCents !== undefined) {
        const maxCents = 50; // Tolerance from config
        const accuracy = Math.max(0, 100 - (Math.abs(perf.pitchAccuracyCents) / maxCents) * 100);
        return accuracy;
      }
      return 100;
    }
    return 0;
  }

  /**
   * Cleanup on component destroy
   */
  onDestroy(() => {
    stopResultsPolling();
    if (isActive) {
      handleStop();
    }
  });

  /**
   * Use current Y-axis range for pitch range
   */
  function useCurrentRange() {
    const range = appState.state.yAxisRange;
    demoExerciseState.setPitchRange(range.minMidi, range.maxMidi);
  }

  /**
   * Use full piano range
   */
  function useFullRange() {
    demoExerciseState.setPitchRange(21, 108); // A0 to C8
  }

  /**
   * Start the demo exercise
   */
  async function handleStart() {
    // Auto-switch to highway mode
    appState.setVisualizationMode('highway');

    // Update configuration including speaking pitch usage
    demoExerciseState.configure({
      numLoops,
      tempo,
      referenceVolume,
      speakingPitchUsage,
    });

    // Set pitch range to current Y-axis range
    useCurrentRange();

    // Initialize reference audio
    await referenceAudio.init();
    referenceAudio.setVolume(referenceVolume);

    // Start exercise (generates notes)
    demoExerciseState.start();

    const notes = demoExerciseState.getGeneratedNotes();

    // Set highway state with generated notes
    highwayState.setTargetNotes(notes);

    // Start highway playback
    highwayState.start();
    demoExerciseState.setPlaying(true);

    // Start polling for results
    startResultsPolling();

    // Schedule reference tones (only the reference notes, not input notes)
    const referenceTones = notes.filter(n => n.lyric === '👂');
    referenceAudio.scheduleReferenceTones(referenceTones);
  }

  /**
   * Stop the demo exercise
   */
  function handleStop() {
    // Stop polling
    stopResultsPolling();

    // Reset completion flag
    completionTriggered = false;

    // Stop audio
    referenceAudio.stop();

    // Stop highway
    highwayState.stop();

    // Mark exercise as stopped
    demoExerciseState.stop();

    // Clear active lesson
    clearActiveLesson();
  }

  /**
   * Get phase label for display
   */
  function getPhaseLabel(phase: string): string {
    switch (phase) {
      case 'reference':
        return '👂 Listen';
      case 'input':
        return '🎤 Sing';
      default:
        return 'Rest';
    }
  }

  /**
   * Get pitch name from MIDI number
   */
  function getPitchName(midi: number): string {
    const pitch = getPitchByMidi(midi);
    return pitch?.pitch || `MIDI ${midi}`;
  }

  /**
   * Open the exercise chooser modal
   */
  function handleOpenChooser() {
    chooserState.show();
  }

  /**
   * Handle starting an exercise from the chooser
   */
  export function handleLessonStart(
    exerciseId: string,
    settings: Record<string, number | boolean>
  ) {
    console.log('[DemoExercise] Starting lesson:', exerciseId, settings);

    // Store the active lesson ID
    activeLessonId = exerciseId;

    // Get the template
    const template = getTemplate(exerciseId);
    if (!template) {
      console.error('[DemoExercise] Template not found:', exerciseId);
      return;
    }

    // Apply settings from chooser
    numLoops = (settings.loopCount as number) ?? template.config?.numLoops ?? 5;
    tempo = (settings.tempoBpm as number) ?? template.config?.tempo ?? 108;
    referenceVolume = template.config?.referenceVolume ?? -12;
    speakingPitchUsage = template.speakingPitchUsage;

    // Start the exercise
    handleStart();
  }

  /**
   * Clear active lesson on stop
   */
  function clearActiveLesson() {
    activeLessonId = null;
  }
</script>

<div class="demo-exercise-panel">
  <h3 class="panel-title">Exercise Panel</h3>

  <!-- Choose Exercise Button -->
  {#if !isActive}
    <button class="choose-exercise-btn" onclick={handleOpenChooser}>
      Choose Exercise
    </button>
  {/if}

  <!-- Speaking Pitch Anchor Label (when lesson using speaking pitch is active) -->
  {#if isActive && usesSpeakingPitch && speakingPitchNote}
    <div class="speaking-pitch-anchor">
      <span class="anchor-icon">🎙️</span>
      <span class="anchor-text">Anchored to your Speaking Pitch ({speakingPitchNote})</span>
    </div>
  {/if}

  <!-- Active Lesson Info -->
  {#if isActive && activeLesson}
    <div class="active-lesson-info">
      <span class="lesson-name">{activeLesson.name}</span>
    </div>
  {/if}

  <!-- Main Controls (when active) -->
  <div class="exercise-controls">
    {#if isActive}
      <button class="stop-exercise-btn" onclick={handleStop}>
        Stop Exercise
      </button>

      <div class="progress-indicator">
        Loop {progress.current} / {progress.total}
      </div>

      <div class="phase-indicator">
        {getPhaseLabel(currentPhase)}
      </div>
    {/if}
  </div>

  <!-- Results Display (after completion) -->
  {#if hasResults && !isActive}
    <div class="exercise-results">
      <h4 class="results-title">Results</h4>
      <div class="results-summary">
        <div class="stat">
          <span class="stat-label">Average Accuracy:</span>
          <span class="stat-value">{averageAccuracy.toFixed(1)}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">Hits:</span>
          <span class="stat-value">{hitCount}/{totalCount}</span>
        </div>
      </div>

      <details class="results-details">
        <summary class="results-summary-label">Detailed Results</summary>
        <div class="results-list">
          {#each results as result, i}
            <div class="result-item" class:hit={result.performance?.hitStatus === 'hit'}>
              <span class="result-loop">Loop {i + 1}:</span>
              <span class="result-pitch">{getPitchName(result.targetPitch)}</span>
              <span class="result-accuracy">{result.accuracy.toFixed(0)}%</span>
              <span class="result-status">
                {result.performance?.hitStatus === 'hit' ? '✓' : '✗'}
              </span>
            </div>
          {/each}
        </div>
      </details>
    </div>
  {/if}
</div>

<style>
  .demo-exercise-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .panel-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  /* Choose Exercise Button */
  .choose-exercise-btn {
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .choose-exercise-btn:hover {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  /* Speaking Pitch Anchor Label */
  .speaking-pitch-anchor {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background-color: rgba(var(--color-primary-rgb, 74, 123, 200), 0.15);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-primary);
  }

  .anchor-icon {
    font-size: var(--font-size-md);
  }

  .anchor-text {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    font-weight: 500;
  }

  /* Active Lesson Info */
  .active-lesson-info {
    text-align: center;
    padding: var(--spacing-xs);
  }

  .lesson-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .not-calibrated {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* Main Controls */
  .exercise-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .start-exercise-btn {
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .start-exercise-btn:hover {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  .stop-exercise-btn {
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--color-error, #dc3545);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .stop-exercise-btn:hover {
    background-color: #c82333;
  }

  .progress-indicator {
    text-align: center;
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
  }

  .phase-indicator {
    text-align: center;
    font-size: var(--font-size-lg);
    font-weight: 500;
    padding: var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
    color: var(--color-text);
  }

  /* Results */
  .exercise-results {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
    padding: var(--spacing-md);
  }

  .results-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .results-summary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .stat {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
  }

  .stat-label {
    color: var(--color-text-muted);
  }

  .stat-value {
    color: var(--color-text);
    font-weight: 600;
  }

  .results-details {
    margin-top: var(--spacing-xs);
  }

  .results-summary-label {
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 500;
    padding: var(--spacing-xs);
    user-select: none;
  }

  .results-summary-label:hover {
    color: var(--color-primary);
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding-top: var(--spacing-sm);
  }

  .result-item {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: var(--spacing-xs);
    align-items: center;
    padding: var(--spacing-xs);
    background-color: var(--color-bg);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .result-item.hit {
    border-left: 3px solid var(--color-success, #28a745);
  }

  .result-item:not(.hit) {
    border-left: 3px solid var(--color-error, #dc3545);
  }

  .result-loop {
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .result-pitch {
    color: var(--color-text);
    font-weight: 600;
  }

  .result-accuracy {
    color: var(--color-text);
  }

  .result-status {
    font-size: var(--font-size-md);
    font-weight: bold;
  }

  .result-item.hit .result-status {
    color: var(--color-success, #28a745);
  }

  .result-item:not(.hit) .result-status {
    color: var(--color-error, #dc3545);
  }
</style>
