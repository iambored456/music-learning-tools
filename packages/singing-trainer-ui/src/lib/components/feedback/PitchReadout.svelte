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

  const currentNote = $derived.by(() => {
    const pitch = displayedPitch;
    if (!pitch) return null;

    const noteName = NOTE_NAMES[pitch.pitchClass] ?? '';
    const octave = Math.floor(Math.round(pitch.midi) / 12) - 1;
    const cents = Math.round((pitch.midi - Math.round(pitch.midi)) * 100);

    return {
      name: noteName,
      // Natural notes reserve the same accidental slot as sharp/flat notes.
      noteSlots: `${noteName[0] ?? ' '}${noteName.slice(1) || ' '}${octave}`,
      octave,
      frequency: pitch.frequency.toFixed(1),
      cents,
    };
  });

  // Reserve thousands, hundreds, tens, ones, decimal point and tenths, even
  // when leading positions are empty. The units also occupy fixed slots.
  const frequencySlots = $derived(currentNote ? `${currentNote.frequency.padStart(6, ' ')} Hz` : '----.- Hz');
  const centsSlots = $derived(currentNote
    ? `${currentNote.cents > 0 ? '+' : currentNote.cents < 0 ? '\u2212' : ' '}${String(Math.abs(currentNote.cents)).padStart(2, ' ')}\u00a2`
    : ' --\u00a2');

  const isDetecting = $derived(appState.state.isDetecting);
</script>

{#snippet characters(text: string)}
  {#each Array.from(text) as character}
    <span class="character" aria-hidden="true">{character}</span>
  {/each}
{/snippet}

<div class="pitch-readout" class:pitch-readout--compact={compact}>
  <div class="pitch-line" class:fading={isFading}>
    <span class="note-display" class:placeholder={!currentNote} role="img"
      aria-label={currentNote ? `${currentNote.name}${currentNote.octave}` : 'No pitch'}>
      {@render characters(currentNote?.noteSlots ?? '---')}
    </span>
    <span class="frequency" role="img" aria-label={currentNote ? `${currentNote.frequency} hertz` : 'No frequency'}>
      {@render characters(frequencySlots)}
    </span>
    <span class="cents" class:sharp={(currentNote?.cents ?? 0) > 0} class:flat={(currentNote?.cents ?? 0) < 0}
      role="img" aria-label={currentNote ? `${currentNote.cents > 0 ? '+' : ''}${currentNote.cents} cents` : 'No cents deviation'}>
      {@render characters(centsSlots)}
    </span>
  </div>
    {#if !currentNote && showHint}
      <span class="hint">
        {isDetecting ? 'Sing or hum into the microphone' : 'Click Start to enable the microphone'}
      </span>
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

  .note-display,
  .frequency,
  .cents {
    display: inline-grid;
    grid-auto-flow: column;
    grid-auto-columns: 0.65em;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .character {
    white-space: pre;
  }

  .pitch-line {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    align-items: baseline;
    justify-items: center;
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

  .note-display {
    grid-auto-columns: 0.85em;
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-secondary);
  }

  .pitch-readout--compact .pitch-line {
    gap: var(--spacing-sm);
    font-size: var(--font-size-xs);
    text-align: center;
  }

  .frequency {
    min-width: 0;
    text-align: center;
  }

  .cents {
    min-width: 0;
    font-weight: 500;
    text-align: center;
  }

  .cents.sharp {
    color: var(--color-warning);
  }

  .cents.flat {
    color: var(--color-primary);
  }

  .placeholder {
    color: var(--color-text-muted);
  }

  .pitch-readout--compact .note-display {
    font-size: var(--font-size-lg);
  }

  .hint {
    margin-top: var(--spacing-sm);
    text-align: center;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    opacity: 0.7;
  }
</style>
