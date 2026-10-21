<script lang="ts">
  import { gemAward } from '@mlt/audiationer-trainer-core';
  import Gem from './Gem.svelte';
  let { value = 0, showBlanks = true, label }: { value?: number; showBlanks?: boolean; label?: string } = $props();
  const award = $derived(gemAward(value));
</script>
<span class="at-gems" role="img" aria-label={label ?? (value ? `${award.name} completed${value === 4 ? ', three gold gems' : ''}` : 'No completed difficulty yet')}>
  {#each Array.from({ length: showBlanks ? 3 : award.count }, (_, i) => i + 1) as i}<Gem lit={i <= award.count} colour={award.colour} />{/each}
</span>
