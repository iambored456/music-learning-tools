<script lang="ts">
  import { chordLabel, degreeLabel, type ScaleMode } from '@mlt/audiationer-trainer-core';
  import Icon from './Icon.svelte';

  let { input, revealed, length, scale, chords = false, feedback, answering, onundo, onreplay }: {
    input: number[]; revealed: number[]; length: number; scale: ScaleMode;
    chords?: boolean;
    feedback: boolean; answering: boolean; onundo: () => void;
    onreplay: (source: 'input' | 'revealed') => void;
  } = $props();
  const sequenceName = $derived(chords ? 'chord progression' : 'melody');
  const itemName = $derived(chords ? 'chord' : 'note');
  function label(degree: number) { return chords ? chordLabel(degree, scale) : degreeLabel(degree, scale); }
</script>

<div class="at-melody-answer" class:at-chord-sequence={chords} style={`--melody-length:${length}`} role="group" aria-label={`${chords ? 'Chord progression' : 'Melody'} answer and feedback`}>
  <div class="at-melody-row" role="group" aria-label="Your answer">
    {#each Array.from({ length }, (_, i) => i) as i}
      {@const degree = input[i]}
      <span class="at-answer-note" class:filled={degree !== undefined} class:correct={feedback && degree === revealed[i]} class:incorrect={feedback && degree !== revealed[i]}
        aria-label={`${chords ? 'Chord' : 'Note'} ${i + 1}: ${degree === undefined ? 'unanswered' : label(degree)}${feedback ? degree === revealed[i] ? ', correct' : ', incorrect' : ''}`}>
        {degree === undefined ? '·' : label(degree)}
      </span>
    {/each}
    {#if feedback}
      <button class="at-icon-button" disabled={!input.length} aria-label={`Replay your ${sequenceName} answer`} onclick={() => onreplay('input')}><Icon name="speaker" size={23} /></button>
    {:else}
      <button class="at-icon-button" disabled={!answering || !input.length} aria-label={`Undo last ${sequenceName} ${itemName}`} onclick={onundo}><Icon name="undo" size={21} /></button>
    {/if}
  </div>
  {#if feedback}
    <div class="at-melody-row at-melody-solution" role="group" aria-label={`Correct ${sequenceName}`}>
      {#each revealed as degree, i}<span aria-label={`Correct ${itemName} ${i + 1}: ${label(degree)}`}>{label(degree)}</span>{/each}
      <button class="at-icon-button" aria-label={`Replay the correct ${sequenceName}`} onclick={() => onreplay('revealed')}><Icon name="speaker" size={23} /></button>
    </div>
  {/if}
</div>
