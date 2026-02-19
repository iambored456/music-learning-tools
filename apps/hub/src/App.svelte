<script lang="ts">
  import { appCards } from './lib/apps';
</script>

<main class="hub">
  <header class="hero">
    <p class="eyebrow">Quinn Fleming's</p>
    <h1>Amateur Music Learning Tools</h1>
    <p class="subhead">
      Explore interactive apps for hearing, seeing, and learning how music works - without needing
      to read standard music notation.
    </p>
  </header>

  <section class="cards" aria-label="Apps">
    {#each appCards as app, index}
      <article class="card" style={`--card-accent: ${app.accent}; --card-delay: ${index * 90}ms;`}>
        <div class="card-header">
          <h2>{app.name}</h2>
        </div>
        <a class="preview-link" href={app.href} aria-label={`Open ${app.name}`}>
          <div class="preview">
            <img
              src={app.preview}
              alt={`${app.name} preview`}
              loading="lazy"
              decoding="async"
              width="1200"
              height="900"
            />
          </div>
        </a>
        <p class="description">{app.description}</p>
        <div class="tags">
          {#each app.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
          <span class="status" aria-hidden="true"></span>
        </div>
        <a class="launch is-hidden" href={app.href}>
          Open
        </a>
      </article>
    {/each}
  </section>
</main>
