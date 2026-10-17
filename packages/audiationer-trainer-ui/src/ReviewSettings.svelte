<script lang="ts">
  import { REVIEW_SKIP_OPTIONS, lessonTiming, setLessonTiming, type Settings } from '@mlt/audiationer-trainer-core';
  let { settings = $bindable() }: { settings: Settings } = $props();
  const timing = $derived(lessonTiming(settings));
</script>

<section class="at-mode-setting" aria-label="Auto skip answer review">
  <h3>Auto skip answer review</h3>
  {#if timing.autoContinueCorrect}<p>Correct answers use the auto-continue delay. Other reviews follow the setting below.</p>{/if}
  <div class="at-settings-segment" role="group" aria-label="Auto skip answer review">
    {#each REVIEW_SKIP_OPTIONS as option}<button type="button" aria-pressed={timing.reviewSkip === option.id} onclick={() => setLessonTiming(settings, { reviewSkip: option.id })}>{option.name}</button>{/each}
  </div>
</section>
