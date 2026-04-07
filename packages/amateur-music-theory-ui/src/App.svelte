<script lang="ts">
  import { onMount } from 'svelte';
  import LessonCanvas from './LessonCanvas.svelte';
  import LessonPortal from './LessonPortal.svelte';

  type Route = { type: 'portal' } | { type: 'lesson'; lessonCode: string };

  let route: Route = { type: 'portal' };

  function parseHash(hash: string): Route {
    const normalized = hash.replace(/^#/, '');

    if (!normalized || normalized === '/' || normalized === '/portal' || normalized === 'portal') {
      return { type: 'portal' };
    }

    const lessonMatch = normalized.match(/^\/?lesson\/([^/]+)$/);
    if (lessonMatch) {
      return { type: 'lesson', lessonCode: decodeURIComponent(lessonMatch[1]) };
    }

    return { type: 'portal' };
  }

  onMount(() => {
    const syncRoute = () => {
      route = parseHash(window.location.hash);
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
    };
  });
</script>

{#if route.type === 'lesson'}
  <LessonCanvas lessonCode={route.lessonCode} />
{:else}
  <LessonPortal />
{/if}
