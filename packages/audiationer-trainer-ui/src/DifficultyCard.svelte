<script lang="ts">
  import { DIFFICULTIES, difficultyIndex } from '@mlt/audiationer-trainer-core';
  import Gem from './Gem.svelte';

  let { seconds, onchange }: { seconds: number; onchange: (seconds: number) => void } = $props();
  const difficulty = $derived(difficultyIndex(seconds));
</script>

<div class="at-difficulty-card at-pill" style:--at-level-colour={DIFFICULTIES[difficulty].colour}>
  <div><h2>Select Difficulty: {DIFFICULTIES[difficulty].name}</h2><p>{DIFFICULTIES[difficulty].detail}</p></div>
  <div class="at-difficulty-gems" role="group" aria-label="Difficulty">
    {#each DIFFICULTIES as item, i}<button type="button" class="at-gem-button" title={`${item.name}: ${item.detail}`} aria-label={`${item.name}: ${item.detail}`} aria-pressed={difficulty === i} onclick={() => onchange(item.seconds)}><Gem lit={i <= difficulty} colour={DIFFICULTIES[difficulty].colour} /></button>{/each}
  </div>
  <p class="at-difficulty-note">Score 80% or higher to earn a gem.</p>
</div>
