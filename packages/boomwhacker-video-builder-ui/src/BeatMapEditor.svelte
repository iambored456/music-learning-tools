<script lang="ts">
  import { shiftBeatTimes, withBeatTimes, type SongTimingState } from '@mlt/boomwhacker-video-builder-core';
  import { getHighwayTimeAtX, getHighwayTimeX, type HighwayTimeLayout } from './highwayLayout.js';

  let { timing, peaks, audioDurationSec, currentTimeSec, playbackDurationSec, scrubbing = false,
    transportDisabled = false, viewport = $bindable<HTMLDivElement | null>(null), disabled = false,
    layout, timelineWidthPx, onzoomwheel, onscroll,
    waveformHeight, onheightchange, onchange, onseek, onscrubstart, onscrubmove, onscrubend, ontransportkeydown }: {
    timing: SongTimingState;
    peaks: number[];
    audioDurationSec: number;
    currentTimeSec: number;
    playbackDurationSec: number;
    scrubbing?: boolean;
    transportDisabled?: boolean;
    viewport?: HTMLDivElement | null;
    disabled?: boolean;
    layout: HighwayTimeLayout;
    timelineWidthPx: number;
    onzoomwheel: (event: WheelEvent) => void;
    onscroll: () => void;
    waveformHeight: number;
    onheightchange: (height: number) => void;
    onchange: (timing: SongTimingState) => void;
    onseek: (time: number) => void;
    onscrubstart: (event: PointerEvent) => void;
    onscrubmove: (event: PointerEvent) => void;
    onscrubend: (event: PointerEvent) => void;
    ontransportkeydown: (event: KeyboardEvent) => void;
  } = $props();
  let selected = $state<number[]>([]);
  let timeline: HTMLDivElement;
  const MIN_WAVEFORM_HEIGHT = 96;
  const MAX_WAVEFORM_HEIGHT = 800;
  let resize = $state<{ pointerId: number; startY: number; startHeight: number; height: number } | null>(null);
  const displayHeight = $derived(resize?.height ?? clampHeight(waveformHeight));
  let gesture = $state<{
    pointerId: number; startX: number; currentX: number; layout: HighwayTimeLayout;
    original: number[]; draft: number[]; indices: number[]; selecting: boolean;
  } | null>(null);
  const displayTimes = $derived(gesture?.draft ?? timing.beatTimesSec);
  const firstSelected = $derived(selected.length === 1 && selected[0] < timing.beatCount ? selected[0] : null);
  const zoomDisabled = $derived(transportDisabled || gesture !== null || scrubbing || resize !== null);

  $effect(() => {
    const element = viewport;
    if (!element) return;
    // Browser zoom must be cancelled synchronously by a non-passive listener.
    element.addEventListener('wheel', handleWaveformWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWaveformWheel);
  });

  function handleWaveformWheel(event: WheelEvent): void {
    if (!(event.ctrlKey || event.metaKey || event.altKey)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!zoomDisabled) onzoomwheel(event);
  }

  function timeToX(timeSec: number): number {
    return getHighwayTimeX(timeSec, layout.previewStartTimeSec, layout.leadingPaddingPx, layout.pixelsPerSecond);
  }

  function clampHeight(height: number): number {
    return Math.max(MIN_WAVEFORM_HEIGHT, Math.min(MAX_WAVEFORM_HEIGHT, Math.round(height)));
  }
  function beginResize(event: PointerEvent): void {
    if (disabled || gesture || scrubbing || resize || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    resize = { pointerId: event.pointerId, startY: event.clientY, startHeight: displayHeight, height: displayHeight };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function moveResize(event: PointerEvent): void {
    if (!resize || resize.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    resize.height = clampHeight(resize.startHeight + event.clientY - resize.startY);
  }
  function finishResize(event: PointerEvent): void {
    if (!resize || resize.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    const height = resize.height;
    resize = null;
    if (event.type === 'pointerup') onheightchange(height);
  }
  function resizeWithKeyboard(event: KeyboardEvent): void {
    if (disabled || resize) return;
    const step = event.shiftKey ? 60 : 20;
    let height = displayHeight;
    if (event.key === 'ArrowUp') height -= step;
    else if (event.key === 'ArrowDown') height += step;
    else if (event.key === 'Home') height = MIN_WAVEFORM_HEIGHT;
    else if (event.key === 'End') height = MAX_WAVEFORM_HEIGHT;
    else return;
    event.preventDefault(); event.stopPropagation();
    onheightchange(clampHeight(height));
  }

  function isDownbeat(index: number): boolean {
    return timing.firstDownbeatIndex !== null && index >= timing.firstDownbeatIndex
      && index < timing.beatCount && (index - timing.firstDownbeatIndex) % timing.timeSignatureNumerator === 0;
  }
  function begin(event: PointerEvent, index?: number): void {
    if (disabled || gesture || scrubbing || resize || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const rect = timeline.getBoundingClientRect();
    const x = event.clientX - rect.left - timeline.clientLeft;
    if (index !== undefined) {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        selected = selected.includes(index) ? selected.filter(value => value !== index) : [...selected, index];
      } else if (!selected.includes(index)) selected = [index];
      (event.currentTarget as HTMLElement).focus();
    } else selected = [];
    gesture = { pointerId: event.pointerId, startX: x, currentX: x, layout: { ...layout },
      original: [...timing.beatTimesSec], draft: [...timing.beatTimesSec], indices: [...selected], selecting: index === undefined };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent): void {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const x = event.clientX - timeline.getBoundingClientRect().left - timeline.clientLeft;
    gesture.currentX = x;
    if (gesture.selecting) {
      const left = getHighwayTimeAtX(Math.min(x, gesture.startX), gesture.layout);
      const right = getHighwayTimeAtX(Math.max(x, gesture.startX), gesture.layout);
      selected = gesture.original.flatMap((time, index) => time >= left && time <= right ? [index] : []);
    } else {
      gesture.draft = shiftBeatTimes(gesture.original, gesture.indices, (x - gesture.startX) / gesture.layout.pixelsPerSecond);
    }
  }
  function finish(event: PointerEvent): void {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const current = gesture;
    gesture = null;
    if (event.type === 'pointercancel') return;
    if (current.selecting) {
      if (Math.abs(current.currentX - current.startX) < 3) onseek(getHighwayTimeAtX(current.startX, current.layout));
    } else if (current.draft.some((time, index) => time !== current.original[index])) {
      onchange(withBeatTimes(timing, current.draft));
    }
  }
  function nudge(event: KeyboardEvent, index: number): void {
    if (disabled) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); event.stopPropagation();
      const indices = selected.includes(index) ? selected : [index];
      selected = indices;
      const delta = (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 0.1 : 0.01);
      onchange(withBeatTimes(timing, shiftBeatTimes(timing.beatTimesSec, indices, delta)));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); event.stopPropagation(); selected = [index]; onseek(timing.beatTimesSec[index]);
    }
  }
</script>

<svelte:window onpointermove={move} onpointerup={finish} onpointercancel={finish} />

<section class="beat-map" aria-label="Beat map editor">
  <div class="controls">
    <strong>Beat map</strong>
    <span>{timing.midiFileName} · {timing.beatCount} beats</span>
  </div>
  <p>Zoom and horizontal scrolling are shared with the note highway. Ctrl + scroll wheel zooms both at the pointer. Click the waveform to seek or drag the red cursor to scrub. Drag a beat to adjust timing. Drag across the background to select beats, then drag a selected beat to shift the group. Shift-click adds to the selection. Arrow keys nudge by 0.01s; Shift + arrow by 0.1s.</p>
  <div class="viewport highway__viewport" bind:this={viewport} {onscroll}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="timeline compact-waveform__timeline" bind:this={timeline} style:height={`${displayHeight}px`} style:width={`${timelineWidthPx}px`} role="group" aria-label="Waveform with editable beat markers" onpointerdown={(event) => begin(event)}>
      <div class="waveform-bars compact-waveform__bars" aria-hidden="true" style={`--waveform-bar-count:${peaks.length};left:${timeToX(0)}px;width:${audioDurationSec * layout.pixelsPerSecond}px;`}>
        {#each peaks as peak}<span class="waveform-bars__bar" style:height={`${Math.max(8, peak * 100)}%`}></span>{/each}
      </div>
      {#each displayTimes as time, index}
        <button type="button" class="marker" class:selected={selected.includes(index)} class:downbeat={isDownbeat(index)}
          style:left={`${timeToX(time)}px`} {disabled}
          aria-label={`${index === timing.beatCount ? 'End boundary' : `Beat ${index + 1}`}, ${time.toFixed(3)} seconds${isDownbeat(index) ? ', downbeat' : ''}`}
          aria-pressed={selected.includes(index)}
          title={`${index === timing.beatCount ? 'End' : `Beat ${index + 1}`} · ${time.toFixed(3)}s`}
          onpointerdown={(event) => begin(event, index)} onkeydown={(event) => nudge(event, index)}>
          <span>{index === timing.beatCount ? 'End' : index + 1}</span>
        </button>
      {/each}
      <button type="button" class="waveform-playhead waveform-playhead--preview" class:is-scrubbing={scrubbing}
        style:left={`${timeToX(currentTimeSec)}px`}
        disabled={transportDisabled || gesture !== null || resize !== null}
        aria-label={`Playback cursor at ${currentTimeSec.toFixed(2)} seconds`}
        title="Drag to scrub playback" onclick={(event) => event.stopPropagation()}
        onpointerdown={onscrubstart} onpointermove={onscrubmove} onpointerup={onscrubend} onpointercancel={onscrubend}
        onkeydown={ontransportkeydown}>
        <span class="waveform-playhead__cap"></span>
      </button>
      {#if gesture?.selecting}
        <div class="selection" style:left={`${Math.min(gesture.startX, gesture.currentX)}px`} style:width={`${Math.abs(gesture.currentX - gesture.startX)}px`}></div>
      {/if}
    </div>
  </div>
  <div class="resize-handle" role="slider" aria-orientation="vertical" tabindex={disabled ? -1 : 0} aria-disabled={disabled}
    aria-label="Waveform height" aria-valuemin={MIN_WAVEFORM_HEIGHT} aria-valuemax={MAX_WAVEFORM_HEIGHT}
    aria-valuenow={displayHeight} aria-valuetext={`${displayHeight} pixels`}
    title="Drag to resize waveform; use Up and Down arrow keys when focused"
    onpointerdown={beginResize} onpointermove={moveResize} onpointerup={finishResize}
    onpointercancel={finishResize} onlostpointercapture={finishResize} onkeydown={resizeWithKeyboard}>
    <span aria-hidden="true"></span>
  </div>
  <div class="compact-waveform__footer">
    <span class="compact-waveform__readout">{currentTimeSec.toFixed(2)}s / {playbackDurationSec.toFixed(2)}s</span>
  </div>
  <div class="controls">
    <span>{selected.length} selected</span>
    <button type="button" {disabled} onclick={() => selected = timing.beatTimesSec.map((_, index) => index)}>Select all</button>
    <button type="button" disabled={disabled || !selected.length} onclick={() => selected = []}>Clear selection</button>
    <button type="button" disabled={disabled || firstSelected === null} onclick={() => onchange({ ...timing, firstDownbeatIndex: firstSelected })}>Set selected beat as first downbeat</button>
    <button type="button" disabled={disabled || timing.firstDownbeatIndex === null} onclick={() => onchange({ ...timing, firstDownbeatIndex: null })}>Clear downbeats</button>
    <span>{timing.firstDownbeatIndex === null ? 'No downbeats designated' : `First downbeat: beat ${timing.firstDownbeatIndex + 1}; every ${timing.timeSignatureNumerator} beats`}</span>
  </div>
</section>

<style>
  .beat-map { min-width: 0; padding: 1rem 0; border-radius: 12px; background: #101d2c; box-shadow: inset 0 0 0 1px #60748c; color: #edf5ff; }
  .controls { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; padding: 0 1rem; }
  p { padding: 0 1rem; font-size: .85rem; line-height: 1.5; color: #bdccdf; }
  .controls button { font: inherit; color: inherit; background: #233c57; border: 1px solid #6f88a5; border-radius: 6px; padding: .45rem .65rem; }
  button:disabled { opacity: .45; }
  .viewport { margin: 1rem 0; }
  .timeline { position: relative; overflow: visible; touch-action: none; user-select: none; cursor: crosshair; }
  .resize-handle { display: grid; place-items: center; width: 100%; height: 20px; margin: -.5rem 0 .5rem; padding: 0; border: 0; border-radius: 6px; background: transparent; cursor: ns-resize; touch-action: none; user-select: none; }
  .resize-handle span { width: 44px; height: 4px; border-radius: 2px; background: #89a4bf; }
  .resize-handle:hover:not([aria-disabled='true']), .resize-handle:active:not([aria-disabled='true']) { background: #69c9ff22; }
  .resize-handle[aria-disabled='true'] { opacity: .45; cursor: default; }
  .resize-handle:focus-visible { outline: 2px solid #69c9ff; outline-offset: 2px; }
  .waveform-bars { pointer-events: none; }
  .compact-waveform__footer { margin: 0 0 .75rem; padding: 0 1rem; }
  .marker { position: absolute; top: 0; height: 100%; width: 10px; padding: 0; transform: translateX(-50%); border: 0; border-radius: 0; background: transparent; color: inherit; font: inherit; cursor: ew-resize; touch-action: none; }
  .marker::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; background: #a7c0d9; }
  .marker span { position: absolute; left: 50%; top: 0; font-size: 10px; background: #101d2c; }
  .marker.downbeat::before { background: #ffd166; width: 4px; }
  .marker.selected { background: #69c9ff44; z-index: 1; }
  .marker.selected::before { background: #69c9ff; }
  .marker:focus-visible { outline: 2px solid white; }
  .selection { position: absolute; top: 0; bottom: 0; border: 1px solid #69c9ff; background: #69c9ff33; pointer-events: none; }
</style>
