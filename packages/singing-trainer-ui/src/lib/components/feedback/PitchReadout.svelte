<script lang="ts">
  /**
   * PitchReadout Component
   *
   * Displays the current detected pitch information.
   */

  import { pitchState } from '../../stores/pitchState.svelte.js';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const currentNote = $derived(() => {
    const pitch = pitchState.state.currentPitch;
    if (!pitch) return null;

    const noteName = NOTE_NAMES[pitch.pitchClass];
    const octave = Math.floor(pitch.midi / 12) - 1;
    const cents = Math.round((pitch.midi - Math.round(pitch.midi)) * 100);

    return {
      name: noteName,
      octave,
      frequency: pitch.frequency.toFixed(1),
      cents,
      clarity: Math.round(pitch.clarity * 100),
    };
  });
</script>

<div class="pitch-readout">
  {#if currentNote()}
    {@const note = currentNote()!}
    <div class="note-display">
      <span class="note-name">{note.name}</span>
      <span class="octave">{note.octave}</span>
    </div>
    <div class="details">
      <span class="frequency">{note.frequency} Hz</span>
      <span class="cents" class:sharp={note.cents > 0} class:flat={note.cents < 0}>
        {note.cents > 0 ? '+' : ''}{note.cents}¢
      </span>
      <span class="clarity">{note.clarity}%</span>
    </div>
  {:else}
    <div class="no-pitch">
      <span class="placeholder">---</span>
      <span class="hint">Sing or hum into the microphone</span>
    </div>
  {/if}
</div>

<style>
  .pitch-readout {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
    background-color: var(--color-surface);
    border-radius: var(--radius-md);
    min-width: 200px;
    min-height: 100px;
  }

  .note-display {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-xs);
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

  .details {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .cents {
    font-weight: 500;
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

  .hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    opacity: 0.7;
  }
</style>
