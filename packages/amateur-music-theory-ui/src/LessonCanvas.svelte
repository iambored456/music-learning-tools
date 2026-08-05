<script lang="ts">
  import { onDestroy } from 'svelte';
  import LessonProgress from './LessonProgress.svelte';
  import PitchLesson11Scene from './PitchLesson11Scene.svelte';
  import PitchLesson12Scene from './PitchLesson12Scene.svelte';
  import {
    cancelLessonAvatarSpeech,
    disposeLessonAvatar,
    pauseLessonAvatar,
    resumeLessonAvatar,
    setLessonAvatarVolume,
  } from './lessonAvatar';
  import { getLessonDefinition } from './lessons';

  export let lessonCode: string;

  const portalHref = '#/portal';
  const homeIconHref = new URL('../../grand-frequency-staff-ui/src/assets/home-icon.svg', import.meta.url).href;
  const volumeIconHref = new URL('../../student-notation-ui/public/assets/icons/volume.svg', import.meta.url).href;
  const playIconHref = new URL('../../student-notation-ui/public/assets/icons/play.svg', import.meta.url).href;
  const pauseIconHref = new URL('../../student-notation-ui/public/assets/icons/pause.svg', import.meta.url).href;
  let volumeOpen = false;
  let volume = 72;
  let isPlaying = true;
  let currentStep = 1;
  let lastLessonCode = '';
  let actionSkipSignal = 0;
  let segmentResetSignal = 0;
  let finalSectionComplete = false;
  let lessonOutroComplete = false;

  $: lesson = getLessonDefinition(lessonCode);
  $: totalSteps = lesson?.sections.length ?? 0;
  $: currentSection = lesson ? lesson.sections[currentStep - 1] : null;
  $: isShellOnlyCanvas = lesson?.canvasLayout === 'shell-only';
  $: hasCustomScene = lesson?.code === '1.1' || lesson?.code === '1.2';
  $: if (lesson && lesson.code !== lastLessonCode) {
    lastLessonCode = lesson.code;
    currentStep = lesson.code === '1.1' ? 0 : 1;
    volumeOpen = false;
    isPlaying = true;
    actionSkipSignal = 0;
    segmentResetSignal = 0;
    finalSectionComplete = false;
    lessonOutroComplete = false;
  }
  $: setLessonAvatarVolume(volume);

  function togglePlayback(): void {
    isPlaying = !isPlaying;
    if (isPlaying) {
      resumeLessonAvatar();
    } else {
      pauseLessonAvatar();
    }
  }

  function selectStep(step: number): void {
    if (!lesson) return;
    const minimumStep = lesson.code === '1.1' ? 0 : 1;
    const nextStep = Math.max(minimumStep, Math.min(step, lesson.sections.length));
    if (nextStep === currentStep) return;
    currentStep = nextStep;
    actionSkipSignal = 0;
  }

  function goToPreviousStep(): void {
    selectStep(currentStep - 1);
  }

  function goToNextStep(): void {
    selectStep(currentStep + 1);
  }

  function handleNextControl(): void {
    goToNextStep();
  }

  function completeMusicalIntro(): void {
    if (currentStep === 0) selectStep(1);
  }

  function completeCurrentSection(): void {
    if (!lesson || currentStep < 1 || currentStep >= lesson.sections.length) return;
    selectStep(currentStep + 1);
  }

  function completeFinalSection(): void {
    if (!lesson || currentStep !== lesson.sections.length) return;
    finalSectionComplete = true;
  }

  function completeLessonOutro(): void {
    finalSectionComplete = true;
    lessonOutroComplete = true;
  }

  function handlePreviousControl(): void {
    goToPreviousStep();
  }

  $: if (lessonCode) {
    cancelLessonAvatarSpeech();
  }

  onDestroy(() => {
    disposeLessonAvatar();
  });
</script>

<div class="amt-app lesson-canvas-app">
  <header class="canvas-toolbar app-card">
    <div class="canvas-toolbar-actions">
      <a class="home-link" href={portalHref} aria-label="Back to lesson portal" title="Back to lesson portal">
        <img src={homeIconHref} alt="" class="home-link-icon" />
      </a>

      <div class="volume-control">
        <button
          class="canvas-icon-button"
          type="button"
          aria-expanded={volumeOpen}
          aria-controls="lesson-volume-slider"
          aria-label="Open volume control"
          onclick={() => {
            volumeOpen = !volumeOpen;
          }}
        >
          <img src={volumeIconHref} alt="" class="canvas-icon-image" />
        </button>

        {#if volumeOpen}
          <div id="lesson-volume-slider" class="volume-slider-panel">
            <label class="sr-only" for="lesson-volume-range">Lesson volume</label>
            <input id="lesson-volume-range" type="range" min="0" max="100" bind:value={volume} />
          </div>
        {/if}
      </div>

      <button
        class="canvas-icon-button"
        type="button"
        aria-pressed={!isPlaying}
        aria-label={isPlaying ? 'Pause lesson playback' : 'Resume lesson playback'}
        onclick={togglePlayback}
      >
        <img src={isPlaying ? pauseIconHref : playIconHref} alt="" class="canvas-icon-image" />
      </button>
    </div>

    {#if lesson}
      <div class="canvas-toolbar-meta">
        <div class="canvas-toolbar-title-card">
          {#if isShellOnlyCanvas}
            <h1 class="canvas-toolbar-title-text">{lesson.code} - {lesson.title}</h1>
          {:else}
            <p class="canvas-toolbar-title-text">{lesson.code} - {lesson.title}</p>
          {/if}
        </div>

          <div class="canvas-toolbar-progress">
          {#key currentStep}
            <LessonProgress
              steps={lesson.sections}
              currentStep={currentStep}
              completedCurrentStep={finalSectionComplete && currentStep === totalSteps}
              onSelectStep={selectStep}
            />
          {/key}
        </div>

        {#if hasCustomScene}
          <div class="canvas-subsection-controls" role="group" aria-label="Lesson segment controls">
            <button
              class={`canvas-subsection-arrow ${currentStep > 0 ? 'is-enabled' : ''}`}
              type="button"
              aria-label="Previous lesson segment"
              title="Previous lesson segment"
              disabled={currentStep <= 0}
              onclick={handlePreviousControl}
            >
              <span class="canvas-arrow-icon canvas-arrow-icon--left" aria-hidden="true"></span>
            </button>

            <button
              class={`canvas-subsection-arrow ${currentStep < totalSteps ? 'is-enabled' : ''}`}
              type="button"
              aria-label={currentStep === 0 ? 'Skip musical introduction' : 'Next lesson segment'}
              title={currentStep === 0 ? 'Skip musical introduction' : 'Next lesson segment'}
              disabled={currentStep >= totalSteps}
              onclick={handleNextControl}
            >
              <span class="canvas-arrow-icon canvas-arrow-icon--right" aria-hidden="true"></span>
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </header>

  {#if lesson?.code === '1.1'}
    <PitchLesson11Scene
      {lesson}
      {currentStep}
      {isPlaying}
      {volume}
      {actionSkipSignal}
      {segmentResetSignal}
      onMusicalIntroComplete={completeMusicalIntro}
      onSectionComplete={completeCurrentSection}
      onFinalSectionComplete={completeFinalSection}
      onLessonOutroComplete={completeLessonOutro}
    />
  {:else if lesson?.code === '1.2'}
    <PitchLesson12Scene
      {lesson}
      {currentStep}
      {isPlaying}
      {volume}
      onSectionComplete={completeCurrentSection}
      onLessonComplete={completeLessonOutro}
    />
  {:else if lesson && !isShellOnlyCanvas}
    <section class="canvas-title-card app-card">
      <p class="canvas-title-kicker">Lesson {lesson.code} | {lesson.trail.join(' / ')}</p>
      <h1>{lesson.title}</h1>
      <p class="canvas-title-copy">{lesson.body}</p>
    </section>

    <section class="canvas-stage-card app-card">
      <div class="canvas-stage-header">
        <p class="canvas-stage-kicker">Current subsection</p>
        <h2>{currentSection?.label}</h2>
        <p>{currentSection?.description}</p>
      </div>

      <div class={`canvas-stage-surface ${isPlaying ? '' : 'is-paused'}`} aria-live="polite">
        <div class="canvas-stage-surface-copy">
          <p class="canvas-stage-note">Shared lesson canvas surface</p>
          <p>
            This area is where lesson-specific animation, avatar timing, and interactive components
            will mount for Lesson {lesson.code}.
          </p>
          <p>
            Transport state is currently <strong>{isPlaying ? 'playing' : 'paused'}</strong> at
            volume <strong>{volume}%</strong>.
          </p>
        </div>

        {#if !isPlaying}
          <div class="canvas-paused-overlay">
            <strong>Lesson paused</strong>
            <span>Future scene components should suspend timers, speech, and animation here.</span>
          </div>
        {/if}
      </div>

      <div class="canvas-stage-footer">
        <button
          class="canvas-nav-button"
          type="button"
          disabled={currentStep <= 1}
          onclick={goToPreviousStep}
        >
          Previous subsection
        </button>

        <button
          class="canvas-nav-button canvas-nav-button--primary"
          type="button"
          disabled={currentStep >= totalSteps}
          onclick={goToNextStep}
        >
          Next subsection
        </button>
      </div>
    </section>
  {:else if !lesson}
    <section class="canvas-stage-card app-card">
      <div class="canvas-stage-header">
        <p class="canvas-stage-kicker">Lesson unavailable</p>
        <h1>Lesson not found</h1>
        <p>This lesson route does not match a lesson currently registered in the portal.</p>
      </div>
      <div class="canvas-stage-footer">
        <a class="canvas-nav-button canvas-nav-button--primary canvas-nav-link" href={portalHref}>
          Return to Lesson Portal
        </a>
      </div>
    </section>
  {/if}

  {#if lessonOutroComplete}
    <div class="lesson-complete-backdrop" role="presentation">
      <div
        class="lesson-complete-dialog app-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-complete-title"
      >
        <p class="lesson-complete-kicker">Lesson complete</p>
        <h2 id="lesson-complete-title">Bravo!</h2>
        <p>You completed Lesson {lesson?.code}.</p>
        <a class="canvas-nav-button canvas-nav-button--primary canvas-nav-link" href={portalHref}>
          Return to Amateur Music Theory
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  .lesson-canvas-app {
    gap: 1rem;
  }

  .app-card {
    border: 1px solid rgba(102, 75, 40, 0.18);
    border-radius: 22px;
    box-shadow: var(--amt-shadow);
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.84), rgba(248, 241, 229, 0.86));
  }

  .canvas-toolbar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.9rem;
    align-items: center;
    padding: 0.9rem 1rem;
  }

  .canvas-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .canvas-toolbar-progress {
    min-width: 0;
  }

  .canvas-subsection-controls {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 0.34rem;
  }

  .canvas-subsection-arrow {
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba(84, 65, 39, 0.1);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.28);
    color: rgba(49, 65, 58, 0.54);
    cursor: pointer;
    opacity: 0.46;
    transition:
      opacity 0.15s ease,
      color 0.15s ease,
      background-color 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
  }

  .canvas-subsection-arrow:hover:not(:disabled),
  .canvas-subsection-arrow:focus-visible {
    opacity: 0.82;
    color: rgba(49, 65, 58, 0.82);
    border-color: rgba(47, 141, 131, 0.22);
    background: rgba(255, 255, 255, 0.48);
  }

  .canvas-subsection-arrow.is-enabled {
    opacity: 0.9;
    color: rgba(38, 92, 80, 0.9);
    border-color: rgba(47, 141, 131, 0.28);
    background: rgba(47, 141, 131, 0.12);
  }

  .canvas-subsection-arrow.is-enabled:hover,
  .canvas-subsection-arrow.is-enabled:focus-visible {
    opacity: 1;
    color: rgba(30, 76, 66, 1);
    border-color: rgba(47, 141, 131, 0.5);
    background: rgba(47, 141, 131, 0.2);
  }

  .canvas-subsection-arrow:active:not(:disabled) {
    transform: translateY(1px);
  }

  .canvas-subsection-arrow:disabled {
    opacity: 0.24;
    cursor: default;
  }

  .canvas-arrow-icon {
    width: 0.58rem;
    height: 0.58rem;
    display: block;
    border-block-start: 2px solid currentColor;
    border-inline-start: 2px solid currentColor;
  }

  .canvas-arrow-icon--left {
    transform: translateX(0.12rem) rotate(-45deg);
  }

  .canvas-arrow-icon--right {
    transform: translateX(-0.12rem) rotate(135deg);
  }

  .canvas-toolbar-meta {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.8rem;
  }

  .canvas-toolbar-title-card {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    padding: 0.62rem 0.9rem;
    border-radius: 14px;
    border: 1px solid rgba(84, 65, 39, 0.14);
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 10px 22px rgba(39, 28, 18, 0.08);
  }

  .canvas-toolbar-title-text {
    min-width: 0;
    margin: 0;
    font-size: 1.02rem;
    line-height: 1.15;
    color: #1f241f;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .canvas-icon-button {
    width: 2.35rem;
    height: 2.35rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid rgba(84, 65, 39, 0.14);
    background: rgba(255, 255, 255, 0.78);
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
  }

  .canvas-icon-button:hover,
  .canvas-icon-button:focus-visible {
    border-color: rgba(47, 141, 131, 0.42);
    background: rgba(47, 141, 131, 0.14);
  }

  .canvas-icon-button:active {
    transform: translateY(1px);
  }

  .canvas-icon-image {
    width: 1rem;
    height: 1rem;
    display: block;
    filter: sepia(9%) saturate(655%) hue-rotate(122deg) brightness(92%) contrast(90%);
  }

  .volume-control {
    position: relative;
  }

  .volume-slider-panel {
    position: absolute;
    top: calc(100% + 0.45rem);
    left: 0;
    width: 11rem;
    padding: 0.7rem 0.8rem;
    border-radius: 14px;
    border: 1px solid rgba(84, 65, 39, 0.14);
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 18px 36px rgba(39, 28, 18, 0.12);
    z-index: 2;
  }

  .volume-slider-panel input {
    width: 100%;
    margin: 0;
  }

  .canvas-title-card {
    padding: 1rem 1.1rem;
  }

  .canvas-title-kicker,
  .canvas-stage-kicker {
    margin: 0 0 0.35rem;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--amt-muted);
  }

  .canvas-title-card h1,
  .canvas-stage-header h2,
  .canvas-stage-header h1 {
    margin: 0;
    line-height: 1.05;
    color: #1f241f;
  }

  .canvas-title-card h1 {
    font-size: clamp(1.8rem, 4vw, 2.8rem);
  }

  .canvas-stage-header h2,
  .canvas-stage-header h1 {
    font-size: clamp(1.35rem, 3vw, 2rem);
  }

  .canvas-title-copy,
  .canvas-stage-header p,
  .canvas-stage-surface-copy p {
    margin: 0;
    color: #3f4641;
    line-height: 1.5;
  }

  .canvas-title-card,
  .canvas-stage-card {
    display: grid;
    gap: 0.8rem;
  }

  .canvas-stage-card {
    padding: 1rem 1.1rem;
  }

  .canvas-stage-header {
    display: grid;
    gap: 0.35rem;
  }

  .canvas-stage-surface {
    position: relative;
    min-height: 20rem;
    display: grid;
    place-items: center;
    padding: 1.2rem;
    border-radius: 18px;
    border: 1px dashed rgba(84, 65, 39, 0.2);
    background:
      radial-gradient(440px 220px at 12% 0%, rgba(201, 90, 77, 0.1), transparent 65%),
      radial-gradient(420px 220px at 100% 10%, rgba(47, 141, 131, 0.1), transparent 64%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(249, 244, 235, 0.92));
    overflow: hidden;
  }

  .canvas-stage-surface.is-paused {
    opacity: 0.95;
  }

  .canvas-stage-surface-copy {
    max-width: 44rem;
    display: grid;
    gap: 0.6rem;
    text-align: center;
  }

  .canvas-stage-note {
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--amt-muted);
  }

  .canvas-paused-overlay {
    position: absolute;
    inset: auto 1rem 1rem auto;
    max-width: 20rem;
    display: grid;
    gap: 0.2rem;
    padding: 0.8rem 0.9rem;
    border-radius: 14px;
    border: 1px solid rgba(201, 90, 77, 0.26);
    background: rgba(255, 248, 246, 0.94);
    box-shadow: 0 16px 32px rgba(39, 28, 18, 0.1);
  }

  .canvas-paused-overlay strong {
    color: #9a3f36;
  }

  .canvas-paused-overlay span {
    color: #5f5550;
    line-height: 1.45;
  }

  .canvas-stage-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.65rem;
  }

  .canvas-nav-button,
  .canvas-nav-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.6rem;
    padding: 0.65rem 0.95rem;
    border-radius: 999px;
    border: 1px solid rgba(84, 65, 39, 0.14);
    background: rgba(255, 255, 255, 0.82);
    color: #31413a;
    font: inherit;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;
  }

  .canvas-nav-button:hover:not(:disabled),
  .canvas-nav-button:focus-visible,
  .canvas-nav-link:hover,
  .canvas-nav-link:focus-visible {
    border-color: rgba(47, 141, 131, 0.42);
    background: rgba(47, 141, 131, 0.14);
  }

  .canvas-nav-button--primary,
  .canvas-nav-link {
    background: rgba(47, 141, 131, 0.14);
    color: #17463f;
  }

  .canvas-nav-button:active:not(:disabled),
  .canvas-nav-link:active {
    transform: translateY(1px);
  }

  .canvas-nav-button:disabled {
    opacity: 0.48;
    cursor: default;
  }

  .lesson-complete-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(31, 36, 31, 0.42);
    backdrop-filter: blur(4px);
  }

  .lesson-complete-dialog {
    width: min(28rem, 100%);
    display: grid;
    justify-items: center;
    gap: 0.8rem;
    padding: 1.4rem;
    text-align: center;
  }

  .lesson-complete-kicker,
  .lesson-complete-dialog p {
    margin: 0;
  }

  .lesson-complete-kicker {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--amt-muted);
  }

  .lesson-complete-dialog h2 {
    margin: 0;
    font-size: clamp(1.7rem, 4vw, 2.5rem);
    color: #1f241f;
  }

  .lesson-complete-dialog p:not(.lesson-complete-kicker) {
    color: #3f4641;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 900px) {
    .canvas-toolbar {
      grid-template-columns: 1fr;
    }

    .canvas-toolbar-meta {
      justify-content: flex-start;
    }
  }

  @media (max-width: 720px) {
    .lesson-canvas-app {
      gap: 0.7rem;
    }

    .app-card {
      border-radius: 18px;
    }

    .canvas-toolbar,
    .canvas-title-card,
    .canvas-stage-card {
      padding: 0.85rem;
    }

    .canvas-toolbar-meta {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.5rem;
    }

    .canvas-toolbar-title-card {
      width: 100%;
      max-width: 100%;
      grid-column: 1 / -1;
      padding: 0.5rem 0.7rem;
    }

    .canvas-toolbar-progress {
      width: 100%;
      min-width: 0;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
    }

    .canvas-subsection-controls {
      align-self: center;
    }

    .canvas-icon-button,
    .canvas-toolbar .home-link {
      width: 2.75rem;
      height: 2.75rem;
    }

    .canvas-subsection-arrow {
      width: 2.4rem;
      height: 2.4rem;
    }

    .canvas-stage-surface {
      min-height: 16rem;
      padding: 1rem;
    }

    .canvas-stage-footer {
      justify-content: stretch;
    }

    .canvas-nav-button,
    .canvas-nav-link {
      flex: 1 1 100%;
    }
  }

  @media (max-width: 420px) {
    .canvas-toolbar,
    .canvas-title-card,
    .canvas-stage-card {
      padding: 0.65rem;
    }

    .canvas-toolbar-actions {
      gap: 0.45rem;
    }
  }
</style>
