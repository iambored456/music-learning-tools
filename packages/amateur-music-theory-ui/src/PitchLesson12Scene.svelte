<script lang="ts">
  import PitchLesson12Section from './PitchLesson12Section.svelte';
  import type { LessonDefinition } from './lessons';

  type Props = {
    lesson: LessonDefinition;
    currentStep?: number;
    isPlaying?: boolean;
    volume?: number;
    onSectionComplete?: () => void;
    onLessonComplete?: () => void;
  };

  let {
    lesson,
    currentStep = 1,
    isPlaying = true,
    volume = 72,
    onSectionComplete,
    onLessonComplete,
  }: Props = $props();

  const currentSection = $derived(lesson.sections[currentStep - 1] ?? lesson.sections[0]);
  const isFinalSection = $derived(currentStep === lesson.sections.length);
</script>

{#if currentSection}
  {#key `${currentStep}-${currentSection.code}`}
    <PitchLesson12Section
      section={currentSection}
      {isPlaying}
      {volume}
      onComplete={isFinalSection ? onLessonComplete : onSectionComplete}
    />
  {/key}
{/if}
