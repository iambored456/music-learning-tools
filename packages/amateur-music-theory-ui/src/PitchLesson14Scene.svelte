<script lang="ts">
  import PitchLessonScene from './PitchLessonScene.svelte';
  import PitchLesson14Section from './PitchLesson14Section.svelte';
  import type { LessonSceneProps } from './lessonScene';
  let props: LessonSceneProps = $props();
  const section = $derived(props.lesson.sections[(props.currentStep ?? 1) - 1]);
  const sectionKey = $derived(`${section && ['scale-introduction', 'seven-notes'].includes(section.id)
    ? 'scale-opening' : section && ['build-scale', 'build-scale-f'].includes(section.id)
      ? 'scale-building' : section?.code}-${props.resetSignal ?? 0}`);
</script>

<PitchLessonScene {...props} {sectionKey} sectionComponent={PitchLesson14Section} />
