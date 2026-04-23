<script lang="ts">
  import type { LessonDefinition } from './lessons';
  import PitchLesson111HighLow from './PitchLesson111HighLow.svelte';

  export let lesson: LessonDefinition;
  export let currentStep = 1;
  export let isPlaying = true;
  export let volume = 72;
  export let actionSkipSignal = 0;
  export let segmentResetSignal = 0;

  $: currentSection = lesson.sections[currentStep - 1] ?? lesson.sections[0];
</script>

{#if currentSection}
  {#key `${currentSection.code}-${segmentResetSignal}`}
    {#if currentStep === 1}
      <PitchLesson111HighLow section={currentSection} {isPlaying} {volume} {actionSkipSignal} />
    {:else}
      <section class="scene-placeholder app-card">
        <p class="scene-placeholder-kicker">{currentSection.code}</p>
        <h2>{currentSection.label}</h2>
        <p>{currentSection.description}</p>
        <p class="scene-placeholder-note">
          This subsection has not been staged yet. The lesson shell, progress state, and Grammy avatar
          support are ready for the next build pass.
        </p>
      </section>
    {/if}
  {/key}
{/if}

<style>
  .scene-placeholder {
    display: grid;
    gap: 0.75rem;
    padding: 1rem 1.1rem;
  }

  .scene-placeholder-kicker {
    margin: 0;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--amt-muted);
  }

  .scene-placeholder h2 {
    margin: 0;
    font-size: clamp(1.4rem, 3vw, 2rem);
    line-height: 1.08;
    color: #1f241f;
  }

  .scene-placeholder p {
    margin: 0;
    line-height: 1.5;
    color: #3f4641;
  }

  .scene-placeholder-note {
    color: #5d655d;
  }
</style>
