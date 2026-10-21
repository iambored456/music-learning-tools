<script lang="ts">
  import ExerciseBottomControls from './ExerciseBottomControls.svelte';

  let { visible = false }: { visible?: boolean } = $props();
</script>

{#if visible}
  <div class="exercise-toolbar" role="region" aria-label="Exercise toolbar">
    <ExerciseBottomControls />
  </div>
{/if}

<style>
  .exercise-toolbar {
    width: 100%;
    flex-shrink: 0;
    max-height: 40vh;
    overflow-y: auto;
  }
</style>
