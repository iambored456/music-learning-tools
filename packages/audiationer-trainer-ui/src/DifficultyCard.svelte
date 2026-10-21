<script lang="ts">
  import { difficultyRank, gemAward, setDifficulty, type Settings } from '@mlt/audiationer-trainer-core';
  import Gems from './Gems.svelte';
  let { settings = $bindable() }: { settings: Settings } = $props();
  const listening = $derived(settings.mode === 'pocket');
  const rank = $derived(difficultyRank(settings));
  const award = $derived(gemAward(rank));
  const goldNote = 'Score 100% to earn three gold gems. 80% or higher earns Master.';
</script>

<section class="at-difficulty-card at-pill" style:--at-level-colour={listening ? 'var(--at-accent)' : award.colour} aria-label="Difficulty settings">
  {#if !listening}<span class="at-difficulty-note at-difficulty-width" aria-hidden="true">{goldNote}</span>{/if}
  <h2>{#if listening}Listening range{:else}<span>Difficulty:</span><span class="at-difficulty-award"><span class="at-difficulty-gems"><Gems value={rank} label={`${rank === 4 ? '3 gold gems' : `${award.count} gems`} available`} /></span><span>{award.name}</span></span>{/if}</h2>
  <fieldset class="at-difficulty-control"><legend>Question Range</legend><div class="at-settings-segment">
    {#each [1, 2, 3] as count}<button type="button" aria-pressed={settings.octaveCount === count} onclick={() => setDifficulty(settings, { octaveCount: count as 1 | 2 | 3 })}>{count} {count === 1 ? 'octave' : 'octaves'}</button>{/each}
  </div></fieldset>
  {#if !listening}
    <fieldset class="at-difficulty-control"><legend>Time Per Question</legend><div class="at-settings-segment">
      {#each [0, 5, 2] as seconds}<button type="button" aria-pressed={settings.answerSeconds === seconds} onclick={() => setDifficulty(settings, { answerSeconds: seconds })}>{seconds ? `${seconds} seconds` : 'No limit'}</button>{/each}
    </div></fieldset>
    <p class="at-difficulty-note">{rank === 4 ? goldNote : `Score 80% or higher to earn ${award.name}.`}</p>
  {:else}<p class="at-difficulty-note">Hands-free listening does not award gems.</p>{/if}
</section>
