<script lang="ts">
  import type { OutlineRow } from './outline';
  import { rowTypeLabels } from './outline';

  export let row: OutlineRow;
  export let depth = 0;
</script>

<div class="outline-row-node" style={`--outline-depth:${depth};`}>
  <article class={`outline-row-card row-type-${row.type}`}>
    <div class="outline-row-topline">
      <span class="outline-row-type">{rowTypeLabels[row.type]}</span>
      {#if row.meta}
        <span class="outline-row-meta">{row.meta}</span>
      {/if}
    </div>

    <h3>{row.title}</h3>
    <p>{row.body}</p>

    {#if row.placeholders?.length}
      <div class="outline-row-placeholders">
        {#each row.placeholders as placeholder}
          <span>{placeholder}</span>
        {/each}
      </div>
    {/if}
  </article>

  {#if row.children?.length}
    <div class="outline-row-children" role="list" aria-label={`${row.title} child rows`}>
      {#each row.children as child (child.id)}
        <div class="outline-row-child" role="listitem">
          <svelte:self row={child} depth={depth + 1} />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .outline-row-node {
    position: relative;
    padding-left: calc(var(--outline-depth) * 1.15rem);
  }

  .outline-row-card {
    display: grid;
    gap: 0.58rem;
    padding: 0.92rem 0.98rem;
    border-radius: 16px;
    border: 1px solid rgba(67, 52, 31, 0.16);
    background: rgba(255, 255, 255, 0.84);
    box-shadow: 0 14px 32px rgba(53, 39, 23, 0.09);
  }

  .outline-row-topline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.52rem;
  }

  .outline-row-type {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.18rem 0.5rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #17322d;
    background: rgba(47, 141, 131, 0.16);
    border: 1px solid rgba(47, 141, 131, 0.26);
  }

  .outline-row-meta {
    color: #5c625d;
    font-size: 0.76rem;
    font-weight: 700;
  }

  .outline-row-card h3 {
    margin: 0;
    font-family: 'Fraunces', serif;
    font-size: 1.08rem;
    line-height: 1.05;
    color: #1e2620;
  }

  .outline-row-card p {
    margin: 0;
    color: #475048;
    line-height: 1.45;
  }

  .outline-row-placeholders {
    display: flex;
    flex-wrap: wrap;
    gap: 0.46rem;
  }

  .outline-row-placeholders span {
    padding: 0.24rem 0.54rem;
    border-radius: 999px;
    font-size: 0.74rem;
    color: #475048;
    background: rgba(30, 41, 50, 0.06);
    border: 1px dashed rgba(30, 41, 50, 0.18);
  }

  .outline-row-children {
    position: relative;
    display: grid;
    gap: 0.7rem;
    margin-top: 0.7rem;
    padding-left: 1.2rem;
  }

  .outline-row-children::before {
    content: '';
    position: absolute;
    left: 0.4rem;
    top: 0.15rem;
    bottom: 0.5rem;
    width: 1px;
    background: linear-gradient(180deg, rgba(95, 102, 95, 0.34), rgba(95, 102, 95, 0.12));
  }

  .outline-row-child {
    position: relative;
  }

  .outline-row-child::before {
    content: '';
    position: absolute;
    top: 1.15rem;
    left: -0.8rem;
    width: 0.8rem;
    height: 1px;
    background: rgba(95, 102, 95, 0.3);
  }

  .row-type-lesson {
    background: linear-gradient(145deg, rgba(255, 251, 243, 0.96), rgba(248, 239, 221, 0.92));
    border-color: rgba(197, 123, 47, 0.26);
  }

  .row-type-lesson .outline-row-type {
    color: #7d4b17;
    background: rgba(197, 123, 47, 0.16);
    border-color: rgba(197, 123, 47, 0.28);
  }

  .row-type-unit {
    background: linear-gradient(145deg, rgba(247, 252, 251, 0.94), rgba(236, 248, 245, 0.9));
    border-color: rgba(47, 141, 131, 0.24);
  }

  .row-type-section {
    background: rgba(255, 255, 255, 0.86);
  }

  .row-type-concept .outline-row-type {
    color: #12475a;
    background: rgba(55, 123, 165, 0.15);
    border-color: rgba(55, 123, 165, 0.26);
  }

  .row-type-exercise .outline-row-type {
    color: #7a3f18;
    background: rgba(204, 91, 68, 0.14);
    border-color: rgba(204, 91, 68, 0.26);
  }

  .row-type-note .outline-row-type {
    color: #4e4c1b;
    background: rgba(154, 140, 51, 0.14);
    border-color: rgba(154, 140, 51, 0.24);
  }

  @media (max-width: 720px) {
    .outline-row-node {
      padding-left: calc(var(--outline-depth) * 0.8rem);
    }

    .outline-row-card {
      padding: 0.82rem 0.86rem;
    }

    .outline-row-children {
      padding-left: 0.9rem;
    }

    .outline-row-child::before {
      left: -0.62rem;
      width: 0.62rem;
    }
  }
</style>
