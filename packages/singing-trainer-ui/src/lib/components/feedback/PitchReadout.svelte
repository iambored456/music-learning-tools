<script lang="ts">
  /**
   * PitchReadout Component
   *
   * Displays the current detected pitch information.
   */

  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import {
    pitchState,
    type DetectedPitch,
  } from '@mlt/singing-trainer-core/stores/pitchState.svelte.js';
  import { onMount } from 'svelte';

  interface Props {
    compact?: boolean;
    showHint?: boolean;
  }

  let { compact = false, showHint = true }: Props = $props();

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const DISPLAY_REFRESH_MS = 1000 / 30;
  const LAST_PITCH_FADE_MS = 900;
  let displayedPitch = $state<DetectedPitch | null>(null);
  let isFading = $state(false);
  let fadeTimeoutId: number | null = null;

  function cancelFade(): void {
    if (fadeTimeoutId !== null) {
      window.clearTimeout(fadeTimeoutId);
      fadeTimeoutId = null;
    }
    isFading = false;
  }

  function refreshDisplayedPitch(): void {
    const latestPitch = pitchState.state.currentPitch;
    if (latestPitch) {
      cancelFade();
      displayedPitch = latestPitch;
      return;
    }

    if (!displayedPitch || isFading) return;
    isFading = true;
    fadeTimeoutId = window.setTimeout(() => {
      displayedPitch = null;
      isFading = false;
      fadeTimeoutId = null;
    }, LAST_PITCH_FADE_MS);
  }

  onMount(() => {
    refreshDisplayedPitch();
    const refreshId = window.setInterval(refreshDisplayedPitch, DISPLAY_REFRESH_MS);

    return () => {
      window.clearInterval(refreshId);
      cancelFade();
    };
  });

  const currentNote = $derived(() => {
    const pitch = displayedPitch;
    if (!pitch) return null;

    const noteName = NOTE_NAMES[pitch.pitchClass];
    const octave = Math.floor(pitch.midi / 12) - 1;
    const cents = Math.round((pitch.midi - Math.round(pitch.midi)) * 100);

    return {
      name: noteName,
      octave,
      frequency: pitch.frequency.toFixed(1),
      cents,
    };
  });

  const isDetecting = $derived(appState.state.isDetecting);
</script>

<div class="pitch-readout" class:pitch-readout--compact={compact}>
  {#if currentNote()}
    {@const note = currentNote()!}
    <div class="pitch-line" class:fading={isFading}>
      <span class="note-display">
        <span class="note-name">{note.name}</span>
        <span class="octave">{note.octave}</span>
      </span>
      <span class="frequency">{note.frequency} Hz</span>
      <span class="cents" class:sharp={note.cents > 0} class:flat={note.cents < 0}>
        {note.cents > 0 ? '+' : ''}{note.cents}&cent;
      </span>
    </div>
  {:else}
    <div class="no-pitch" class:no-pitch--compact={compact}>
      <span class="placeholder">---</span>
      {#if showHint}
        <span class="hint">
          {isDetecting ? 'Sing or hum into the microphone' : 'Click Start to enable the microphone'}
        </span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .pitch-readout {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    min-width: 200px;
    min-height: 100px;
  }

  .pitch-readout--compact {
    min-width: 0;
    min-height: 0;
    padding: 5px 8px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-panel);
  }

  .note-display {
    display: inline-flex;
    align-items: baseline;
    gap: var(--spacing-xs);
  }

  .pitch-line {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: var(--spacing-md);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    opacity: 1;
    white-space: nowrap;
  }

  .pitch-line.fading {
    opacity: 0;
    transition: opacity 900ms ease-out;
  }

  .note-name {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-secondary);
  }

  .octave {
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
  }

  .pitch-readout--compact .pitch-line {
    gap: var(--spacing-sm);
    font-size: var(--font-size-xs);
    text-align: center;
  }

  .frequency,
  .cents {
    font-variant-numeric: tabular-nums;
  }

  .frequency {
    min-width: 58px;
    text-align: right;
  }

  .cents {
    min-width: 34px;
    font-weight: 500;
    text-align: right;
  }

  .cents.sharp {
    color: var(--color-warning);
  }

  .cents.flat {
    color: var(--color-primary);
  }

  .no-pitch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .placeholder {
    font-size: var(--font-size-2xl);
    color: var(--color-text-muted);
  }

  .pitch-readout--compact .note-name,
  .pitch-readout--compact .placeholder {
    font-size: var(--font-size-lg);
  }

  .pitch-readout--compact .octave {
    font-size: var(--font-size-sm);
  }

  .no-pitch--compact {
    gap: 0;
  }

  .hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    opacity: 0.7;
  }
</style>
