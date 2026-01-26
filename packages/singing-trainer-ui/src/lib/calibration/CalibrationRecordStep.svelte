<script lang="ts">
  /**
   * CalibrationRecordStep Component
   *
   * Handles recording a single phrase for speaking pitch calibration.
   */

  import PhrasePrompt from './PhrasePrompt.svelte';
  import { speakingPitchStore } from './speakingPitchStore.svelte.js';
  import { collectPitchSamples, type CalibrationPitchSample } from '../services/pitchDetection.js';
  import { DEFAULT_CALIBRATION_CONFIG } from './types.js';

  interface Props {
    phraseIndex: number;
    phrase: string;
    onComplete: () => void;
    onBack?: () => void;
  }

  let { phraseIndex, phrase, onComplete, onBack }: Props = $props();

  // Local state
  let isRecording = $state(false);
  let recordingProgress = $state(0);
  let hasRecording = $state(false);
  let sampleCount = $state(0);
  let error = $state<string | null>(null);
  let currentPitchDisplay = $state<string | null>(null);

  const recordingDuration = DEFAULT_CALIBRATION_CONFIG.recordingDurationMs;

  // Check if we already have a recording
  $effect(() => {
    const recording = speakingPitchStore.state.phraseRecordings[phraseIndex];
    hasRecording = recording?.status === 'complete' && recording.pitchSamples.length > 0;
    sampleCount = recording?.pitchSamples.length ?? 0;
  });

  async function startRecording() {
    error = null;
    isRecording = true;
    recordingProgress = 0;
    currentPitchDisplay = null;
    speakingPitchStore.startRecording();

    try {
      const samples = await collectPitchSamples(
        recordingDuration,
        (elapsedMs, currentSample) => {
          recordingProgress = (elapsedMs / recordingDuration) * 100;
          if (currentSample) {
            // Show current pitch as feedback
            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const midi = Math.round(currentSample.midi);
            const octave = Math.floor(midi / 12) - 1;
            const note = noteNames[midi % 12];
            currentPitchDisplay = `${note}${octave}`;
          } else {
            currentPitchDisplay = null;
          }
        }
      );

      speakingPitchStore.completeRecording(samples as any);
      hasRecording = true;
      sampleCount = samples.length;
    } catch (err) {
      console.error('[CalibrationRecordStep] Recording failed:', err);
      error = 'Could not access microphone. Please check permissions.';
    } finally {
      isRecording = false;
      recordingProgress = 100;
      currentPitchDisplay = null;
    }
  }

  function handleReRecord() {
    speakingPitchStore.reRecord();
    hasRecording = false;
    sampleCount = 0;
    recordingProgress = 0;
  }

  function handleNext() {
    if (hasRecording) {
      onComplete();
    }
  }
</script>

<div class="record-step">
  <div class="step-header">
    <span class="step-indicator">Phrase {phraseIndex + 1} of 3</span>
  </div>

  <div class="phrase-section">
    <PhrasePrompt {phrase} isActive={isRecording} />
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="recording-section">
    {#if isRecording}
      <div class="recording-status">
        <div class="recording-indicator">
          <span class="recording-dot"></span>
          <span>Recording...</span>
        </div>
        {#if currentPitchDisplay}
          <div class="current-pitch">{currentPitchDisplay}</div>
        {/if}
        <div class="progress-bar">
          <div class="progress-fill" style="width: {recordingProgress}%"></div>
        </div>
      </div>
    {:else if hasRecording}
      <div class="recording-complete">
        <span class="check-icon">&#x2713;</span>
        <span>Recording complete ({sampleCount} samples)</span>
      </div>
    {/if}
  </div>

  <div class="button-row">
    {#if onBack}
      <button class="btn btn-secondary" onclick={onBack} disabled={isRecording}>
        Back
      </button>
    {/if}

    {#if !isRecording && !hasRecording}
      <button class="btn btn-primary" onclick={startRecording}>
        Start Recording
      </button>
    {:else if !isRecording && hasRecording}
      <button class="btn btn-secondary" onclick={handleReRecord}>
        Re-record
      </button>
      <button class="btn btn-primary" onclick={handleNext}>
        Next
      </button>
    {/if}
  </div>
</div>

<style>
  .record-step {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg, 1.5rem);
    padding: var(--spacing-md, 1rem);
  }

  .step-header {
    text-align: center;
  }

  .step-indicator {
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--color-text-muted, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .phrase-section {
    margin: var(--spacing-md, 1rem) 0;
  }

  .error-message {
    background: var(--color-error-alpha, rgba(220, 53, 69, 0.2));
    color: var(--color-error, #dc3545);
    padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
    border-radius: var(--radius-sm, 4px);
    text-align: center;
  }

  .recording-section {
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .recording-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm, 0.5rem);
    width: 100%;
  }

  .recording-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm, 0.5rem);
    color: var(--color-error, #dc3545);
    font-weight: 600;
  }

  .recording-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-error, #dc3545);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }

  .current-pitch {
    font-size: var(--font-size-lg, 1.25rem);
    font-weight: 600;
    color: var(--color-primary, #638dd3);
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: var(--color-surface, rgba(255, 255, 255, 0.1));
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-primary, #638dd3);
    transition: width 0.1s linear;
  }

  .recording-complete {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm, 0.5rem);
    color: var(--color-success, #28a745);
    font-weight: 500;
  }

  .check-icon {
    font-size: var(--font-size-lg, 1.25rem);
  }

  .button-row {
    display: flex;
    justify-content: center;
    gap: var(--spacing-md, 1rem);
    flex-wrap: wrap;
  }

  .btn {
    padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1.5rem);
    border: none;
    border-radius: var(--radius-md, 8px);
    font-size: var(--font-size-base, 1rem);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-primary, #638dd3);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-dark, #4a7bc8);
  }

  .btn-secondary {
    background: var(--color-surface, rgba(255, 255, 255, 0.1));
    color: var(--color-text, #fff);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-surface-hover, rgba(255, 255, 255, 0.15));
  }
</style>
