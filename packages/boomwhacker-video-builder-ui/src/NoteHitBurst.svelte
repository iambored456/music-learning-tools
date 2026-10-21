<script lang="ts">
  import { onMount } from 'svelte';
  import type { TimedBoomwhackerNote } from '@mlt/boomwhacker-video-builder-core';
  import HighwayNoteGlyph from './HighwayNoteGlyph.svelte';
  import type { HighwayNoteLayout } from './highwayLayout.js';
  import { createNoteFragments, getNoteFragmentTransform, type NoteFragment, type NoteHitBounds } from './browser/noteHitBurst.js';

  let { note, ageSec, bounds, layout, sustained }: {
    note: TimedBoomwhackerNote;
    ageSec: number;
    bounds: NoteHitBounds;
    layout: HighwayNoteLayout;
    sustained: boolean;
  } = $props();

  let reducedMotion = $state(false);
  const fragments = $derived(createNoteFragments(note.id));

  onMount(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => { reducedMotion = preference.matches; };
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  });

  function fragmentStyle(fragment: NoteFragment): string {
    const frame = getNoteFragmentTransform(fragment, ageSec, Math.min(layout.width, layout.height), reducedMotion);
    const polygon = fragment.points.map((point) => `${point.x * 100}% ${point.y * 100}%`).join(',');
    return `left:${layout.left - bounds.left}px;top:${layout.top - bounds.top}px;width:${layout.width}px;height:${layout.height}px;
      --token-color:${note.color};--note-label-size:${layout.labelFontPx}px;
      clip-path:polygon(${polygon});transform-origin:${fragment.center.x * 100}% ${fragment.center.y * 100}%;
      transform:translate(${frame.x}px,${frame.y}px) rotate(${frame.rotation}deg) scale(${frame.scale});opacity:${frame.opacity};`;
  }
</script>

<div class="note-fragments" style={`left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px;`} aria-hidden="true">
  {#each fragments as fragment (fragment.id)}
    <div class="highway__note note-fragment" style={fragmentStyle(fragment)}>
      <HighwayNoteGlyph
        shape={note.shape}
        label={note.label}
        markerClass={note.marker === 'none' ? '' : `label-marker-${note.marker}`}
        showLabel={layout.showLabel}
        {sustained}
      />
    </div>
  {/each}
</div>

<style>
  .note-fragments {
    position: absolute;
    overflow: hidden;
    pointer-events: none;
  }

  .note-fragment {
    border-radius: 0;
    pointer-events: none;
  }
</style>
