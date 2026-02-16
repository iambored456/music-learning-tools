<script lang="ts">
  import { highwayState } from '@mlt/singing-trainer-core/stores/highwayState.svelte.js';

  interface Props {
    canvasWidth: number;
    gridHeight: number;
    nowLineX: number;
  }

  let { canvasWidth, gridHeight, nowLineX }: Props = $props();

  let dragging = $state(false);
  let hovered = $state(false);
  let startX = 0;
  let startNowLineX = 0;

  const MIN_X = 40;
  const HIT_ZONE_HALF = 8;

  function clampX(x: number): number {
    return Math.max(MIN_X, Math.min(x, canvasWidth - MIN_X));
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startNowLineX = nowLineX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return;
    e.stopPropagation();
    e.preventDefault();
    const deltaX = e.clientX - startX;
    highwayState.setNowLineX(clampX(startNowLineX + deltaX));
  }

  function handlePointerUp(e: PointerEvent) {
    const target = e.currentTarget as HTMLElement;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
    dragging = false;
    e.stopPropagation();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="judgement-drag-handle"
  class:judgement-drag-handle--hovered={hovered}
  class:judgement-drag-handle--dragging={dragging}
  data-judgement-drag-handle="true"
  style:left="{nowLineX - HIT_ZONE_HALF}px"
  style:width="{HIT_ZONE_HALF * 2}px"
  style:height="{gridHeight}px"
  onpointerenter={() => hovered = true}
  onpointerleave={() => { if (!dragging) hovered = false; }}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
>
</div>

<style>
  .judgement-drag-handle {
    position: absolute;
    top: 0;
    z-index: 15;
    cursor: col-resize;
    touch-action: none;
    user-select: none;
  }

  .judgement-drag-handle--hovered {
    background-color: rgba(255, 0, 0, 0.08);
  }

  .judgement-drag-handle--dragging {
    background-color: rgba(255, 0, 0, 0.15);
  }
</style>
