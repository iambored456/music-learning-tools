<script lang="ts">
  import { lessonScreenSlide } from '@mlt/lesson-kit';

  type Point = { x: number; y: number };
  type Props = {
    start: Point; end: Point; cellWidth: number;
    entering?: boolean; paused?: boolean; instant?: boolean; onArrive?: () => void;
  };
  let { start, end, cellWidth, entering = false, paused = false, instant = false, onArrive }: Props = $props();
  const padding = $derived(cellWidth * 0.6);
  const left = $derived(Math.min(start.x, end.x) - padding);
  const top = $derived(Math.min(start.y, end.y) - padding);
  const width = $derived(Math.abs(end.x - start.x) + padding * 2);
  const height = $derived(Math.abs(end.y - start.y) + padding * 2);
  const dx = $derived(end.x - start.x);
  const dy = $derived(end.y - start.y);
  const length = $derived(Math.max(1, Math.hypot(dx, dy)));
  const head = $derived(Math.min(cellWidth * 0.45, length * 0.4));
  const tip = $derived({ x: end.x - left, y: end.y - top });
  const headBase = $derived({ x: tip.x - dx / length * head, y: tip.y - dy / length * head });
  const path = $derived(`M ${start.x - left} ${start.y - top} L ${tip.x} ${tip.y}
    M ${headBase.x - dy / length * head * 0.6} ${headBase.y + dx / length * head * 0.6}
    L ${tip.x} ${tip.y}
    L ${headBase.x + dy / length * head * 0.6} ${headBase.y - dx / length * head * 0.6}`);
</script>

<div class="pitch-grid-arrow" aria-hidden="true"
  style:left={`${left}px`} style:top={`${top}px`} style:width={`${width}px`} style:height={`${height}px`}
  use:lessonScreenSlide={{ direction: entering ? 'enter-left' : null, paused, instant, onComplete: onArrive }}>
  <svg viewBox={`0 0 ${width} ${height}`}>
    <path d={path} fill="none" stroke="currentColor" stroke-width={Math.max(1.8, cellWidth * 0.12)}
      stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</div>

<style>
  .pitch-grid-arrow { position: absolute; z-index: 9; color: #5b4a84; pointer-events: none; overflow: visible; }
  svg { display: block; width: 100%; height: 100%; overflow: visible; }
</style>
