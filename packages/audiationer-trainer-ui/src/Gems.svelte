<script lang="ts">
  import { DIFFICULTIES } from '@mlt/audiationer-trainer-core';
  import Gem from './Gem.svelte';
  let { value = 0 }: { value?: number } = $props();
</script>
<span class="at-gems" role="img" aria-label={value ? `${DIFFICULTIES[value - 1].name} completed` : 'No completed difficulty yet'}>
  {#each [1, 2, 3] as i}<Gem lit={i <= value} colour={DIFFICULTIES[Math.max(0, value - 1)].colour} />{/each}
</span>
