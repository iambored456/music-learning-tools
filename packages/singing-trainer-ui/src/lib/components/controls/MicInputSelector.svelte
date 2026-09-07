<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { pitchState, secondPitchState, duetState } from '@mlt/singing-trainer-core/stores/pitchState.svelte.js';
  import InputDecibelMeter from './InputDecibelMeter.svelte';
  import {
    getPreferredInputDeviceId,
    listAudioInputDevices,
    setPreferredInputDeviceId,
    restartInputDetection,
    setDuetEnabled,
    isDetecting,
    type AudioInputDeviceInfo,
    type MicrophoneInput,
  } from '@mlt/singing-trainer-core/services/pitchDetection.js';

  let devices = $state<AudioInputDeviceInfo[]>([]);
  let selected = $state({ 1: getPreferredInputDeviceId() ?? 'default', 2: getPreferredInputDeviceId(2) ?? '' });
  let isLoading = $state(false);
  let applying = $state<MicrophoneInput | null>(null);
  let loadError = $state<string | null>(null);
  const visibleInputs = $derived<MicrophoneInput[]>(duetState.enabled ? [1, 2] : [1]);

  async function refreshDevices(): Promise<void> {
    isLoading = true;
    loadError = null;
    try {
      devices = await listAudioInputDevices();
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to enumerate input devices';
    } finally {
      isLoading = false;
    }
  }

  function usedByOtherInput(device: AudioInputDeviceInfo, input: MicrophoneInput): boolean {
    if (!duetState.enabled) return false;
    const otherInput = input === 1 ? 2 : 1;
    const other = otherInput === 1 ? pitchState.state : secondPitchState.state;
    const selectedDevice = devices.find((entry) => entry.deviceId === selected[otherInput]);
    return device.deviceId === selected[otherInput]
      || device.deviceId === other.activeDeviceId
      || Boolean(device.groupId && device.groupId === (other.activeGroupId || selectedDevice?.groupId));
  }

  async function applySelection(input: MicrophoneInput, value: string, retry = false): Promise<void> {
    selected[input] = value;
    setPreferredInputDeviceId(value === 'default' ? null : value || null, input);
    const state = input === 1 ? pitchState : secondPitchState;
    state.setError(null);
    if (!retry && !appState.state.isDetecting && !isDetecting()) return;

    applying = input;
    try {
      await restartInputDetection(input);
    } catch {
      // The capture service exposes errors separately for each input.
    } finally {
      appState.setDetecting(isDetecting());
      applying = null;
    }
  }

  function toggleDuet(): void {
    setDuetEnabled(!duetState.enabled);
    selected[2] = '';
  }

  onMount(() => {
    void refreshDevices();
    const mediaDevices = navigator.mediaDevices;
    const handleDeviceChange = () => void refreshDevices();
    mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    return () => mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
  });
</script>

<div class="mic-input-selector">
  {#each visibleInputs as input (input)}
    {@const inputState = input === 1 ? pitchState.state : secondPitchState.state}
    <div class="selector-row">
      <label class="selector-label" for={`mic-input-device-select-${input}`}>
        {duetState.enabled ? `Input ${input}` : 'Input'}
      </label>
      <select
        id={`mic-input-device-select-${input}`}
        class="selector"
        class:selector--empty={devices.length === 0}
        value={selected[input]}
        onchange={(event) => void applySelection(input, event.currentTarget.value)}
        disabled={isLoading || applying !== null}
      >
        {#if input === 1}
          <option value="default">System Default</option>
        {:else}
          <option value="">Choose a second microphone</option>
        {/if}
        {#if selected[input] && selected[input] !== 'default' && !devices.some((device) => device.deviceId === selected[input])}
          <option value={selected[input]}>Selected microphone unavailable</option>
        {/if}
        {#each devices.filter((device) => device.deviceId !== 'default' && (input === 1 || device.deviceId !== 'communications')) as device}
          <option value={device.deviceId} disabled={usedByOtherInput(device, input)}>{device.label}</option>
        {/each}
      </select>
      {#if input === 1}
        <button
          class="refresh-btn"
          type="button"
          onclick={() => void refreshDevices()}
          disabled={isLoading || applying !== null}
          aria-label={isLoading ? 'Refreshing input devices' : 'Refresh input devices'}
          title="Refresh input devices"
        >
          <svg class="refresh-icon" class:refreshing={isLoading} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5" />
          </svg>
        </button>
        <button
          class="refresh-btn"
          type="button"
          onclick={toggleDuet}
          aria-label={duetState.enabled ? 'Remove Input 2' : 'Add Input 2'}
          title={duetState.enabled ? 'Remove Input 2' : 'Add Input 2'}
          aria-expanded={duetState.enabled}
        >
          <svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" />
            {#if !duetState.enabled}<path d="M12 5v14" />{/if}
          </svg>
        </button>
      {/if}
    </div>
    <InputDecibelMeter inputLevelDb={inputState.inputLevelDb} label={`Input ${input} level`} />
    {#if applying === input}
      <p class="hint">Starting Input {input}...</p>
    {/if}
    {#if inputState.error}
      <p class="error" role="status">Input {input}: {inputState.error}</p>
      <button type="button" disabled={applying !== null} onclick={() => void applySelection(input, selected[input], true)}>Retry Input {input}</button>
    {/if}
  {/each}
  {#if !isLoading && devices.length === 0}
    <p class="hint">No microphone devices available. Allow microphone access, then refresh.</p>
  {/if}
  {#if loadError}<p class="error" role="status">{loadError}</p>{/if}
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
