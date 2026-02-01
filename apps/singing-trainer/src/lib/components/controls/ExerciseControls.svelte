<script lang="ts">
  /**
   * Exercise Controls Component
   *
   * UI for starting/stopping the pitch-matching exercise.
   */

  import { exerciseState } from '../../stores/exerciseState.svelte.js';
  import { highwayState } from '../../stores/highwayState.svelte.js';
  import { appState } from '../../stores/appState.svelte.js';
  import { resultsState, type ResultsSummary } from '../../stores/resultsState.svelte.js';
  import { referenceAudio } from '../../services/referenceAudio.js';
  import { getPitchByMidi } from '@mlt/pitch-data';
  import { onDestroy } from 'svelte';

  // DEBUG: Verify this file is being loaded
  console.log('[ExerciseControls] MODULE LOADED - app-level component');

  // Local state for exercise defaults
  let numLoops = $state(5);
  let tempo = $state(108);
  let referenceVolume = $state(-12);

  // Completion tracking
  let completionTriggered = $state(false);

  // Polling interval for results collection (bypasses Svelte reactivity issues)
  let resultsPollingInterval: ReturnType<typeof setInterval> | null = null;

  // Reactive state from stores
  const isActive = $derived(exerciseState.state.isActive);
  const isPlaying = $derived(exerciseState.state.isPlaying);
  const currentPhase = $derived(exerciseState.state.currentPhase);
  const progress = $derived(exerciseState.getCurrentProgress());
  const results = $derived(exerciseState.getResults());
  const hasResults = $derived(results.length > 0);

  // Calculate stats from results
  const averageAccuracy = $derived(exerciseState.getAverageAccuracy());
  const hitCount = $derived(exerciseState.getHitCount());
  const totalCount = $derived(results.length);

  /**
   * Track phase based on highway currentTimeMs
   */
  $effect(() => {
    if (!isActive || !isPlaying) return;

    const currentTimeMs = highwayState.state.currentTimeMs;
    exerciseState.updatePhase(currentTimeMs);
  });

  /**
   * Start polling for results (called when exercise starts)
   */
  function startResultsPolling() {
    console.log('[Polling] Starting results polling');
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


  function isInputNote(note: any): boolean {
    return note?.role === 'input';
  }

  function isReferenceNote(note: any): boolean {
    return note?.role === 'reference';
  }

  /**
   * Collect results from highway performance data
   */
  function collectResults() {
    const performances = highwayState.getPerformanceResults();
    const notes = exerciseState.getGeneratedNotes();

    console.log('[Polling] collectResults:', {
      performanceCount: performances.size,
      notesCount: notes.length,
      currentResults: exerciseState.state.results.length,
    });

    const inputNotes = notes
      .map((note, index) => ({ note, index }))
      .filter(({ note }) => isInputNote(note));

    inputNotes.forEach(({ note, index }, inputIndex) => {
      const noteId = `target-${index}`;
      const perf = performances.get(noteId);

      console.log('[Polling] Checking:', { noteId, hasPerf: !!perf, lyric: note.lyric });

      if (perf && !exerciseState.hasResultForLoop(inputIndex)) {
        const accuracy = calculateAccuracy(perf);

        console.log('[Polling] Adding result for input', inputIndex);

        exerciseState.addResult({
          loopIndex: inputIndex,
          targetPitch: typeof note.midi === 'number' ? note.midi : null,
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
    const completedLoops = exerciseState.state.results.length;
    const totalLoops = exerciseState.getGeneratedNotes().filter(isInputNote).length;

    console.log('[Polling] checkCompletion:', { completedLoops, totalLoops, completionTriggered });

    if (completedLoops >= totalLoops && totalLoops > 0 && !completionTriggered) {
      console.log('[Polling] Triggering completion!');
      completionTriggered = true;
      handleExerciseComplete();
    }
  }

  /**
   * Handle exercise completion - stop and show results modal
   */
  function handleExerciseComplete() {
    handleStop();

    // Build summary from collected results
    const exerciseResults = exerciseState.getResults();
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
      title: 'Pitch Matching Lesson',
      source: 'exercise',
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
    exerciseState.setPitchRange(range.minMidi, range.maxMidi);
  }

  /**
   * Use full piano range
   */
  function useFullRange() {
    exerciseState.setPitchRange(21, 108); // A0 to C8
  }

  /**
   * Start the exercise
   */
  async function handleStart() {
    console.log('[ExerciseControls] handleStart called');
    // Auto-switch to highway mode
    appState.setVisualizationMode('highway');

    // Update configuration
    exerciseState.configure({
      numLoops,
      tempo,
      referenceVolume,
    });

    // Set pitch range to current Y-axis range
    useCurrentRange();

    // Initialize reference audio
    await referenceAudio.init();
    referenceAudio.setVolume(referenceVolume);

    // Start exercise (generates notes)
    exerciseState.start();

    const notes = exerciseState.getGeneratedNotes();

    // Set highway state with generated notes
    highwayState.setTargetNotes(notes);

    // Start highway playback
    highwayState.start();
    exerciseState.setPlaying(true);

    // Start polling for results
    startResultsPolling();

    // Schedule reference tones (only the reference notes, not input notes)
    const referenceTones = notes.filter(isReferenceNote);
    referenceAudio.scheduleReferenceTones(referenceTones);
  }

  /**
   * Stop the exercise
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
    exerciseState.stop();
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
  function getPitchName(midi: number | null | undefined): string {
    if (typeof midi !== 'number') {
      return 'Window';
    }
    const pitch = getPitchByMidi(midi);
    return pitch?.pitch || `MIDI ${midi}`;
  }
</script>

<div class="exercise-panel">
  <h3 class="panel-title">Exercises &amp; Lessons</h3>

  <!-- Main Controls -->
  <div class="exercise-controls">
    {#if !isActive}
      <button class="start-exercise-btn" onclick={handleStart}>
        Start Lesson
      </button>
    {:else}
      <button class="stop-exercise-btn" onclick={handleStop}>
        Stop Lesson
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
  .exercise-panel {
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
