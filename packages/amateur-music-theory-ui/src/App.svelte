<script lang="ts">
  type LessonStatus = 'in-progress' | 'planned';

  type Lesson = {
    id: string;
    title: string;
    summary: string;
    level: string;
    duration: string;
    status: LessonStatus;
    focus: string[];
  };

  const lessons: Lesson[] = [
    {
      id: 'interval-echoes',
      title: 'Interval Echoes',
      summary: 'Hear and identify directional interval motion before reading it in notation.',
      level: 'Beginner',
      duration: '8 min',
      status: 'in-progress',
      focus: ['Ear Training', 'Interval Shape', 'Call and Response'],
    },
    {
      id: 'rhythm-tiles',
      title: 'Rhythm Tiles',
      summary: 'Build and clap microbeat patterns, then map them into student notation blocks.',
      level: 'Beginner',
      duration: '10 min',
      status: 'planned',
      focus: ['Subdivision', 'Pulse', 'Pattern Memory'],
    },
    {
      id: 'tonic-compass',
      title: 'Tonic Compass',
      summary: 'Navigate tonic shifts and modal color by ear, then verify with visual guides.',
      level: 'Intermediate',
      duration: '12 min',
      status: 'planned',
      focus: ['Modes', 'Tonicization', 'Aural Center'],
    },
  ];

  let selectedLessonId: string | null = null;
  let selectedLesson: Lesson | null = null;

  $: selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  const hubHref = '../';

  function openLesson(lessonId: string): void {
    selectedLessonId = lessonId;
  }

  function backToMenu(): void {
    selectedLessonId = null;
  }
</script>

<div id="amateur-music-theory-app" class="amt-app">
  <header class="hero">
    <p class="eyebrow">Amateur Music Theory</p>
    <h1>Lesson Select</h1>
    <p class="subtitle">
      Choose a lesson path. This app is prepared for student-notation-powered learning modules.
    </p>
    <a class="hub-link" href={hubHref}>Back to Hub</a>
  </header>

  {#if selectedLesson}
    <section class="workspace" aria-live="polite">
      <p class="workspace-kicker">{selectedLesson.level} - {selectedLesson.duration}</p>
      <h2>{selectedLesson.title}</h2>
      <p>{selectedLesson.summary}</p>

      <div class="focus-list">
        {#each selectedLesson.focus as focusArea}
          <span>{focusArea}</span>
        {/each}
      </div>

      <div class="notice">
        <h3>Lesson workspace staging</h3>
        <p>
          The lesson shell is ready. Next step is wiring the interactive notation and exercise
          package flow for this lesson.
        </p>
      </div>

      <button class="back-button" onclick={backToMenu}>Back to Lesson Select</button>
    </section>
  {:else}
    <section class="lesson-grid" aria-label="Available lessons">
      {#each lessons as lesson}
        <article class="lesson-card">
          <p class="status {lesson.status}">
            {lesson.status === 'in-progress' ? 'In progress' : 'Planned'}
          </p>
          <h2>{lesson.title}</h2>
          <p>{lesson.summary}</p>
          <div class="meta">{lesson.level} - {lesson.duration}</div>
          <div class="focus-list">
            {#each lesson.focus as focusArea}
              <span>{focusArea}</span>
            {/each}
          </div>
          <button onclick={() => openLesson(lesson.id)}>
            {lesson.status === 'in-progress' ? 'Open lesson shell' : 'View roadmap'}
          </button>
        </article>
      {/each}
    </section>
  {/if}
</div>
