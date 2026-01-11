<script lang="ts">
  /**
   * Results Modal Component
   *
   * Displays performance results after song/exercise completion.
   * Shows accuracy, notes hit, letter grade, and optional phrase breakdown.
   */

  import { resultsState, type ResultsSummary } from '../../stores/resultsState.svelte.js';

  interface Props {
    onRetry?: () => void;
    onClose?: () => void;
  }

  let { onRetry, onClose }: Props = $props();

  // Reactive state
  const isVisible = $derived(resultsState.state.isVisible);
  const summary = $derived(resultsState.state.summary);
  const songTitle = $derived(resultsState.state.songTitle);
  const artistName = $derived(resultsState.state.artistName);

  // Derived values
  const letterGrade = $derived(
    summary ? resultsState.getLetterGrade(summary.accuracyPercent) : 'F'
  );
  const accuracyColor = $derived(
    summary ? resultsState.getAccuracyColor(summary.accuracyPercent) : ''
  );

  /**
   * Handle close button
   */
  function handleClose() {
    resultsState.hide();
    onClose?.();
  }

  /**
   * Handle retry button
   */
  function handleRetry() {
    resultsState.hide();
    onRetry?.();
  }

  /**
   * Handle backdrop click
   */
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  /**
   * Handle escape key
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isVisible) {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isVisible && summary}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="results-title"
    tabindex="-1"
  >
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2 id="results-title" class="modal-title">Results</h2>
        {#if songTitle}
          <div class="song-info">
            <span class="song-title">{songTitle}</span>
            {#if artistName}
              <span class="song-artist">by {artistName}</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Main Stats -->
      <div class="stats-section">
        <!-- Letter Grade -->
        <div class="grade-display" style:--grade-color={accuracyColor}>
          <span class="grade-letter">{letterGrade}</span>
        </div>

        <!-- Accuracy -->
        <div class="accuracy-display" style:color={accuracyColor}>
          <span class="accuracy-value">{summary.accuracyPercent.toFixed(1)}%</span>
          <span class="accuracy-label">Accuracy</span>
        </div>

        <!-- Notes Hit -->
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-value hit">{summary.notesHit}</span>
            <span class="stat-label">Hit</span>
          </div>
          <div class="stat-divider">/</div>
          <div class="stat-item">
            <span class="stat-value total">{summary.totalNotes}</span>
            <span class="stat-label">Total</span>
          </div>
          {#if summary.notesMissed > 0}
            <div class="stat-item missed">
              <span class="stat-value">{summary.notesMissed}</span>
              <span class="stat-label">Missed</span>
            </div>
          {/if}
        </div>

        <!-- Golden Notes (if any) -->
        {#if summary.goldenNotesTotal > 0}
          <div class="golden-stats">
            <span class="golden-icon">⭐</span>
            <span class="golden-text">
              Golden Notes: {summary.goldenNotesHit}/{summary.goldenNotesTotal}
            </span>
          </div>
        {/if}

        <!-- Average Pitch Deviation -->
        {#if summary.averagePitchDeviationCents > 0}
          <div class="pitch-stats">
            <span class="pitch-label">Avg. Pitch Deviation:</span>
            <span class="pitch-value">
              {summary.averagePitchDeviationCents.toFixed(1)} cents
            </span>
          </div>
        {/if}
      </div>

      <!-- Phrase Breakdown (collapsible) -->
      {#if summary.phraseResults.length > 1}
        <details class="phrase-details">
          <summary class="phrase-summary">Phrase Breakdown</summary>
          <div class="phrase-list">
            {#each summary.phraseResults as phrase}
              <div
                class="phrase-item"
                class:perfect={phrase.accuracyPercent === 100}
                class:good={phrase.accuracyPercent >= 70 && phrase.accuracyPercent < 100}
                class:poor={phrase.accuracyPercent < 70}
              >
                <span class="phrase-lyric">{phrase.lyricPreview}</span>
                <span class="phrase-accuracy">
                  {phrase.notesHit}/{phrase.totalNotes}
                  ({phrase.accuracyPercent.toFixed(0)}%)
                </span>
              </div>
            {/each}
          </div>
        </details>
      {/if}

      <!-- Actions -->
      <div class="modal-actions">
        {#if onRetry}
          <button class="action-btn retry-btn" onclick={handleRetry}>
            Try Again
          </button>
        {/if}
        <button class="action-btn close-btn" onclick={handleClose}>
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.75);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    background-color: var(--color-surface);
    border-radius: var(--radius-lg, 12px);
    padding: var(--spacing-lg);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    text-align: center;
    margin-bottom: var(--spacing-lg);
  }

  .modal-title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--spacing-sm);
  }

  .song-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .song-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
  }

  .song-artist {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .stats-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .grade-display {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 4px solid var(--grade-color);
    border-radius: 50%;
  }

  .grade-letter {
    font-size: 48px;
    font-weight: 800;
    color: var(--grade-color);
  }

  .accuracy-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .accuracy-value {
    font-size: var(--font-size-2xl, 32px);
    font-weight: 700;
  }

  .accuracy-label {
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.7;
  }

  .stats-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-value {
    font-size: var(--font-size-lg);
    font-weight: 600;
  }

  .stat-value.hit {
    color: var(--color-success, #28a745);
  }

  .stat-value.total {
    color: var(--color-text);
  }

  .stat-item.missed .stat-value {
    color: var(--color-error, #dc3545);
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .stat-divider {
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
  }

  .golden-stats {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: rgba(255, 193, 7, 0.1);
    border-radius: var(--radius-sm);
  }

  .golden-icon {
    font-size: var(--font-size-md);
  }

  .golden-text {
    font-size: var(--font-size-sm);
    color: #ffc107;
    font-weight: 500;
  }

  .pitch-stats {
    display: flex;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .pitch-value {
    font-weight: 500;
    color: var(--color-text);
  }

  .phrase-details {
    width: 100%;
    margin-top: var(--spacing-md);
    background-color: var(--color-bg);
    border-radius: var(--radius-sm);
  }

  .phrase-summary {
    padding: var(--spacing-sm);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    user-select: none;
  }

  .phrase-summary:hover {
    color: var(--color-primary);
  }

  .phrase-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 var(--spacing-sm) var(--spacing-sm);
  }

  .phrase-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    border-left: 3px solid transparent;
  }

  .phrase-item.perfect {
    border-left-color: var(--color-success, #28a745);
  }

  .phrase-item.good {
    border-left-color: var(--color-warning, #ffc107);
  }

  .phrase-item.poor {
    border-left-color: var(--color-error, #dc3545);
  }

  .phrase-lyric {
    color: var(--color-text);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .phrase-accuracy {
    color: var(--color-text-muted);
    flex-shrink: 0;
    margin-left: var(--spacing-sm);
  }

  .modal-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-lg);
  }

  .action-btn {
    flex: 1;
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-btn {
    background-color: var(--color-primary);
    color: white;
  }

  .retry-btn:hover {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  .close-btn {
    background-color: var(--color-bg);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .close-btn:hover {
    background-color: var(--color-surface);
  }
</style>
