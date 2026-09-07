<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { getPitchByMidi } from '@mlt/pitch-data';
  import { speakingPitchStore } from '@mlt/singing-trainer-core/calibration/speakingPitchStore.svelte.js';
  import {
    CALIBRATION_PHRASES,
    DEFAULT_CALIBRATION_CONFIG,
  } from '@mlt/singing-trainer-core/calibration/types.js';
  import {
    collectPitchSamples,
  } from '@mlt/singing-trainer-core/services/pitchDetection.js';
  import InputDecibelMeter from '../components/controls/InputDecibelMeter.svelte';

  interface Props {
    onComplete: () => void;
    onCancel: () => void;
  }

  let { onComplete, onCancel }: Props = $props();

  const MIN_RECORDING_MS = 2000;
  const AUTO_STOP_SILENCE_MS = 2000;
  const UI_REFRESH_MS = 100;
  const sampleLines = CALIBRATION_PHRASES[0].split('\n');

  let isRecording = $state(false);
  let elapsedMs = $state(0);
  let sampleCount = $state(0);
  let calibrationInputLevelDb = $state<number | null>(null);
  let hasDetectedSpeech = $state(false);
  let silenceElapsedMs = $state(0);
  let recordingError = $state<string | null>(null);
  let recorder: AbortController | null = null;
  let discardRecording = false;

  const analysisResult = $derived(speakingPitchStore.analysisResult);
  const adjustedMidi = $derived(speakingPitchStore.adjustedMidi);
  const previewPitch = $derived((() => {
    if (adjustedMidi === null) return null;
    return getPitchByMidi(Math.round(adjustedMidi))?.pitch
      ?? speakingPitchStore.adjustedNoteName;
  })());
  const confidencePercent = $derived(
    Math.round((analysisResult?.confidenceScore ?? 0) * 100)
  );

  onMount(() => {
    speakingPitchStore.start();
  });

  onDestroy(() => {
    discardRecording = true;
    recorder?.abort();
  });

  async function startRecording(): Promise<void> {
    if (isRecording) return;

    speakingPitchStore.reset();
    speakingPitchStore.nextStep();
    speakingPitchStore.startRecording();
    recordingError = null;
    elapsedMs = 0;
    sampleCount = 0;
    calibrationInputLevelDb = null;
    hasDetectedSpeech = false;
    silenceElapsedMs = 0;
    discardRecording = false;
    isRecording = true;
    recorder = new AbortController();

    let collectedCount = 0;
    let lastUiUpdateAt = -UI_REFRESH_MS;
    let heardVoice = false;
    let lastVoicedAt = 0;

    try {
      const samples = await collectPitchSamples(
        DEFAULT_CALIBRATION_CONFIG.recordingDurationMs,
        (nextElapsedMs, currentSample, inputLevelDb) => {
          if (currentSample) {
            collectedCount += 1;
            heardVoice = true;
            lastVoicedAt = nextElapsedMs;
          }

          const nextSilenceElapsedMs = heardVoice
            ? Math.max(0, nextElapsedMs - lastVoicedAt)
            : 0;

          if (
            heardVoice
            && nextElapsedMs >= MIN_RECORDING_MS
            && nextSilenceElapsedMs >= AUTO_STOP_SILENCE_MS
          ) {
            elapsedMs = nextElapsedMs;
            sampleCount = collectedCount;
            calibrationInputLevelDb = inputLevelDb;
            hasDetectedSpeech = true;
            silenceElapsedMs = AUTO_STOP_SILENCE_MS;
            recorder?.abort();
            return;
          }

          if (nextElapsedMs - lastUiUpdateAt < UI_REFRESH_MS) return;
          lastUiUpdateAt = nextElapsedMs;
          elapsedMs = nextElapsedMs;
          sampleCount = collectedCount;
          calibrationInputLevelDb = inputLevelDb;
          hasDetectedSpeech = heardVoice;
          silenceElapsedMs = nextSilenceElapsedMs;
        },
        recorder.signal,
      );

      if (discardRecording) return;

      elapsedMs = Math.min(elapsedMs, DEFAULT_CALIBRATION_CONFIG.recordingDurationMs);
      sampleCount = samples.length;
      speakingPitchStore.completeRecording(samples);
      speakingPitchStore.nextStep();
    } catch (error) {
      if (discardRecording) return;
      console.error('[CalibrationWizard] Recording failed', error);
      recordingError = 'The microphone could not be recorded. Check its permission and try again.';
      speakingPitchStore.reset();
    } finally {
      isRecording = false;
      calibrationInputLevelDb = null;
      recorder = null;
    }
  }

  function stopRecording(): void {
    recorder?.abort();
  }

  function retryRecording(): void {
    recorder?.abort();
    speakingPitchStore.reset();
    elapsedMs = 0;
    sampleCount = 0;
    calibrationInputLevelDb = null;
    hasDetectedSpeech = false;
    silenceElapsedMs = 0;
    recordingError = null;
  }

  function saveCalibration(): void {
    if (speakingPitchStore.save()) onComplete();
  }

  function handleClose(): void {
    discardRecording = true;
    recorder?.abort();
    onCancel();
  }

  function handleOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) handleClose();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') handleClose();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="calibration-overlay" onclick={handleOverlayClick} onkeydown={handleKeydown} role="presentation">
  <div class="calibration-panel" role="dialog" aria-modal="true" aria-labelledby="calibration-title" tabindex="-1">
    <button class="close-button" type="button" onclick={handleClose} aria-label="Close calibration">
      &times;
    </button>

    <header class="panel-header">
      <h2 id="calibration-title">Calibrate Speaking Pitch</h2>
    </header>

    {#if !analysisResult}
      <div class="recording-track" aria-label="Recording controls and progress">
        <div class="record-controls">
          <div class="guidance-popup" role="status">
            Start recording, then, very slowly, read the passage below.
          </div>
          {#if !isRecording}
            <div class="guided-control">
              <button class="record-button record-button--start" type="button" onclick={() => void startRecording()}>
                <span class="record-icon" aria-hidden="true"></span>
                Record
              </button>
            </div>
          {:else}
            <div class="guided-control">
              <button
                class="record-button record-button--stop"
                type="button"
                onclick={stopRecording}
              >
                <span class="stop-icon" aria-hidden="true"></span>
                Stop Recording
              </button>
            </div>
          {/if}
        </div>

        {#if isRecording}
          <div class="track-meter">
            <InputDecibelMeter
              inputLevelDb={calibrationInputLevelDb}
              label="Calibration microphone input level"
            />
            <div class="track-feedback">
              <span>{sampleCount} samples</span>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="sample-card" class:recording={isRecording}>
      <blockquote>
        {#each sampleLines as line}
          <span>{line}</span>
        {/each}
      </blockquote>

    </div>

    {#if recordingError || analysisResult?.error}
      <div class="error-popup" role="alert">
        {recordingError ?? analysisResult?.error?.message}
        <span>Read more slowly, keep a steady volume, and try again.</span>
      </div>
    {/if}

    {#if analysisResult?.success && previewPitch}
      <section class="preview-panel" aria-labelledby="preview-title">
        <h3 class="preview-title" id="preview-title">Calculated Speaking Pitch</h3>
        <div class="preview-summary">
          <strong class="preview-pitch">{previewPitch}</strong>
          <div class="accuracy" aria-label="Confidence {confidencePercent}%">
            <strong>{confidencePercent}%</strong>
            <span>confidence</span>
          </div>
        </div>

        <div class="accuracy-track" aria-hidden="true">
          <div class="accuracy-fill" style:width={`${confidencePercent}%`}></div>
        </div>

        <div class="result-actions">
          <button class="secondary-button" type="button" onclick={retryRecording}>Record Again</button>
          <button class="primary-button" type="button" onclick={saveCalibration}>Continue</button>
        </div>
      </section>
    {:else if analysisResult?.error}
      <div class="result-actions">
        <button class="secondary-button" type="button" onclick={handleClose}>Cancel</button>
        <button class="primary-button" type="button" onclick={retryRecording}>Try Again</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .calibration-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md, 1rem);
    background: rgba(8, 13, 24, 0.76);
  }

  .calibration-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: min(100%, 620px);
    max-height: 92vh;
    overflow-y: auto;
    padding: 22px;
    border: 1px solid var(--color-border);
    border-radius: 18px;
    background: var(--color-panel-strong, var(--color-bg));
    color: var(--color-text);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
  }

  .close-button {
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--color-text-muted);
    font-size: 1.35rem;
  }

  .close-button:hover {
    background: var(--color-control);
    color: var(--color-text);
  }

  .panel-header {
    padding-right: 24px;
    text-align: center;
  }

  .panel-header h2 {
    margin: 0 0 4px;
    font-size: var(--font-size-xl, 1.5rem);
  }

  .sample-card,
  .recording-track,
  .preview-panel {
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-panel);
  }

  .sample-card {
    padding: 12px 14px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .sample-card.recording {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 18%, transparent);
  }

  blockquote {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 8px 0 0;
    color: var(--color-text);
    font-size: 1.2rem;
    font-style: italic;
    line-height: 1.45;
    text-align: center;
  }

  .recording-track {
    padding: 10px 12px;
  }

  .track-feedback,
  .preview-summary,
  .result-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .track-feedback {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    font-variant-numeric: tabular-nums;
  }

  .accuracy-track {
    height: 7px;
    margin: 8px 0;
    overflow: hidden;
    border-radius: 999px;
    background: var(--color-control);
  }

  .accuracy-fill {
    height: 100%;
    border-radius: inherit;
    background: var(--color-primary);
    transition: width 0.1s linear;
  }

  .guidance-popup,
  .error-popup {
    position: relative;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
    border-radius: 9px;
    background: color-mix(in srgb, var(--color-primary) 10%, var(--color-panel));
    color: var(--color-text);
    font-size: var(--font-size-xs);
    line-height: 1.35;
    text-align: center;
    animation: guidance-in 0.18s ease-out;
  }

  .guidance-popup::after {
    position: absolute;
    left: 50%;
    bottom: -6px;
    width: 10px;
    height: 10px;
    border-right: 1px solid color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
    background: inherit;
    content: '';
    transform: translateX(-50%) rotate(45deg);
  }

  @keyframes guidance-in {
    from { opacity: 0; transform: translateY(3px); }
  }

  .error-popup {
    display: flex;
    flex-direction: column;
    gap: 3px;
    border-color: color-mix(in srgb, var(--color-error, #d74646) 50%, var(--color-border));
    background: color-mix(in srgb, var(--color-error, #d74646) 9%, var(--color-panel));
  }

  .error-popup span {
    color: var(--color-text-muted);
  }

  .record-controls,
  .guided-control {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .record-controls {
    margin: 0;
  }

  .track-meter {
    margin-top: 10px;
  }

  .record-button,
  .primary-button,
  .secondary-button {
    border: 1px solid var(--color-border-strong);
    border-radius: 9px;
    background: var(--color-control);
    color: var(--color-text);
    font-weight: 700;
  }

  .record-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 180px;
    padding: 9px 14px;
  }

  .record-button--start,
  .primary-button {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: #fff;
  }

  .record-button--stop {
    border-color: var(--color-error, #d74646);
    color: var(--color-error, #d74646);
  }

  .record-icon {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: currentColor;
  }

  .stop-icon {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: currentColor;
  }

  .preview-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
  }

  .preview-title {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-base);
    text-align: center;
  }

  .preview-summary {
    justify-content: center;
  }

  .preview-pitch {
    color: var(--color-secondary);
    font-size: 1.8rem;
  }

  .accuracy {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .accuracy strong {
    color: var(--color-success, #218a52);
    font-size: 1.35rem;
    font-variant-numeric: tabular-nums;
  }

  .accuracy span {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  .accuracy-fill {
    background: var(--color-success, #218a52);
    transition-duration: 0.25s;
  }

  .result-actions {
    justify-content: center;
  }

  .primary-button,
  .secondary-button {
    padding: 8px 14px;
  }

  @media (max-width: 520px) {
    .calibration-panel {
      padding: 18px 12px;
    }

    blockquote {
      font-size: 1.05rem;
    }

    .result-actions {
      flex-direction: column-reverse;
    }

    .result-actions button {
      width: 100%;
    }
  }
</style>
