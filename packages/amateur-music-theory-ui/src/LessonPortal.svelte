<script lang="ts">
  import { defaultAvatarAssets } from '@mlt/talking-avatar';

  import OutlineRow from './OutlineRow.svelte';
  import { topLevelOutline } from './outline';

  const hubHref = '../';
  const homeIconHref = new URL('../../grand-frequency-staff-ui/src/assets/home-icon.svg', import.meta.url).href;
</script>

<div id="amateur-music-theory-app" class="amt-app">
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
        <OutlineRow row={row} />
      {/each}
    </div>
  </section>
</div>
