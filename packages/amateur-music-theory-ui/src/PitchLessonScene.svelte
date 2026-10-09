<script lang="ts">
  import { onDestroy, onMount, type Component } from 'svelte';
  import type { LessonSceneProps, LessonSectionProps } from './lessonScene';

  let { lesson, currentStep = 1, isPlaying = true, volume = 72, resetSignal = 0,
    onSectionComplete, onLessonComplete, sectionComponent: Section, sectionKey }: LessonSceneProps & {
      sectionComponent: Component<LessonSectionProps>;
      sectionKey?: string;
    } = $props();
  let context: AudioContext | null = null;
  let disposed = false;
  const section = $derived(lesson.sections[currentStep - 1]);

  async function ensureAudioContext(): Promise<AudioContext | null> {
    if (disposed) return null;
    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume().catch(() => {});
    return !disposed && context.state === 'running' ? context : null;
  }
  onMount(() => {
    const unlock = () => { if (context?.state === 'suspended') void context.resume().catch(() => {}); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  });
  onDestroy(() => {
    disposed = true;
    if (context && context.state !== 'closed') void context.close();
  });
</script>

{#if section}
  {#key sectionKey ?? `${section.code}-${resetSignal}`}
    <Section {section} {isPlaying} {volume} {ensureAudioContext}
      onComplete={currentStep === lesson.sections.length ? onLessonComplete : onSectionComplete} />
  {/key}
{/if}
