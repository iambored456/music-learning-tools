<script lang="ts">
  /**
   * CalibrationWizard Component
   *
   * Main container for the speaking pitch calibration flow.
   * Manages the multi-step wizard UI.
   */

  import { speakingPitchStore } from './speakingPitchStore.svelte.js';
  import { CALIBRATION_PHRASES } from './types.js';
  import CalibrationRecordStep from './CalibrationRecordStep.svelte';
  import CalibrationResultStep from './CalibrationResultStep.svelte';

  interface Props {
    onComplete: () => void;
    onCancel: () => void;
  }

  let { onComplete, onCancel }: Props = $props();

  // Derived state
  const currentStep = $derived(speakingPitchStore.currentStep);
  const isComplete = $derived(speakingPitchStore.state.isComplete);

  // Initialize wizard on mount
  $effect(() => {
    speakingPitchStore.start();
  });

  function handleStartCalibration() {
    speakingPitchStore.nextStep();
  }

  function handleRecordingComplete() {
    speakingPitchStore.nextStep();
  }

  function handleBack() {
    speakingPitchStore.previousStep();
  }

  function handleSave() {
    onComplete();
  }

  function handleRetry() {
    speakingPitchStore.reset();
  }

  function handleClose() {
    onCancel();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="wizard-overlay" onclick={handleClose} onkeydown={handleKeydown} role="presentation">
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_interactive_supports_focus a11y_click_events_have_key_events -->
  <div class="wizard-modal" role="dialog" aria-modal="true" aria-labelledby="wizard-title" tabindex="-1" onclick={(e) => e.stopPropagation()}>
    <button class="close-btn" onclick={handleClose} aria-label="Close">
      &times;
    </button>

    <div class="wizard-content">
      {#if currentStep === 'intro'}
        <div class="intro-step">
          <h2 class="wizard-title">Calibrate Speaking Pitch</h2>

          <div class="intro-description">
            <p>
              <strong>Speaking Pitch</strong> is your relaxed anchor note. We'll estimate it
              from your speaking voice. You can adjust it afterward.
            </p>
            <p class="instruction">
              Read each phrase slowly and naturally.
            </p>
          </div>

          <div class="phrases-preview">
            <h4>You'll read these phrases:</h4>
            <ol class="phrase-list">
              {#each CALIBRATION_PHRASES as phrase}
                <li>"{phrase}"</li>
              {/each}
            </ol>
          </div>

          <div class="button-row">
            <button class="btn btn-secondary" onclick={handleClose}>
              Cancel
            </button>
            <button class="btn btn-primary" onclick={handleStartCalibration}>
              Start Calibration
            </button>
          </div>
        </div>

      {:else if currentStep === 'recording-1'}
        <CalibrationRecordStep
          phraseIndex={0}
          phrase={CALIBRATION_PHRASES[0]}
          onComplete={handleRecordingComplete}
          onBack={handleBack}
        />

      {:else if currentStep === 'recording-2'}
        <CalibrationRecordStep
          phraseIndex={1}
          phrase={CALIBRATION_PHRASES[1]}
          onComplete={handleRecordingComplete}
          onBack={handleBack}
        />

      {:else if currentStep === 'recording-3'}
        <CalibrationRecordStep
          phraseIndex={2}
          phrase={CALIBRATION_PHRASES[2]}
          onComplete={handleRecordingComplete}
          onBack={handleBack}
        />

      {:else if currentStep === 'analyzing'}
        <div class="analyzing-step">
          <div class="spinner"></div>
          <p>Analyzing your recordings...</p>
        </div>

      {:else if currentStep === 'result'}
        <CalibrationResultStep
          onSave={handleSave}
          onRetry={handleRetry}
        />

      {:else if currentStep === 'error'}
        <div class="error-step">
          <div class="error-icon">!</div>
          <h3>Couldn't Detect Your Pitch</h3>
          <p class="error-message">
            We couldn't get a clear reading. Please try again, speaking clearly
            and at your normal volume.
          </p>
          <div class="button-row">
            <button class="btn btn-secondary" onclick={handleClose}>
              Cancel
            </button>
            <button class="btn btn-primary" onclick={handleRetry}>
              Retry
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .wizard-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-md, 1rem);
  }

  .wizard-modal {
    position: relative;
    background: var(--color-bg, #1a1a2e);
    border-radius: var(--radius-lg, 12px);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .close-btn {
    position: absolute;
    top: var(--spacing-sm, 0.5rem);
    right: var(--spacing-sm, 0.5rem);
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--color-text-muted, #888);
    font-size: 1.5rem;
    cursor: pointer;
    border-radius: var(--radius-sm, 4px);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--color-surface, rgba(255, 255, 255, 0.1));
    color: var(--color-text, #fff);
  }

  .wizard-content {
    padding: var(--spacing-xl, 2rem);
  }

  /* Intro Step */
  .intro-step {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg, 1.5rem);
  }

  .wizard-title {
    font-size: var(--font-size-xl, 1.5rem);
    font-weight: 600;
    color: var(--color-text, #fff);
    margin: 0;
    text-align: center;
  }

  .intro-description {
    color: var(--color-text, #fff);
    line-height: 1.6;
  }

  .intro-description p {
    margin: 0 0 var(--spacing-sm, 0.5rem);
  }

  .instruction {
    color: var(--color-text-muted, #888);
    font-style: italic;
  }

  .phrases-preview {
    background: var(--color-surface, rgba(255, 255, 255, 0.05));
    padding: var(--spacing-md, 1rem);
    border-radius: var(--radius-md, 8px);
  }

  .phrases-preview h4 {
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--color-text-muted, #888);
    margin: 0 0 var(--spacing-sm, 0.5rem);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .phrase-list {
    margin: 0;
    padding-left: var(--spacing-lg, 1.5rem);
    color: var(--color-text, #fff);
  }

  .phrase-list li {
    margin-bottom: var(--spacing-xs, 0.25rem);
    font-style: italic;
  }

  /* Analyzing Step */
  .analyzing-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md, 1rem);
    padding: var(--spacing-xl, 2rem);
    color: var(--color-text-muted, #888);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-surface, rgba(255, 255, 255, 0.1));
    border-top-color: var(--color-primary, #638dd3);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Error Step */
  .error-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md, 1rem);
    text-align: center;
  }

  .error-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--color-error-alpha, rgba(220, 53, 69, 0.2));
    color: var(--color-error, #dc3545);
    font-size: 2rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .error-step h3 {
    font-size: var(--font-size-lg, 1.25rem);
    color: var(--color-text, #fff);
    margin: 0;
  }

  .error-step .error-message {
    color: var(--color-text-muted, #888);
    margin: 0;
    max-width: 300px;
  }

  /* Buttons */
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
