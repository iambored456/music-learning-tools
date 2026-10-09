<script lang="ts">
  import { onMount } from 'svelte';
  import { defaultAvatarAssets } from '@mlt/talking-avatar';

  import OutlineRow from './OutlineRow.svelte';
  import { topLevelOutline } from './outline';
  import { lessonProgress, lessonProgressKey } from './lessonProgress';

  let completedLessonCodes = $state<string[]>([]);

  onMount(() => {
    completedLessonCodes = lessonProgress.read();
    const syncProgress = (event: StorageEvent) => {
      if (event.key === lessonProgressKey || event.key === null) {
        completedLessonCodes = lessonProgress.read();
      }
    };
    window.addEventListener('storage', syncProgress);
    return () => window.removeEventListener('storage', syncProgress);
  });

  function clearProgress(): void {
    if (!window.confirm('Are you sure? This will erase your completed lesson progress.')) return;
    lessonProgress.clear();
    completedLessonCodes = [];
  }

  const hubHref = '../';
  const homeIconHref = new URL('../../grand-frequency-staff-ui/src/assets/home-icon.svg', import.meta.url).href;
</script>

<div id="amateur-music-theory-app" class="amt-app portal-app">
  <header class="hero">
    <a class="home-link home-link--corner" href={hubHref} aria-label="Back to home" title="Back to home">
      <img src={homeIconHref} alt="" class="home-link-icon" />
    </a>
    <div class="hero-copy">
      <div class="hero-title-group">
        <h1>Amateur Music Theory</h1>
        <img
          class="hero-avatar"
          src={defaultAvatarAssets.smile_wave}
          alt="Grammy smiling and waving"
        />
      </div>
    </div>
  </header>

  <section class="planner-shell" aria-label="Course outline">
    <div class="planner-outline-list">
      {#each topLevelOutline as row (row.id)}
        <OutlineRow row={row} {completedLessonCodes} />
      {/each}
    </div>
  </section>
  <button class="clear-progress" type="button" onclick={clearProgress}>Clear Progress</button>
</div>

<style>
  .portal-app {
    width: fit-content;
    max-width: min(900px, 100%);
    grid-template-columns: minmax(0, 1fr);
  }

  .hero,
  .planner-shell {
    min-width: 0;
  }

  .clear-progress {
    justify-self: end;
    padding: 0.4rem 0.75rem;
    border: 1px solid rgba(102, 75, 40, 0.24);
    border-radius: 999px;
    background: var(--amt-bg-soft);
    color: var(--amt-text);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }

  .clear-progress:hover {
    background: rgba(204, 91, 68, 0.14);
    border-color: var(--amt-accent-coral);
  }
</style>
