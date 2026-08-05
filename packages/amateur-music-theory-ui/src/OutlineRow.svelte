<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  import type { OutlineRow } from './outline';
  import { rowTypeLabels } from './outline';

  export let row: OutlineRow;
  export let depth = 0;
  let isExpanded = false;

  function getRowLabel(currentRow: OutlineRow): string {
    const baseLabel = rowTypeLabels[currentRow.type];
    return currentRow.code ? `${baseLabel} ${currentRow.code}` : baseLabel;
  }

  function isCollapsible(currentRow: OutlineRow): boolean {
    return (currentRow.type === 'course' || currentRow.type === 'strand') && Boolean(currentRow.children?.length);
  }

  function isLessonLink(currentRow: OutlineRow): boolean {
    return currentRow.type === 'lesson' && Boolean(currentRow.code);
  }
</script>

<div class="outline-row-node" style={`--outline-depth:${depth};`}>
  <article class={`outline-row-card row-type-${row.type}`}>
    <div class="outline-row-topline">
      <div class="outline-row-heading">
        <span class="outline-row-type">{getRowLabel(row)}</span>
        <h3>{row.title}</h3>
      </div>
      {#if isCollapsible(row)}
        <button
          class="outline-row-toggle"
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${row.title}` : `Expand ${row.title}`}
          aria-controls={`children-${row.id}`}
          onclick={() => {
            isExpanded = !isExpanded;
          }}
        >
          <span class="outline-row-chevron" class:is-expanded={isExpanded} aria-hidden="true"></span>
        </button>
      {:else if isLessonLink(row)}
        <a
          class="outline-row-open"
          href={`#/lesson/${row.code}`}
          aria-label={`Open Lesson ${row.code}: ${row.title}`}
        >
          Open
        </a>
      {/if}
    </div>

    {#if row.type === 'note'}
      <p>{row.body}</p>
    {/if}
  </article>

  {#if row.children?.length && (!isCollapsible(row) || isExpanded)}
    <div
      id={`children-${row.id}`}
      class="outline-row-children"
      role="list"
      aria-label={`${row.title} child rows`}
      transition:slide|local={{ duration: 190, easing: cubicOut }}
    >
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
    justify-content: space-between;
    gap: 0.52rem;
  }

  .outline-row-heading {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .outline-row-heading h3 {
    min-width: 0;
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

  .outline-row-card h3 {
    margin: 0;
    font-size: 1.08rem;
    line-height: 1.05;
    color: #1e2620;
  }

  .outline-row-card p {
    margin: 0;
    color: #475048;
    line-height: 1.45;
  }

  .outline-row-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border-radius: 999px;
    border: 1px solid rgba(30, 41, 50, 0.14);
    background: rgba(255, 255, 255, 0.78);
    color: #475048;
    font: inherit;
    font-size: 0.74rem;
    font-weight: 700;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .outline-row-toggle:hover,
  .outline-row-toggle:focus-visible {
    background: rgba(47, 141, 131, 0.14);
    border-color: rgba(47, 141, 131, 0.28);
    color: #17322d;
  }

  .outline-row-chevron {
    width: 0.6rem;
    height: 0.6rem;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg) translateY(-1px);
    transition: transform 0.19s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .outline-row-chevron.is-expanded {
    transform: rotate(-135deg) translateY(-1px);
  }

  .outline-row-open {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.22rem 0.68rem;
    border-radius: 999px;
    border: 1px solid rgba(47, 141, 131, 0.22);
    background: rgba(47, 141, 131, 0.14);
    color: #17463f;
    font-size: 0.74rem;
    font-weight: 800;
    text-decoration: none;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;
  }

  .outline-row-open:hover,
  .outline-row-open:focus-visible {
    border-color: rgba(47, 141, 131, 0.4);
    background: rgba(47, 141, 131, 0.22);
    transform: translateY(-1px);
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

  .row-type-course {
    background: linear-gradient(145deg, rgba(255, 251, 243, 0.96), rgba(248, 239, 221, 0.92));
    border-color: rgba(197, 123, 47, 0.26);
  }

  .row-type-course .outline-row-type {
    color: #7d4b17;
    background: rgba(197, 123, 47, 0.16);
    border-color: rgba(197, 123, 47, 0.28);
  }

  .row-type-strand {
    background: linear-gradient(145deg, rgba(247, 252, 251, 0.94), rgba(236, 248, 245, 0.9));
    border-color: rgba(47, 141, 131, 0.24);
  }

  .row-type-strand .outline-row-type {
    color: #145952;
    background: rgba(47, 141, 131, 0.15);
    border-color: rgba(47, 141, 131, 0.24);
  }

  .row-type-lesson .outline-row-type {
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
