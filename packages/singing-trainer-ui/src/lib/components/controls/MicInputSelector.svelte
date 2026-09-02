<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import InputDecibelMeter from './InputDecibelMeter.svelte';
  import {
    getPreferredInputDeviceId,
    listAudioInputDevices,
    setPreferredInputDeviceId,
    startDetection,
    stopDetection,
    type AudioInputDeviceInfo,
  } from '@mlt/singing-trainer-core/services/pitchDetection.js';

  let devices = $state<AudioInputDeviceInfo[]>([]);
  let selectedValue = $state<string>('default');
  let isLoading = $state(false);
  let isApplying = $state(false);
  let loadError = $state<string | null>(null);

  function showEmptyState(): boolean {
    return !isLoading && !isApplying && devices.length === 0;
  }

  async function refreshDevices(): Promise<void> {
    isLoading = true;
    loadError = null;
    try {
      devices = await listAudioInputDevices();
      const preferredId = getPreferredInputDeviceId();
      if (devices.length === 0) {
        selectedValue = '';
        return;
      }
      selectedValue = preferredId ?? 'default';
      if (preferredId && !devices.some((device) => device.deviceId === preferredId)) {
        selectedValue = 'default';
        setPreferredInputDeviceId(null);
      }
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to enumerate input devices';
    } finally {
      isLoading = false;
    }
  }

  async function applySelection(value: string): Promise<void> {
    const normalized = value === 'default' ? null : value;
    setPreferredInputDeviceId(normalized);

    if (!appState.state.isDetecting) {
      return;
    }

    isApplying = true;
    try {
      stopDetection();
      appState.setDetecting(false);
      await startDetection();
      appState.setDetecting(true);
    } catch (err) {
      console.error('[MicInputSelector] Failed to restart detection after device change', err);
    } finally {
      isApplying = false;
    }
  }

  function handleChange(event: Event): void {
    const nextValue = (event.currentTarget as HTMLSelectElement).value;
    selectedValue = nextValue;
    void applySelection(nextValue);
  }

  onMount(() => {
    void refreshDevices();
  });
</script>

<div class="mic-input-selector">
  <div class="selector-row">
    <label class="selector-label" for="mic-input-device-select">Input</label>
    <select
      id="mic-input-device-select"
      class="selector"
      class:selector--empty={showEmptyState()}
      value={showEmptyState() ? '' : selectedValue}
      onchange={handleChange}
      disabled={isLoading || isApplying || showEmptyState()}
    >
      {#if showEmptyState()}
        <option value="">No input device found</option>
      {:else}
        <option value="default">System Default</option>
        {#each devices as device}
          <option value={device.deviceId}>{device.label}</option>
        {/each}
      {/if}
    </select>
    <button
      class="refresh-btn"
      type="button"
      onclick={() => void refreshDevices()}
      disabled={isLoading || isApplying}
      aria-label={isLoading ? 'Refreshing input devices' : 'Refresh input devices'}
      title={isLoading ? 'Refreshing input devices' : 'Refresh input devices'}
    >
      <svg class="refresh-icon" class:refreshing={isLoading} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5" />
      </svg>
    </button>
  </div>

  <InputDecibelMeter />

  {#if isApplying}
    <p class="hint">Restarting microphone capture...</p>
  {:else if loadError}
    <p class="error">{loadError}</p>
  {/if}
</div>

<style>
  .mic-input-selector {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    width: 100%;
  }

  .selector-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  .selector-label {
    flex: 0 0 auto;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    font-weight: 600;
  }

  .refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    flex: 0 0 auto;
    padding: 4px;
    border-radius: var(--radius-sm);
    appearance: none;
    background-color: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border-strong);
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    background-color: transparent;
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  .refresh-icon {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .refresh-icon.refreshing {
    animation: refresh-spin 0.8s linear infinite;
  }

  @keyframes refresh-spin {
    to { transform: rotate(360deg); }
  }

  .refresh-btn:disabled {
    background-color: transparent;
    color: var(--color-text-muted);
    border-color: var(--color-border);
    opacity: 0.55;
    cursor: default;
  }

  .selector {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
    min-height: 28px;
    padding: 3px 6px;
    font-size: var(--font-size-xs);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-strong);
    background: var(--color-control);
    color: var(--color-text);
  }

  .selector--empty {
    color: var(--color-text-muted);
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .selector:disabled {
    cursor: default;
    opacity: 1;
  }

  .hint,
  .error {
    margin: 0;
    font-size: var(--font-size-xs);
    line-height: 1.3;
  }

  .hint {
    color: var(--color-text);
  }

  .error {
    color: #ff8f8f;
  }
</style>
