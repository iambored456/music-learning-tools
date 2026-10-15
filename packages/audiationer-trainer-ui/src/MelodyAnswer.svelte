<script lang="ts">
  import { degreeLabel, type ScaleMode } from '@mlt/audiationer-trainer-core';
  import Icon from './Icon.svelte';

  let { input, revealed, length, scale, feedback, answering, onundo, onreplay }: {
    input: number[]; revealed: number[]; length: number; scale: ScaleMode;
    feedback: boolean; answering: boolean; onundo: () => void;
    onreplay: (source: 'input' | 'revealed') => void;
  } = $props();
</script>

<div class="at-melody-answer" style={`--melody-length:${length}`} role="group" aria-label="Melody answer and feedback">
  <div class="at-melody-row" role="group" aria-label="Your answer">
    {#each Array.from({ length }, (_, i) => i) as i}
      {@const degree = input[i]}
      <span class="at-answer-note" class:filled={degree !== undefined} class:correct={feedback && degree === revealed[i]} class:incorrect={feedback && degree !== revealed[i]}
        aria-label={`Note ${i + 1}: ${degree === undefined ? 'unanswered' : degreeLabel(degree, scale)}${feedback ? degree === revealed[i] ? ', correct' : ', incorrect' : ''}`}>
        {degree === undefined ? '·' : degreeLabel(degree, scale)}
      </span>
    {/each}
    {#if feedback}
      <button class="at-icon-button" disabled={!input.length} aria-label="Replay your melody answer" onclick={() => onreplay('input')}><Icon name="speaker" size={23} /></button>
    {:else}
      <button class="at-icon-button" disabled={!answering || !input.length} aria-label="Undo last melody note" onclick={onundo}><Icon name="undo" size={21} /></button>
    {/if}
  </div>
  {#if feedback}
    <div class="at-melody-row at-melody-solution" role="group" aria-label="Correct melody">
      {#each revealed as degree, i}<span aria-label={`Correct note ${i + 1}: ${degreeLabel(degree, scale)}`}>{degreeLabel(degree, scale)}</span>{/each}
      <button class="at-icon-button" aria-label="Replay the correct melody" onclick={() => onreplay('revealed')}><Icon name="speaker" size={23} /></button>
    </div>
  {/if}
</div>
