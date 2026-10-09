<script lang="ts">
  import { untrack } from 'svelte';
  import { lessonScreenSlide } from '@mlt/lesson-kit';
  import type { IntervalDistance } from './lesson13Intervals';

  let { level = 0, distances, activeDistance = null, paused = false, enterFromLeft = false }: {
    level?: IntervalDistance;
    distances?: readonly IntervalDistance[];
    activeDistance?: IntervalDistance | null;
    paused?: boolean;
    enterFromLeft?: boolean;
  } = $props();
  const visibleDistances = $derived(distances ?? Array.from({ length: level + 1 }, (_, index) => index));
  const initialDistances = untrack(() => new Set(visibleDistances));
  const categories = [
    { family: '', entries: [{ distance: 12, label: 'octave' }] },
    { family: '7th', entries: [{ distance: 11, label: 'major 7th' }, { distance: 10, label: 'minor 7th' }] },
    { family: '6th', entries: [{ distance: 9, label: 'major 6th' }, { distance: 8, label: 'minor 6th' }] },
    { family: '', entries: [{ distance: 7, label: '5th' }] },
    { family: '', entries: [{ distance: 6, label: 'tritone' }] },
    { family: '', entries: [{ distance: 5, label: '4th' }] },
    { family: '3rd', entries: [{ distance: 4, label: 'major 3rd' }, { distance: 3, label: 'minor 3rd' }] },
    { family: '2nd', entries: [{ distance: 2, label: 'major 2nd' }, { distance: 1, label: 'minor 2nd' }] },
    { family: '', entries: [{ distance: 0, label: 'unison' }] },
  ] as const;
  const groups = $derived(categories.map(group => ({ family: group.family,
    entries: group.entries.filter(entry => visibleDistances.includes(entry.distance)) })).filter(group => group.entries.length));
</script>

<div class="chart-space" use:lessonScreenSlide={{ direction: enterFromLeft ? 'enter-left' : null, paused }}>
  <div class="interval-chart" role="table" aria-label="Interval distances" aria-colcount="3" aria-rowcount={visibleDistances.length + 1}
    class:is-paused={paused} class:is-full={visibleDistances.length > 8}>
    <div class="chart-heading" role="row">
      <span role="columnheader">Distance</span>
      <span role="columnheader" aria-colspan="2">Interval Name</span>
    </div>
    {#each groups as group (group.entries[0].label.replace(/^(major|minor) /, ''))}
      <div class="interval-family" role="rowgroup">
        {#each group.entries as entry, index (entry.distance)}
          <div class="reveal-row" class:animate-reveal={!initialDistances.has(entry.distance)}>
            <div class="interval-row" role="row" class:is-minor={entry.label.startsWith('minor')}
              class:highlight={activeDistance === entry.distance}>
              <span class="distance" role="cell">{entry.distance}</span>
              {#if group.family}
                {#if index === 0}
                  <span class="family-category" role="cell" aria-rowspan={group.entries.length}>{group.family}</span>
                {/if}
                <span class="interval-name" role="cell" aria-colindex="3">{entry.label}</span>
              {:else}
                <span class="single-name" role="cell" aria-colspan="2">{entry.label}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .chart-space { min-height: 8.5rem; width: min(100%, 22rem); container-type: inline-size; }
  .interval-chart { --distance-width: 30.5556%; --category-width: 22.2222%; border: 2px solid #29251f; background: #fff8db; color: #29251f; font-size: clamp(0.65rem, 6cqi, 1.15rem); }
  .chart-heading, .interval-row { display: grid; grid-template-columns: var(--distance-width) var(--category-width) 1fr; }
  .chart-heading { font-weight: 700; background: #fff0cb; }
  .chart-heading span:last-child, .single-name { grid-column: 2 / 4; }
  span { display: flex; align-items: center; justify-content: center; padding: 0.24rem 0.2rem; text-align: center; line-height: 1.35; }
  .chart-heading span:first-child, .distance { border-right: 1px solid #29251f; }
  .chart-heading, .interval-row { border-bottom: 1px solid #29251f; }
  .distance { background: #fae4d0; font-variant-numeric: tabular-nums; }
  .interval-family { position: relative; }
  .interval-name { grid-column: 3; border-left: 1px solid #29251f; background: #f3fce8; }
  .interval-row .distance { grid-column: 1; }
  .is-minor .interval-name { background: #fae4d0; }
  .interval-row .interval-name { grid-row: 1; }
  .family-category { position: absolute; z-index: 1; top: 0; bottom: 1px; left: var(--distance-width); width: var(--category-width); padding: 0; background: #fff8db; }
  .reveal-row { display: grid; grid-template-rows: 1fr; }
  .reveal-row > .interval-row { min-height: 0; overflow: hidden; }
  .animate-reveal { animation: reveal-row 650ms ease-in-out both; }
  .is-paused .animate-reveal { animation-play-state: paused; }
  .highlight .distance, .highlight .interval-name, .highlight .single-name { background: #ffe6a1; }
  .is-full { font-size: clamp(0.65rem, 4.5cqi, 0.9rem); }
  .is-full span { padding-top: 0.12rem; padding-bottom: 0.12rem; line-height: 1.15; }
  @keyframes reveal-row { from { grid-template-rows: 0fr; } to { grid-template-rows: 1fr; } }
  @container (max-width: 12rem) { .interval-chart { --distance-width: 45%; --category-width: 20%; } }
  @media (prefers-reduced-motion: reduce) {
    .animate-reveal { animation: none; }
  }
</style>
