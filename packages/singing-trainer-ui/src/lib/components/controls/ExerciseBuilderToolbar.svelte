<script lang="ts">
  import { onDestroy } from 'svelte';
  import ExerciseBottomControls from './ExerciseBottomControls.svelte';

  interface Props {
    visible?: boolean;
  }

  const MIN_HEIGHT_PX = 130;
  const MAX_HEIGHT_RATIO = 0.62;

  let { visible = false }: Props = $props();
  let heightPx = $state(190);
  let isResizing = $state(false);

  let dragStartY = 0;
  let dragStartHeightPx = 0;

  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  function getViewportHeight(): number {
    if (typeof window === 'undefined') return 900;
    return window.innerHeight;
  }

  function getViewportWidth(): number {
    if (typeof window === 'undefined') return 1280;
    return window.innerWidth;
  }

  function getDefaultHeightPx(): number {
    const viewportHeight = getViewportHeight();
    const viewportWidth = getViewportWidth();
    const desktopDefault = Math.min(viewportHeight * 0.26, 240);
    const mobileDefault = Math.min(viewportHeight * 0.36, 320);
    return viewportWidth <= 900 ? mobileDefault : desktopDefault;
  }

  function getMaxHeightPx(): number {
    return Math.max(MIN_HEIGHT_PX + 30, getViewportHeight() * MAX_HEIGHT_RATIO);
  }

  function syncHeightToViewport(): void {
    const maxHeightPx = getMaxHeightPx();
    const defaultHeightPx = getDefaultHeightPx();
    if (!Number.isFinite(heightPx) || heightPx <= 0) {
      heightPx = clamp(Math.round(defaultHeightPx), MIN_HEIGHT_PX, Math.round(maxHeightPx));
      return;
    }
    heightPx = clamp(Math.round(heightPx), MIN_HEIGHT_PX, Math.round(maxHeightPx));
  }

  if (typeof window !== 'undefined') {
    syncHeightToViewport();
  }

  function onWindowResize() {
    syncHeightToViewport();
  }

  function stopResize() {
    if (!isResizing) return;
    isResizing = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onWindowResize);
      document.body.style.userSelect = '';
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (!isResizing) return;
    const deltaY = dragStartY - event.clientY;
    const maxHeightPx = getMaxHeightPx();
    const nextHeight = clamp(dragStartHeightPx + deltaY, MIN_HEIGHT_PX, Math.round(maxHeightPx));
    heightPx = Math.round(nextHeight);
  }

  function onPointerUp() {
    stopResize();
  }

  function onResizeHandlePointerDown(event: PointerEvent) {
    event.preventDefault();
    dragStartY = event.clientY;
    dragStartHeightPx = heightPx;
    isResizing = true;
    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      window.addEventListener('resize', onWindowResize);
      document.body.style.userSelect = 'none';
    }
  }

  onDestroy(() => {
    stopResize();
  });
</script>

{#if visible}
  <div
    class="exercise-toolbar"
    class:exercise-toolbar--resizing={isResizing}
    role="region"
    aria-label="Exercise toolbar"
    style:height={`${heightPx}px`}
  >
    <button
      type="button"
      class="resize-handle"
      aria-label="Resize exercise toolbar"
      title="Drag to resize toolbar height"
      onpointerdown={onResizeHandlePointerDown}
    >
      <span class="resize-handle__grip" aria-hidden="true"></span>
    </button>
    <div class="exercise-toolbar__content">
      <ExerciseBottomControls />
    </div>
  </div>
{/if}

<style>
  .exercise-toolbar {
    width: 100%;
    min-height: 130px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(12, 17, 26, 0.94);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .exercise-toolbar--resizing {
    cursor: ns-resize;
  }

  .resize-handle {
    height: 14px;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
    cursor: ns-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex-shrink: 0;
  }

  .resize-handle__grip {
    width: 56px;
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.5);
  }

  .exercise-toolbar__content {
    padding: 8px;
    overflow-y: auto;
    flex: 1 1 auto;
    min-height: 0;
    scrollbar-width: auto;
    scrollbar-color: var(--c-accent, var(--color-primary, #4c8dff)) transparent;
  }

  .exercise-toolbar__content::-webkit-scrollbar {
    width: 18px;
  }

  .exercise-toolbar__content::-webkit-scrollbar-track {
    background: transparent;
  }

  .exercise-toolbar__content::-webkit-scrollbar-thumb {
    background-color: var(--c-accent, var(--color-primary, #4c8dff));
    border-radius: 999px;
    border: 6px solid transparent;
    background-clip: padding-box;
  }

  @media (max-width: 900px) {
    .exercise-toolbar {
      min-height: 124px;
    }
  }
</style>
