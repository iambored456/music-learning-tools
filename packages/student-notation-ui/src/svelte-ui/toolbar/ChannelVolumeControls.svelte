<script lang="ts">
  import { onMount } from 'svelte';
  import store from '@state/initStore.ts';

  const channels = [
    { color: '#44bcef', name: 'Blue' },
    { color: '#d293e0', name: 'Purple' },
    { color: '#ee9561', name: 'Orange' },
    { color: '#81c273', name: 'Green' }
  ];
  const travel = 120;
  const trackInset = 20;
  const popupHeight = 47;
  const holdDelay = 200;
  const dragThreshold = 4;
  let levels = $state<Record<string, number>>({});
  let iconUrl = $state('');
  let popup: HTMLDivElement;
  let active = $state<{
    color: string; name: string; startLevel: number; startX: number; startY: number;
    pointerId: number | null; button: HTMLButtonElement; moved: boolean; sliderVisible: boolean;
  } | null>(null);
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let lastNonZeroLevels: Record<string, number> = {};
  let left = $state(0);
  let top = $state(0);
  const level = $derived(active ? (levels[active.color] ?? 1) : 1);

  function sync() {
    levels = Object.fromEntries(channels.map(({ color }) => [color, store.state.timbres[color]?.channelVolume ?? 1]));
    channels.forEach(({ color }) => {
      const current = levels[color] ?? 1;
      if (current > 0) lastNonZeroLevels[color] = current;
    });
  }

  function showSlider() {
    if (!active || active.sliderVisible) return;
    active.sliderVisible = true;
    popup.showPopover();
  }

  function open(button: HTMLButtonElement, channel: typeof channels[number], x: number, y: number, pointerId: number | null) {
    if (active) return;
    const startLevel = levels[channel.color] ?? 1;
    active = { ...channel, startLevel, startX: x, startY: y, pointerId, button, moved: false, sliderVisible: false };
    // Place the thumb at the initial pointer position wherever viewport space permits.
    left = Math.max(4, Math.min(
      window.innerWidth - travel - trackInset * 2 - 4,
      x - startLevel * travel - trackInset
    ));
    top = Math.max(4, Math.min(window.innerHeight - popupHeight - 4, y - 22));
    if (pointerId === null) showSlider();
    else holdTimer = setTimeout(showSlider, holdDelay);
  }

  function finish(cancel = false) {
    if (!active) return;
    const drag = active;
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (cancel) {
      store.setChannelVolume(drag.color, drag.startLevel);
    } else if (drag.pointerId !== null && !drag.moved && !drag.sliderVisible) {
      const current = levels[drag.color] ?? 1;
      const restored = lastNonZeroLevels[drag.color] ?? (drag.startLevel > 0 ? drag.startLevel : 1);
      store.setChannelVolume(drag.color, current > 0 ? 0 : restored);
    }
    active = null;
    if (!cancel && (levels[drag.color] ?? 1) !== drag.startLevel) store.recordState();
    if (drag.sliderVisible) popup.hidePopover();
    if (drag.pointerId !== null && drag.button.hasPointerCapture(drag.pointerId)) {
      drag.button.releasePointerCapture(drag.pointerId);
    }
  }

  function pointerDown(event: PointerEvent, channel: typeof channels[number]) {
    if (event.button !== 0 || active) return;
    event.preventDefault();
    const button = event.currentTarget as HTMLButtonElement;
    button.focus({ preventScroll: true });
    button.setPointerCapture(event.pointerId);
    open(button, channel, event.clientX, event.clientY, event.pointerId);
  }

  function pointerMove(event: PointerEvent) {
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (!active.moved) {
      active.moved = Math.hypot(event.clientX - active.startX, event.clientY - active.startY) >= dragThreshold;
      if (!active.moved) return;
      showSlider();
    }
    const next = active.startLevel + (event.clientX - active.startX) / travel;
    store.setChannelVolume(active.color, Math.round(next * 100) / 100);
  }

  function pointerEnd(event: PointerEvent) {
    if (active?.pointerId === event.pointerId) finish(event.type === 'pointercancel');
  }

  function keyDown(event: KeyboardEvent, channel: typeof channels[number]) {
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(true);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (active?.pointerId != null) return;
    const button = event.currentTarget as HTMLButtonElement;
    if (!active) {
      const bounds = button.getBoundingClientRect();
      open(button, channel, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, null);
    }
    const current = levels[channel.color] ?? 1;
    const step = event.key.startsWith('Page') ? 0.1 : 0.01;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1
      : current + (['ArrowUp', 'ArrowRight', 'PageUp'].includes(event.key) ? step : -step);
    store.setChannelVolume(channel.color, Math.round(next * 100) / 100);
  }

  onMount(() => {
    sync();
    const icon = document.querySelector<HTMLImageElement>('#volume-icon-button img');
    iconUrl = icon?.currentSrc || icon?.src || '';
    store.on('channelVolumeChanged', sync);
    store.on('historyChanged', sync);
    return () => {
      finish(true);
      store.off('channelVolumeChanged', sync);
      store.off('historyChanged', sync);
    };
  });
</script>

<svelte:window onpointermove={pointerMove} onpointerup={pointerEnd} onpointercancel={pointerEnd}
  onblur={() => finish(true)} onresize={() => finish(true)} />

{#each channels as channel}
  <button type="button" class="channel-volume-button" class:active={active?.color === channel.color}
    style:color={channel.color} role="slider" aria-label={`${channel.name} channel volume`}
    aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round((levels[channel.color] ?? 1) * 100)}
    aria-valuetext={`${Math.round((levels[channel.color] ?? 1) * 100)} percent`}
    aria-orientation="horizontal" title={`${channel.name} volume: ${Math.round((levels[channel.color] ?? 1) * 100)}% — hold and drag horizontally`}
    onpointerdown={(event) => pointerDown(event, channel)}
    onlostpointercapture={pointerEnd}
    onkeydown={(event) => keyDown(event, channel)}
    onkeyup={() => { if (active?.pointerId === null) finish(); }}
    onblur={() => finish()} oncontextmenu={(event) => event.preventDefault()}>
    <span class="speaker" class:volume-icon-muted={(levels[channel.color] ?? 1) === 0}
      style:mask-image={`url("${iconUrl}")`} aria-hidden="true"></span>
  </button>
{/each}

<div bind:this={popup} popover="manual" class="channel-volume-popup" aria-hidden="true"
  style:left={`${left}px`} style:top={`${top}px`} style:color={active?.color ?? 'inherit'}>
  <span class="level-label">{Math.round(level * 100)}%</span>
  <div class="track" style:width={`${travel}px`}>
    <div class="fill" style:width={`${level * 100}%`}></div>
    <div class="thumb" style:left={`${level * 100}%`}></div>
  </div>
</div>

<style>
  .channel-volume-button {
    display: grid;
    place-items: center;
    width: auto;
    height: 72%;
    max-width: 100%;
    max-height: 28px;
    min-width: 0;
    min-height: 0;
    aspect-ratio: 1;
    padding: 2px;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    background: var(--c-surface);
    cursor: ew-resize;
    touch-action: none;
    user-select: none;
  }
  .channel-volume-button:hover, .channel-volume-button.active {
    background: color-mix(in srgb, currentColor 12%, var(--c-surface));
  }
  .channel-volume-button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  .speaker { width: 100%; height: 100%; background: currentColor; mask-size: contain; mask-repeat: no-repeat; mask-position: center; }
  .channel-volume-popup {
    position: fixed;
    margin: 0;
    padding: 22px 20px;
    border: 1px solid currentColor;
    border-radius: 20px;
    background: var(--c-surface, white);
    box-shadow: var(--box-shadow-md);
    overflow: visible;
    pointer-events: none;
  }
  .level-label { position: absolute; top: 3px; left: 0; width: 100%; text-align: center; font-size: 10px; line-height: 12px; }
  .track { position: relative; height: 3px; border-radius: 3px; background: color-mix(in srgb, currentColor 20%, transparent); }
  .fill { position: absolute; left: 0; height: 100%; background: currentColor; border-radius: inherit; }
  .thumb { position: absolute; top: 50%; width: 14px; height: 14px; border: 2px solid var(--c-surface, white); border-radius: 50%; background: currentColor; transform: translate(-50%, -50%); box-shadow: 0 0 0 1px currentColor; }
</style>
