<script lang="ts">
  import { lessonTiming, setLessonTiming, type Settings } from '@mlt/audiationer-trainer-core';
  let { settings = $bindable() }: { settings: Settings } = $props();
  const timing = $derived(lessonTiming(settings));
</script>

<section class="at-mode-setting at-auto-continue" aria-label="Auto-continue after correct">
  <h3>Auto-continue after correct</h3>
  <div class="at-settings-segment at-settings-binary" role="group" aria-label="Auto-continue after correct">
    {#each [true, false] as enabled}<button type="button" aria-pressed={timing.autoContinueCorrect === enabled} onclick={() => setLessonTiming(settings, { autoContinueCorrect: enabled })}>{enabled ? 'On' : 'Off'}</button>{/each}
  </div>
  {#if timing.autoContinueCorrect}
    <p class="at-continue-hint">Adjust the wait after feedback in the timing timeline’s Correct answer view. Click the centre circle to continue immediately.</p>
  {/if}
</section>
