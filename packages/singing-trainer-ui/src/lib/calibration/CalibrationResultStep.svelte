<script lang="ts">
  /**
   * CalibrationResultStep Component
   *
   * Displays the calibration result and allows manual adjustment.
   */

  import { speakingPitchStore } from './speakingPitchStore.svelte.js';

  interface Props {
    onSave: () => void;
    onRetry: () => void;
  }

  let { onSave, onRetry }: Props = $props();

  // Derived state
  const noteName = $derived(speakingPitchStore.adjustedNoteName);
  const adjustment = $derived(speakingPitchStore.manualAdjustment);
  const confidence = $derived(speakingPitchStore.analysisResult?.confidenceScore ?? 0);

  function adjustDown() {
    speakingPitchStore.adjustSemitones(-1);
  }

  function adjustUp() {
    speakingPitchStore.adjustSemitones(1);
  }

  function handleSave() {
    const success = speakingPitchStore.save();
    if (success) {
      onSave();
    }
  }

  // Format confidence as percentage
  const confidencePercent = $derived(Math.round(confidence * 100));
</script>

<div class="result-step">
  <div class="result-header">
    <h3 class="result-title">Your Speaking Pitch</h3>
    <p class="result-description">
      This is your estimated comfortable speaking anchor. You can adjust it if needed.
    </p>
  </div>

  <div class="pitch-display">
    <button
      class="adjust-btn"
      onclick={adjustDown}
      aria-label="Lower pitch"
      title="Lower by 1 semitone"
    >
      -
    </button>

    <div class="pitch-value">
      <span class="note-name">{noteName}</span>
      {#if adjustment !== 0}
        <span class="adjustment-indicator">
          ({adjustment > 0 ? '+' : ''}{adjustment})
        </span>
      {/if}
    </div>

    <button
      class="adjust-btn"
      onclick={adjustUp}
      aria-label="Raise pitch"
      title="Raise by 1 semitone"
    >
      +
    </button>
  </div>

  <div class="confidence-section">
    <div class="confidence-bar">
      <div class="confidence-fill" style="width: {confidencePercent}%"></div>
    </div>
    <span class="confidence-label">Confidence: {confidencePercent}%</span>
  </div>

  <div class="button-row">
    <button class="btn btn-secondary" onclick={onRetry}>
      Try Again
    </button>
    <button class="btn btn-primary" onclick={handleSave}>
      Save
    </button>
  </div>
</div>

<style>
  .result-step {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg, 1.5rem);
    padding: var(--spacing-md, 1rem);
    text-align: center;
  }

  .result-header {
    margin-bottom: var(--spacing-sm, 0.5rem);
  }

  .result-title {
    font-size: var(--font-size-lg, 1.25rem);
    font-weight: 600;
    color: var(--color-text, #fff);
    margin: 0 0 var(--spacing-xs, 0.25rem);
  }

  .result-description {
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--color-text-muted, #888);
    margin: 0;
  }

  .pitch-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md, 1rem);
    padding: var(--spacing-lg, 1.5rem);
    background: var(--color-surface, rgba(255, 255, 255, 0.05));
    border-radius: var(--radius-lg, 12px);
  }

  .adjust-btn {
    width: 48px;
    height: 48px;
    border: 2px solid var(--color-primary, #638dd3);
    border-radius: 50%;
    background: transparent;
    color: var(--color-primary, #638dd3);
    font-size: var(--font-size-xl, 1.5rem);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .adjust-btn:hover {
    background: var(--color-primary, #638dd3);
    color: white;
  }

  .pitch-value {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 120px;
  }

  .note-name {
    font-size: 3rem;
    font-weight: 700;
    color: var(--color-primary, #638dd3);
    line-height: 1;
  }

  .adjustment-indicator {
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--color-text-muted, #888);
    margin-top: var(--spacing-xs, 0.25rem);
  }

  .confidence-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs, 0.25rem);
  }

  .confidence-bar {
    width: 200px;
    height: 6px;
    background: var(--color-surface, rgba(255, 255, 255, 0.1));
    border-radius: 3px;
    overflow: hidden;
  }

  .confidence-fill {
    height: 100%;
    background: var(--color-success, #28a745);
    transition: width 0.3s ease;
  }

  .confidence-label {
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--color-text-muted, #888);
  }

  .button-row {
    display: flex;
    justify-content: center;
    gap: var(--spacing-md, 1rem);
    margin-top: var(--spacing-md, 1rem);
  }

  .btn {
    padding: var(--spacing-sm, 0.5rem) var(--spacing-xl, 2rem);
    border: none;
    border-radius: var(--radius-md, 8px);
    font-size: var(--font-size-base, 1rem);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: var(--color-primary, #638dd3);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-dark, #4a7bc8);
  }

  .btn-secondary {
    background: var(--color-surface, rgba(255, 255, 255, 0.1));
    color: var(--color-text, #fff);
  }

  .btn-secondary:hover {
    background: var(--color-surface-hover, rgba(255, 255, 255, 0.15));
  }
</style>
