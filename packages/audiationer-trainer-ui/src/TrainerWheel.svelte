<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import CompassWheel from './CompassWheel.svelte';
  import MinimalWheel from './MinimalWheel.svelte';
  let { minimal = false, ...props }: ComponentProps<typeof CompassWheel> & { minimal?: boolean } = $props();
</script>
{#if minimal}<MinimalWheel {...props} />{:else}<CompassWheel {...props} />{/if}
