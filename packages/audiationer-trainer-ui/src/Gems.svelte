<script lang="ts">
  import { DIFFICULTIES } from '@mlt/audiationer-trainer-core';
  import Gem from './Gem.svelte';
  let { value = 0, showBlanks = true, label }: { value?: number; showBlanks?: boolean; label?: string } = $props();
</script>
<span class="at-gems" role="img" aria-label={label ?? (value ? `${DIFFICULTIES[value - 1].name} completed` : 'No completed difficulty yet')}>
  {#each Array.from({ length: showBlanks ? 3 : value }, (_, i) => i + 1) as i}<Gem lit={i <= value} colour={DIFFICULTIES[Math.max(0, value - 1)].colour} />{/each}
</span>
