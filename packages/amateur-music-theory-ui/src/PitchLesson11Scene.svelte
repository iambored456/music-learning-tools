<script lang="ts">
  import type { LessonDefinition, LessonSection } from './lessons';
  import PitchLesson112HighLow from './PitchLesson112HighLow.svelte';
  import PitchLesson111LinesSpaces from './PitchLesson111LinesSpaces.svelte';
  import PitchLesson114MatchPitch from './PitchLesson114MatchPitch.svelte';

  export let lesson: LessonDefinition;
  export let currentStep = 1;
  export let isPlaying = true;
  export let volume = 72;
  export let actionSkipSignal = 0;
  export let segmentResetSignal = 0;
  export let onMusicalIntroComplete: (() => void) | undefined = undefined;
  export let onSectionComplete: (() => void) | undefined = undefined;
  export let onFinalSectionComplete: (() => void) | undefined = undefined;
  export let onLessonOutroComplete: (() => void) | undefined = undefined;

  let finalOutroActive = false;
  let lastStep = currentStep;

  $: if (currentStep !== lastStep) {
    lastStep = currentStep;
    if (currentStep !== 4) finalOutroActive = false;
  }

  function startFinalOutro(): void {
    onFinalSectionComplete?.();
    finalOutroActive = true;
  }

  $: musicalIntroSection = {
    id: 'musical-introduction',
    code: `${lesson.code}.0`,
    label: 'Musical introduction',
    description: 'Listen to the opening score before beginning the lesson subsections.',
  } satisfies LessonSection;
  $: currentSection = currentStep === 0
    ? musicalIntroSection
    : lesson.sections[currentStep - 1] ?? lesson.sections[0];
</script>

{#if currentSection}
  {#key `${currentStep}-${currentSection.code}-${segmentResetSignal}`}
    {#if currentStep === 0}
      <PitchLesson112HighLow
        section={currentSection}
        phase="musical-intro"
        {isPlaying}
        {volume}
        {actionSkipSignal}
        {onMusicalIntroComplete}
      />
    {:else if currentStep === 1}
      <PitchLesson111LinesSpaces
        section={currentSection}
        {isPlaying}
        {volume}
        {actionSkipSignal}
        onComplete={onSectionComplete}
      />
    {:else if currentStep === 2}
      <PitchLesson112HighLow
        section={currentSection}
        phase="placement"
        {isPlaying}
        {volume}
        {actionSkipSignal}
        onPlacementComplete={onSectionComplete}
      />
    {:else if currentStep === 3}
      <PitchLesson112HighLow
        section={currentSection}
        phase="comparison"
        {isPlaying}
        {volume}
        {actionSkipSignal}
        onComparisonComplete={onSectionComplete}
      />
    {:else if currentStep === 4}
      {#if finalOutroActive}
        <PitchLesson112HighLow
          section={currentSection}
          phase="musical-outro"
          {isPlaying}
          {volume}
          {actionSkipSignal}
          onMusicalOutroComplete={onLessonOutroComplete}
        />
      {:else}
        <PitchLesson114MatchPitch
          section={currentSection}
          {isPlaying}
          {volume}
          onComplete={startFinalOutro}
        />
      {/if}
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
