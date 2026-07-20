<script lang="ts">
  import type { BoomwhackerNoteShape } from '@mlt/boomwhacker-video-builder-core';
  import { PLACED_SIXTEENTH_HEX_PATH, PLACED_SIXTEENTH_HEX_VIEWBOX } from './noteGlyphs.js';

  export let shape: BoomwhackerNoteShape;
  export let label = '';
  export let markerClass = '';
  export let showLabel = true;
  export let sustained = false;
</script>

{#if shape === 'circle'}
  {#if sustained}
    <svg class="token-glyph sustain" viewBox="0 0 160 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="144" height="64" rx="32" />
    </svg>
  {:else}
    <svg class="token-glyph circle" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <ellipse cx="50" cy="50" rx="47" ry="47" />
    </svg>
  {/if}
{:else if shape === 'oval'}
  <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <ellipse cx="50" cy="80" rx="47" ry="77" />
  </svg>
{:else if shape === 'diamond'}
  <svg class="token-glyph diamond" viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d={PLACED_SIXTEENTH_HEX_PATH} />
  </svg>
{/if}

{#if showLabel && label}
  <span class="glyph-label">
    <span class={markerClass}>{label}</span>
  </span>
{/if}
