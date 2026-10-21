<script lang="ts">
  import { onMount } from 'svelte';
  import { BOOMWHACKER_LANES, type TimedBoomwhackerNote } from '@mlt/boomwhacker-video-builder-core';
  import { drawJudgmentColumn, getJudgmentHitAges } from './browser/judgmentColumn.js';

  let { left, width, laneHeight, hitNotes, currentTimeSec }: {
    left: number;
    width: number;
    laneHeight: number;
    hitNotes: TimedBoomwhackerNote[];
    currentTimeSec: number;
  } = $props();
  let canvas: HTMLCanvasElement | undefined = $state();
  let reducedMotion = $state(false);
  const height = $derived(laneHeight * BOOMWHACKER_LANES.length);
  const hitAges = $derived(getJudgmentHitAges(hitNotes, currentTimeSec));

  onMount(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => { reducedMotion = preference.matches; };
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  });

  $effect(() => {
    if (!canvas || width <= 0 || height <= 0) {
      return;
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.ceil(width * pixelRatio);
    const pixelHeight = Math.ceil(height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, pixelWidth, pixelHeight);
    context.scale(pixelWidth / width, pixelHeight / height);
    drawJudgmentColumn(context, { left: 0, top: 0, width, laneHeight, lanes: BOOMWHACKER_LANES, hitAges, reducedMotion });
  });
</script>

<canvas bind:this={canvas} style={`left:${left}px;width:${width}px;height:${height}px;`} aria-hidden="true"></canvas>

<style>
  canvas {
    position: absolute;
    top: 0;
    display: block;
    pointer-events: none;
    z-index: 2;
  }
</style>
