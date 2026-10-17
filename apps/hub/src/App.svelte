<script lang="ts">
  import { appCards } from './lib/apps';
</script>

<main class="hub">
  <header class="hero">
    <a
      class="hub-switch"
      href="https://iambored456.github.io/classroom-tools/"
      aria-label="Classroom Tools"
      title="Classroom Tools"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m16 3 5 5L8 21H3v-5L16 3Z" />
        <path d="m13 6 5 5M3 16l5 5" />
      </svg>
    </a>
    <p class="eyebrow">Quinn Fleming's</p>
    <h1>Amateur Music Learning Tools</h1>
    <p class="subhead">
      Learn how music works - without needing to read Western standard music notation.
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
