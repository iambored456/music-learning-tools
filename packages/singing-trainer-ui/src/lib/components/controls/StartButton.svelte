<script lang="ts">
  /**
   * StartButton Component
   *
   * Button to start/stop pitch detection.
   */

  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { startDetection, stopDetection } from '@mlt/singing-trainer-core/services/pitchDetection.js';
  import { pitchState } from '@mlt/singing-trainer-core/stores/pitchState.svelte.js';

  interface Props {
    compact?: boolean;
  }

  let { compact = false }: Props = $props();

  let isLoading = $state(false);

  async function handleClick() {
    if (isLoading) return;

    if (appState.state.isDetecting) {
      stopDetection();
      appState.setDetecting(false);
      pitchState.reset();
    } else {
      isLoading = true;
      try {
        await startDetection();
        appState.setDetecting(true);
      } catch (err) {
        console.error('Failed to start detection:', err);
        alert('Could not access microphone. Please grant permission and try again.');
      } finally {
        isLoading = false;
      }
    }
  }
</script>

<button
  class="start-button"
  class:active={appState.state.isDetecting}
  class:loading={isLoading}
  class:start-button--compact={compact}
  onclick={handleClick}
  disabled={isLoading}
>
  {#if isLoading}
    <span class="spinner"></span>
    Starting...
  {:else if appState.state.isDetecting}
    <span class="icon">&#9632;</span>
    Stop
  {:else}
    <span class="icon">&#9654;</span>
    Start
  {/if}
</button>

<style>
  .start-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    width: 100%;
    padding: var(--spacing-md) var(--spacing-xl);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: white;
    background: linear-gradient(135deg, var(--color-primary), #c0392b);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    transition: all 0.2s ease;
    min-width: 140px;
  }

  .start-button--compact {
    min-width: 0;
    min-height: 0;
    height: fit-content;
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .start-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .start-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .start-button.active {
    background: linear-gradient(135deg, var(--color-success), #27ae60);
  }

  .start-button.loading {
    opacity: 0.8;
  }

  .icon {
    font-size: 1.2em;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
