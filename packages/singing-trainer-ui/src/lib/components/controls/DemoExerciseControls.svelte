<script lang="ts">
  /**
   * Demo Exercise Controls Component
   *
   * UI for starting/stopping the pitch-matching demo exercise.
   */

  import { demoExerciseState } from '../../stores/demoExerciseState.svelte.js';
  import { highwayState } from '../../stores/highwayState.svelte.js';
  import { appState } from '../../stores/appState.svelte.js';
  import { referenceAudio } from '../../services/referenceAudio.js';
  import { getPitchByMidi } from '@mlt/pitch-data';
  import { onDestroy } from 'svelte';

  // Local state for settings panel
  let showSettings = $state(false);
  let numLoops = $state(5);
  let tempo = $state(108);
  let referenceVolume = $state(-12);

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
   * Collect results from highway performance data
   */
  $effect(() => {
    if (!isActive) return;

    const performances = highwayState.getPerformanceResults();
    const notes = demoExerciseState.getGeneratedNotes();

    // Check each input note for completion
    notes.forEach((note, index) => {
      if (note.lyric !== '🎤') return; // Only process input notes

      const noteId = `target-${index}`;
      const perf = performances.get(noteId);

      if (perf && !demoExerciseState.hasResultForLoop(Math.floor(index / 2))) {
        // Calculate accuracy percentage from performance data
        const accuracy = calculateAccuracy(perf);

        demoExerciseState.addResult({
          loopIndex: Math.floor(index / 2),
          targetPitch: note.midi,
          accuracy,
          performance: perf,
        });
      }
    });
  });

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

    // Update configuration
    demoExerciseState.configure({
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
    demoExerciseState.start();

    const notes = demoExerciseState.getGeneratedNotes();

    // Set highway state with generated notes
    highwayState.setTargetNotes(notes);

    // Start highway playback
    highwayState.start();
    demoExerciseState.setPlaying(true);

    // Schedule reference tones (only the reference notes, not input notes)
    const referenceTones = notes.filter(n => n.lyric === '👂');
    referenceAudio.scheduleReferenceTones(referenceTones);
  }

  /**
   * Stop the demo exercise
   */
  function handleStop() {
    // Stop audio
    referenceAudio.stop();

    // Stop highway
    highwayState.stop();

    // Mark exercise as stopped
    demoExerciseState.stop();
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
</script>

<div class="demo-exercise-panel">
  <h3 class="panel-title">Demo Exercise</h3>

  <!-- Settings (collapsed by default) -->
  <details class="settings-details" bind:open={showSettings}>
    <summary class="settings-summary">Settings</summary>
    <div class="exercise-settings">
      <label class="setting-label">
        <span class="label-text">Number of loops:</span>
        <input
          class="setting-input"
          type="number"
          min="1"
          max="20"
          bind:value={numLoops}
          disabled={isActive}
        />
      </label>

      <label class="setting-label">
        <span class="label-text">Tempo (BPM):</span>
        <input
          class="setting-input"
          type="number"
          min="60"
          max="180"
          bind:value={tempo}
          disabled={isActive}
        />
      </label>

      <label class="setting-label">
        <span class="label-text">Reference Volume:</span>
        <input
          class="setting-slider"
          type="range"
          min="-40"
          max="0"
          bind:value={referenceVolume}
          disabled={isActive}
        />
        <span class="volume-value">{referenceVolume} dB</span>
      </label>

      <div class="pitch-range-buttons">
        <button class="range-btn" onclick={useCurrentRange} disabled={isActive}>
          Use Current Range
        </button>
        <button class="range-btn" onclick={useFullRange} disabled={isActive}>
          Use Full Range
        </button>
      </div>
    </div>
  </details>

  <!-- Main Controls -->
  <div class="exercise-controls">
    {#if !isActive}
      <button class="start-exercise-btn" onclick={handleStart}>
        Start Demo Exercise
      </button>
    {:else}
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

  /* Settings */
  .settings-details {
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs);
  }

  .settings-summary {
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 500;
    padding: var(--spacing-xs);
    user-select: none;
  }

  .settings-summary:hover {
    color: var(--color-primary);
  }

  .exercise-settings {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    padding-top: 0;
  }

  .setting-label {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
  }

  .label-text {
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .setting-input {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    width: 100%;
  }

  .setting-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .setting-slider {
    width: 100%;
    accent-color: var(--color-primary);
  }

  .volume-value {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .pitch-range-buttons {
    display: flex;
    gap: var(--spacing-xs);
  }

  .range-btn {
    flex: 1;
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    background-color: var(--color-bg);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .range-btn:hover:not(:disabled) {
    background-color: var(--color-primary);
    color: white;
  }

  .range-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
