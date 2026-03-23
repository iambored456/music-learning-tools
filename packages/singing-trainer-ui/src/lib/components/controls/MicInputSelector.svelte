<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
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

  function hasDevices(): boolean {
    return devices.length > 0;
  }

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
    <label class="selector-label" for="mic-input-device">Input Device</label>
    <button class="refresh-btn" type="button" onclick={() => void refreshDevices()} disabled={isLoading || isApplying}>
      {isLoading ? 'Loading...' : 'Refresh'}
    </button>
  </div>

  <select
    id="mic-input-device"
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

  {#if isApplying}
    <p class="hint">Restarting microphone capture...</p>
  {:else if loadError}
    <p class="error">{loadError}</p>
  {:else if hasDevices()}
    <p class="hint">Choose a device if the current input is silent.</p>
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
    font-size: var(--font-size-sm);
    color: var(--color-text);
    font-weight: 600;
  }

  .refresh-btn {
    font-size: var(--font-size-xs);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
  }

  .refresh-btn:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .selector {
    width: 100%;
    min-height: 34px;
    padding: 6px 8px;
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(8, 16, 34, 0.95);
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
    color: var(--color-text-muted);
  }

  .error {
    color: #ff8f8f;
  }
</style>
