<script lang="ts">
  import PitchLessonScene from './PitchLessonScene.svelte';
  import PitchLesson13Section from './PitchLesson13Section.svelte';
  import type { LessonSceneProps } from './lessonScene';
  let props: LessonSceneProps = $props();
</script>

<PitchLessonScene {...props} sectionComponent={PitchLesson13Section} />
