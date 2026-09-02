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
    type CalibrationPitchSample,
  } from '@mlt/singing-trainer-core/services/pitchDetection.js';

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
  let livePitch = $state<string | null>(null);
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
  const previewFrequency = $derived(
    adjustedMidi === null ? null : 440 * Math.pow(2, (adjustedMidi - 69) / 12)
  );
  const accuracyPercent = $derived(
    Math.round((analysisResult?.confidenceScore ?? 0) * 100)
  );
  const canStop = $derived(isRecording && elapsedMs >= MIN_RECORDING_MS);
  const silenceProgress = $derived(
    hasDetectedSpeech ? Math.min(100, (silenceElapsedMs / AUTO_STOP_SILENCE_MS) * 100) : 0
  );
  const elapsedSeconds = $derived((elapsedMs / 1000).toFixed(1));

  onMount(() => {
    speakingPitchStore.start();
  });

  onDestroy(() => {
    discardRecording = true;
    recorder?.abort();
  });

  function formatLivePitch(sample: CalibrationPitchSample): string {
    const midi = Math.round(sample.midi);
    return getPitchByMidi(midi)?.pitch ?? `${midi}`;
  }

  async function startRecording(): Promise<void> {
    if (isRecording) return;

    speakingPitchStore.reset();
    speakingPitchStore.nextStep();
    speakingPitchStore.startRecording();
    recordingError = null;
    elapsedMs = 0;
    sampleCount = 0;
    livePitch = null;
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
        (nextElapsedMs, currentSample) => {
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
            hasDetectedSpeech = true;
            silenceElapsedMs = AUTO_STOP_SILENCE_MS;
            livePitch = null;
            recorder?.abort();
            return;
          }

          if (nextElapsedMs - lastUiUpdateAt < UI_REFRESH_MS) return;
          lastUiUpdateAt = nextElapsedMs;
          elapsedMs = nextElapsedMs;
          sampleCount = collectedCount;
          hasDetectedSpeech = heardVoice;
          silenceElapsedMs = nextSilenceElapsedMs;
          livePitch = currentSample ? formatLivePitch(currentSample) : null;
        },
        recorder.signal,
      );

      if (discardRecording) return;

      elapsedMs = Math.min(elapsedMs, DEFAULT_CALIBRATION_CONFIG.recordingDurationMs);
      sampleCount = samples.length;
      livePitch = null;
      speakingPitchStore.completeRecording(samples);
      speakingPitchStore.nextStep();
    } catch (error) {
      if (discardRecording) return;
      console.error('[CalibrationWizard] Recording failed', error);
      recordingError = 'The microphone could not be recorded. Check its permission and try again.';
      speakingPitchStore.reset();
    } finally {
      isRecording = false;
      recorder = null;
    }
  }

  function stopRecording(): void {
    if (!canStop) return;
    recorder?.abort();
  }

  function retryRecording(): void {
    recorder?.abort();
    speakingPitchStore.reset();
    elapsedMs = 0;
    sampleCount = 0;
    livePitch = null;
    hasDetectedSpeech = false;
    silenceElapsedMs = 0;
    recordingError = null;
  }

  function adjustPreview(semitones: number): void {
    speakingPitchStore.adjustSemitones(semitones);
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
      <p>Read the limerick once, very slowly and in your natural speaking voice.</p>
    </header>

    <div class="sample-card" class:recording={isRecording}>
      <span class="sample-label">Speaking sample</span>
      <blockquote>
        {#each sampleLines as line}
          <span>{line}</span>
        {/each}
      </blockquote>

      {#if isRecording}
        <div class="guidance-popup guidance-popup--phrase" role="status">
          Read one line at a time. Leave a small pause between lines and keep your voice relaxed.
        </div>
      {/if}
    </div>

    <div class="recording-track" aria-label="Recording progress">
      <div class="track-status">
        <span class="recording-state" class:active={isRecording}>
          <span class="recording-dot" aria-hidden="true"></span>
          {isRecording ? 'Recording' : analysisResult ? 'Recorded' : 'Ready'}
        </span>
        <span class="track-time">{elapsedSeconds}s</span>
      </div>
      <div
        class="track-bar"
        role="progressbar"
        aria-label="Silence auto-stop progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(silenceProgress)}
      >
        <div class="track-fill" style:width={`${silenceProgress}%`}></div>
      </div>
      <div class="track-feedback">
        <span>{sampleCount} voiced samples</span>
        {#if livePitch}<span>Hearing {livePitch}</span>{/if}
        {#if isRecording && hasDetectedSpeech && !livePitch}
          <span>Stopping after quiet&hellip;</span>
        {/if}
      </div>

      {#if !analysisResult}
        <div class="record-controls">
          {#if !isRecording}
            <div class="guided-control">
              <div class="guidance-popup" role="status">
                Press Start Recording, then begin with the first line. It will stop after two seconds of quiet.
              </div>
              <button class="record-button record-button--start" type="button" onclick={() => void startRecording()}>
                <span class="record-icon" aria-hidden="true"></span>
                Start Recording
              </button>
            </div>
          {:else}
            <div class="guided-control">
              <div class="guidance-popup" role="status">
                {canStop ? 'Finish the final line, then stay quiet for two seconds or press Stop Recording.' : 'Keep reading slowly—automatic stop activates after your voice is heard.'}
              </div>
              <button
                class="record-button record-button--stop"
                type="button"
                onclick={stopRecording}
                disabled={!canStop}
              >
                <span class="stop-icon" aria-hidden="true"></span>
                Stop Recording
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    {#if recordingError || analysisResult?.error}
      <div class="error-popup" role="alert">
        {recordingError ?? analysisResult?.error?.message}
        <span>Read more slowly, keep a steady volume, and try again.</span>
      </div>
    {/if}

    {#if analysisResult?.success && previewPitch && previewFrequency !== null}
      <section class="preview-panel" aria-labelledby="preview-title">
        <div class="preview-heading">
          <div>
            <span class="preview-label">Preview calculated speaking pitch</span>
            <h3 id="preview-title">{previewPitch}</h3>
            <span class="preview-frequency">{previewFrequency.toFixed(1)} Hz</span>
          </div>
          <div class="accuracy" aria-label="Accuracy {accuracyPercent}%">
            <strong>{accuracyPercent}%</strong>
            <span>accuracy</span>
          </div>
        </div>

        <div class="accuracy-track" aria-hidden="true">
          <div class="accuracy-fill" style:width={`${accuracyPercent}%`}></div>
        </div>

        <div class="guidance-popup guidance-popup--result" role="status">
          This is a preview. Use − or + if another nearby note feels more representative, then save it.
        </div>

        <div class="preview-adjustment" aria-label="Adjust calculated speaking pitch">
          <button type="button" onclick={() => adjustPreview(-1)} aria-label="Lower speaking pitch one semitone">&minus;</button>
          <span>{speakingPitchStore.manualAdjustment === 0 ? 'No adjustment' : `${speakingPitchStore.manualAdjustment > 0 ? '+' : ''}${speakingPitchStore.manualAdjustment} semitones`}</span>
          <button type="button" onclick={() => adjustPreview(1)} aria-label="Raise speaking pitch one semitone">+</button>
        </div>

        <div class="result-actions">
          <button class="secondary-button" type="button" onclick={retryRecording}>Record Again</button>
          <button class="primary-button" type="button" onclick={saveCalibration}>Save Speaking Pitch</button>
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

  .panel-header p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
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

  .sample-label,
  .preview-label {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  blockquote {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 8px 0 0;
    color: var(--color-text);
    font-size: 1rem;
    font-style: italic;
    line-height: 1.45;
    text-align: center;
  }

  .recording-track {
    padding: 10px 12px;
  }

  .track-status,
  .track-feedback,
  .preview-heading,
  .preview-adjustment,
  .result-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .recording-state {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font-size-sm);
    font-weight: 700;
  }

  .recording-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--color-text-muted);
  }

  .recording-state.active {
    color: var(--color-error, #d74646);
  }

  .recording-state.active .recording-dot {
    background: currentColor;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    50% { opacity: 0.4; transform: scale(1.25); }
  }

  .track-time,
  .track-feedback {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    font-variant-numeric: tabular-nums;
  }

  .track-bar,
  .accuracy-track {
    height: 7px;
    margin: 8px 0;
    overflow: hidden;
    border-radius: 999px;
    background: var(--color-control);
  }

  .track-fill,
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

  .guidance-popup--phrase,
  .guidance-popup--result {
    margin-top: 10px;
  }

  .guidance-popup--phrase::after,
  .guidance-popup--result::after {
    display: none;
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
    margin-top: 10px;
  }

  .record-button,
  .primary-button,
  .secondary-button,
  .preview-adjustment button {
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

  .record-button:disabled {
    cursor: wait;
    opacity: 0.5;
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

  .preview-heading h3 {
    display: inline;
    margin: 0 8px 0 0;
    color: var(--color-secondary);
    font-size: 1.8rem;
  }

  .preview-frequency {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
  }

  .accuracy {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
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

  .preview-adjustment {
    justify-content: center;
  }

  .preview-adjustment button {
    width: 32px;
    height: 32px;
    padding: 0;
    font-size: 1.1rem;
  }

  .preview-adjustment span {
    min-width: 110px;
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    text-align: center;
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
      font-size: 0.9rem;
    }

    .preview-heading {
      align-items: flex-start;
    }

    .result-actions {
      flex-direction: column-reverse;
    }

    .result-actions button {
      width: 100%;
    }
  }
</style>
