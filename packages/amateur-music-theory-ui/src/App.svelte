<script lang="ts">
  import OutlineRow from './OutlineRow.svelte';
  import { lessonOutline, rowTypeGroups } from './outline';

  const hubHref = '../';
</script>

<div id="amateur-music-theory-app" class="amt-app">
  <header class="hero">
    <p class="eyebrow">Amateur Music Theory</p>
    <h1>Lesson Builder Shell</h1>
    <p class="subtitle">
      Draft lesson architecture with nested row types before wiring any student-notation or
      playback logic.
    </p>
    <a class="hub-link" href={hubHref}>Back to Hub</a>
  </header>

  <section class="planner-shell" aria-labelledby="lesson-builder-title">
    <div class="planner-header">
      <p class="workspace-kicker">Placeholder lesson planner</p>
      <h2 id="lesson-builder-title">Lesson Title</h2>
      <p class="planner-subtitle">
        Lesson Summary
      </p>
    </div>

    <div class="planner-layout">
      <aside class="palette-panel" aria-label="Nested row type organization">
        <div class="palette-intro">
          <h3>Row Type Organization</h3>
          <p>
            Structure rows define the lesson frame. Teaching rows live inside those containers as
            nested prompts, exercises, and notes.
          </p>
        </div>

        <div class="palette-groups">
          {#each rowTypeGroups as group}
            <section class="palette-group">
              <h4>{group.label}</h4>
              <div class="palette-items">
                {#each group.items as item}
                  <article class={`palette-item row-type-${item.type}`}>
                    <div class="palette-item-topline">
                      <span class="palette-pill">{item.label}</span>
                    </div>
                    <p>{item.description}</p>
                  </article>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      </aside>

      <section class="outline-panel" aria-label="Lesson outline">
        <div class="outline-panel-header">
          <p class="outline-kicker">Nested lesson rows</p>
          <p class="outline-copy">
            Placeholder-only scaffolding. Replace these rows later with real lesson content and
            interactive modules.
          </p>
        </div>

        <OutlineRow row={lessonOutline} />
      </section>
    </div>
  </section>
</div>
