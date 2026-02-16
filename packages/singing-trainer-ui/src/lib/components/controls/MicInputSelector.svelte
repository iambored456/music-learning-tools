<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import {
    getPreferredInputDeviceId,
    getRelaxedMicGatesEnabled,
    listAudioInputDevices,
    setPreferredInputDeviceId,
    setRelaxedMicGatesEnabled,
    startDetection,
    stopDetection,
    type AudioInputDeviceInfo,
  } from '@mlt/singing-trainer-core/services/pitchDetection.js';

  let devices = $state<AudioInputDeviceInfo[]>([]);
  let selectedValue = $state<string>('default');
  let relaxedMicGatesEnabled = $state(false);
  let isLoading = $state(false);
  let isApplying = $state(false);
  let loadError = $state<string | null>(null);

  async function refreshDevices(): Promise<void> {
    isLoading = true;
    loadError = null;
    try {
      devices = await listAudioInputDevices();
      const preferredId = getPreferredInputDeviceId();
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

  function handleRelaxedMicGatesToggle(event: Event): void {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    relaxedMicGatesEnabled = checked;
    setRelaxedMicGatesEnabled(checked);
  }

  onMount(() => {
    relaxedMicGatesEnabled = getRelaxedMicGatesEnabled();
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
    value={selectedValue}
    onchange={handleChange}
    disabled={isLoading || isApplying}
  >
    <option value="default">System Default</option>
    {#each devices as device}
      <option value={device.deviceId}>{device.label}</option>
    {/each}
  </select>

  {#if isApplying}
    <p class="hint">Restarting microphone capture...</p>
  {:else if loadError}
    <p class="error">{loadError}</p>
  {:else if devices.length === 0}
    <p class="hint">No input devices found yet. Click Start once, then Refresh.</p>
  {:else}
    <p class="hint">Choose a device if the current input is silent.</p>
  {/if}

  <label class="testing-toggle">
    <input
      id="mic-relaxed-gates"
      type="checkbox"
      checked={relaxedMicGatesEnabled}
      onchange={handleRelaxedMicGatesToggle}
    />
    <span>User testing mode: ignore confidence and dB gates</span>
  </label>
  {#if relaxedMicGatesEnabled}
    <p class="hint">Low-confidence and low-level mic input is accepted while this mode is on.</p>
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

  .testing-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
    color: var(--color-text);
    cursor: pointer;
    user-select: none;
    margin-top: var(--spacing-xs);
  }

  .testing-toggle input[type='checkbox'] {
    cursor: pointer;
  }
</style>
