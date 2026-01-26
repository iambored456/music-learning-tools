<script lang="ts">
  /**
   * Speaking Pitch Panel Component
   *
   * Displays the user's calibrated speaking pitch with settings and calibration controls.
   * Designed to be a prominent standalone panel in the sidebar.
   */

  import { preferencesStore } from '../../stores/preferencesStore.svelte.js';
  import { midiToFrequency } from '@mlt/pitch-utils';

  interface Props {
    onCalibrate: () => void;
  }

  let { onCalibrate }: Props = $props();

  // Settings dropdown state
  let showSettings = $state(false);

  // Derived state from preferences
  const isCalibrated = $derived(preferencesStore.isCalibrated);
  const speakingPitchMidi = $derived(preferencesStore.speakingPitchMidi);
  const speakingPitchNote = $derived(preferencesStore.speakingPitchNoteName);
  const lastCalibratedDate = $derived(preferencesStore.lastCalibratedDate);

  // Calculate frequency from MIDI
  const speakingPitchHz = $derived(
    speakingPitchMidi !== null ? Math.round(midiToFrequency(speakingPitchMidi)) : null
  );

  function handleAdjustUp() {
    preferencesStore.adjustSpeakingPitch(1);
  }

  function handleAdjustDown() {
    preferencesStore.adjustSpeakingPitch(-1);
  }

  function handleClear() {
    if (confirm('Clear your speaking pitch calibration?')) {
      preferencesStore.clearSpeakingPitch();
      showSettings = false;
    }
  }

  function toggleSettings() {
    showSettings = !showSettings;
  }
</script>

<div class="speaking-pitch-panel">
  <div class="panel-header">
    <h3 class="panel-title">Speaking Pitch</h3>
    {#if isCalibrated}
      <button
        class="settings-toggle"
        onclick={toggleSettings}
        aria-label="Toggle settings"
        aria-expanded={showSettings}
      >
        <svg class="gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>
    {/if}
  </div>

  {#if isCalibrated}
    <div class="pitch-display">
      <div class="pitch-value-row">
        <button class="adjust-btn" onclick={handleAdjustDown} aria-label="Lower pitch">
          −
        </button>
        <div class="pitch-value">
          <span class="note-name">{speakingPitchNote}</span>
          <span class="frequency">{speakingPitchHz} Hz</span>
        </div>
        <button class="adjust-btn" onclick={handleAdjustUp} aria-label="Raise pitch">
          +
        </button>
      </div>
      <p class="calibration-date">Calibrated {lastCalibratedDate}</p>
    </div>

    <!-- Settings dropdown -->
    {#if showSettings}
      <div class="settings-dropdown">
        <button class="settings-option" onclick={onCalibrate}>
          <svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Recalibrate
        </button>
        <button class="settings-option settings-option--danger" onclick={handleClear}>
          <svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          Clear Calibration
        </button>
      </div>
    {/if}
  {:else}
    <div class="not-calibrated">
      <p class="hint-text">
        Calibrate your speaking pitch to adapt exercises to your voice range.
      </p>
      <button class="calibrate-btn" onclick={onCalibrate}>
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
        </svg>
        Calibrate Now
      </button>
    </div>
  {/if}
</div>

<style>
  .speaking-pitch-panel {
    background: var(--color-surface, rgba(255, 255, 255, 0.05));
    border-radius: var(--radius-md, 8px);
    padding: var(--spacing-md, 1rem);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm, 0.5rem);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-title {
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: 600;
    color: var(--color-text-muted, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .settings-toggle {
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-muted, #888);
    cursor: pointer;
    border-radius: var(--radius-sm, 4px);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .settings-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text, #fff);
  }

  .gear-icon {
    width: 18px;
    height: 18px;
  }

  /* Pitch display (calibrated state) */
  .pitch-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs, 0.25rem);
  }

  .pitch-value-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm, 0.5rem);
  }

  .adjust-btn {
    width: 32px;
    height: 32px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-sm, 4px);
    background: transparent;
    color: var(--color-text, #fff);
    font-size: var(--font-size-lg, 1.25rem);
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .adjust-btn:hover {
    background: var(--color-primary, #638dd3);
    border-color: var(--color-primary, #638dd3);
  }

  .pitch-value {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
  }

  .note-name {
    font-size: var(--font-size-2xl, 1.75rem);
    font-weight: 700;
    color: var(--color-primary, #638dd3);
    line-height: 1;
  }

  .frequency {
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--color-text-muted, #888);
  }

  .calibration-date {
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--color-text-muted, #888);
    margin: 0;
    text-align: center;
  }

  /* Settings dropdown */
  .settings-dropdown {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs, 0.25rem);
    margin-top: var(--spacing-xs, 0.25rem);
    padding-top: var(--spacing-sm, 0.5rem);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .settings-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm, 0.5rem);
    padding: var(--spacing-xs, 0.25rem) var(--spacing-sm, 0.5rem);
    border: none;
    border-radius: var(--radius-sm, 4px);
    background: transparent;
    color: var(--color-text, #fff);
    font-size: var(--font-size-sm, 0.875rem);
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease;
  }

  .settings-option:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .settings-option--danger {
    color: var(--color-error, #dc3545);
  }

  .settings-option--danger:hover {
    background: rgba(220, 53, 69, 0.15);
  }

  .option-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* Not calibrated state */
  .not-calibrated {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm, 0.5rem);
    align-items: center;
    text-align: center;
  }

  .hint-text {
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--color-text-muted, #888);
    margin: 0;
    line-height: 1.4;
  }

  .calibrate-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs, 0.25rem);
    width: 100%;
    padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
    border: none;
    border-radius: var(--radius-md, 8px);
    background: var(--color-primary, #638dd3);
    color: white;
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .calibrate-btn:hover {
    background: var(--color-primary-dark, #4a7bc8);
  }

  .btn-icon {
    width: 18px;
    height: 18px;
  }
</style>
