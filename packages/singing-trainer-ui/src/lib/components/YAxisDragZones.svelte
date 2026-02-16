<script lang="ts">
  import { setTop, setBottom, midiToLabel, type ActiveHandle } from '@mlt/singing-trainer-core/pitch-range/pitchRangeController.js';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';

  interface Props {
    gridHeight: number;
    cellHeight: number;
  }

  let { gridHeight, cellHeight }: Props = $props();

  let hoveredZone: ActiveHandle = $state(null);
  let dragging: ActiveHandle = $state(null);
  let dragLabel = $state('');

  // Delta-based drag state
  let startY = 0;
  let startMidi = 0;

  function handlePointerDown(e: PointerEvent, zone: 'top' | 'bottom') {
    dragging = zone;
    startY = e.clientY;
    startMidi = zone === 'top'
      ? appState.state.yAxisRange.maxMidi
      : appState.state.yAxisRange.minMidi;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    dragLabel = midiToLabel(startMidi);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return;
    e.preventDefault();

    const deltaY = e.clientY - startY;
    // Inverse: dragging down (positive deltaY) → increase MIDI (higher pitch)
    const deltaSemitones = deltaY / cellHeight;
    const candidateMidi = startMidi + Math.round(deltaSemitones);

    const range = {
      bottomMidi: appState.state.yAxisRange.minMidi,
      topMidi: appState.state.yAxisRange.maxMidi,
    };

    let newRange;
    if (dragging === 'top') {
      newRange = setTop(range, candidateMidi);
    } else {
      newRange = setBottom(range, candidateMidi);
    }
    appState.setYAxisRange({ minMidi: newRange.bottomMidi, maxMidi: newRange.topMidi });

    const currentMidi = dragging === 'top' ? newRange.topMidi : newRange.bottomMidi;
    dragLabel = midiToLabel(currentMidi);
  }

  function handlePointerUp() {
    dragging = null;
    dragLabel = '';
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="drag-zones-container"
  class:drag-zones-container--dragging={dragging !== null}
  style:height="{gridHeight}px"
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
>
  <!-- Top zone -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="drag-zone drag-zone--top"
    class:drag-zone--hovered={hoveredZone === 'top'}
    class:drag-zone--dragging={dragging === 'top'}
    onpointerenter={() => hoveredZone = 'top'}
    onpointerleave={() => { if (!dragging) hoveredZone = null; }}
    onpointerdown={(e) => handlePointerDown(e, 'top')}
  >
    {#if hoveredZone === 'top' && !dragging}
      <span class="drag-tooltip">Drag to set top pitch</span>
    {/if}
    {#if dragging === 'top'}
      <span class="drag-tooltip">{dragLabel}</span>
    {/if}
  </div>

  <!-- Bottom zone -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="drag-zone drag-zone--bottom"
    class:drag-zone--hovered={hoveredZone === 'bottom'}
    class:drag-zone--dragging={dragging === 'bottom'}
    onpointerenter={() => hoveredZone = 'bottom'}
    onpointerleave={() => { if (!dragging) hoveredZone = null; }}
    onpointerdown={(e) => handlePointerDown(e, 'bottom')}
  >
    {#if hoveredZone === 'bottom' && !dragging}
      <span class="drag-tooltip">Drag to set bottom pitch</span>
    {/if}
    {#if dragging === 'bottom'}
      <span class="drag-tooltip">{dragLabel}</span>
    {/if}
  </div>
</div>

<style>
  .drag-zones-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    z-index: 10;
    user-select: none;
    touch-action: none;
  }

  .drag-zone {
    flex: 1;
    position: relative;
    cursor: grab;
    transition: background-color 0.15s ease;
  }

  .drag-zones-container--dragging .drag-zone {
    cursor: grabbing;
  }

  .drag-zone--hovered {
    background-color: rgba(100, 150, 255, 0.1);
  }

  .drag-zone--dragging {
    background-color: rgba(100, 150, 255, 0.2);
  }

  .drag-tooltip {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: 11px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
  }

  .drag-zone--top .drag-tooltip {
    bottom: 4px;
  }

  .drag-zone--bottom .drag-tooltip {
    top: 4px;
  }
</style>
