<script lang="ts">
  import { onMount } from 'svelte';
  import store from '@state/initStore.ts';
  import effectsController from '@components/audio/effects/effectsController.ts';
  import CartesianSlider from '../ui/CartesianSlider.svelte';

  type EffectType = 'delay' | 'vibrato' | 'tremolo';

  interface RangeConfig {
    min: number;
    max: number;
    step: number;
  }

  interface EffectConfig {
    xParam: string;
    yParam: string;
    xRange: RangeConfig;
    yRange: RangeConfig;
    backgroundOpacity: number;
  }

  interface NoteChangedPayload {
    newNote?: {
      color?: string;
    };
  }

  interface AudioEffectChangePayload {
    effectType?: string;
    color?: string;
    effectParams?: Record<string, number>;
  }

  interface SliderColors {
    accent?: string;
    fill?: string;
    stroke?: string;
    grid?: string;
    text?: string;
  }

  const EFFECT_CONFIGS: Record<EffectType, EffectConfig> = {
    delay: {
      xParam: 'time',
      yParam: 'feedback',
      xRange: { min: 0, max: 100, step: 1 },
      yRange: { min: 0, max: 95, step: 1 },
      backgroundOpacity: 0.2
    },
    vibrato: {
      xParam: 'speed',
      yParam: 'span',
      xRange: { min: 0, max: 100, step: 1 },
      yRange: { min: 0, max: 100, step: 1 },
      backgroundOpacity: 0.5
    },
    tremolo: {
      xParam: 'speed',
      yParam: 'span',
      xRange: { min: 0, max: 100, step: 1 },
      yRange: { min: 0, max: 100, step: 1 },
      backgroundOpacity: 0.5
    }
  };

  const FALLBACK_SIZE = 120;

  let host = $state<HTMLDivElement | null>(null);
  let container: HTMLElement | null = null;
  let effectType = $state<EffectType | null>(null);
  let config = $state<EffectConfig | null>(null);

  let size = $state<[number, number]>([FALLBACK_SIZE, FALLBACK_SIZE]);
  let xValue = $state(0);
  let yValue = $state(0);
  let colors = $state<SliderColors>({});
  let currentColor: string | null = store.state.selectedNote?.color ?? null;
  let isDragging = false;

  const clampChannel = (value: number) => Math.max(0, Math.min(255, value));

  const lightenHex = (hex: string, amount: number) => {
    const normalized = hex.replace('#', '');
    const r = clampChannel(parseInt(normalized.slice(0, 2), 16) + amount);
    const g = clampChannel(parseInt(normalized.slice(2, 4), 16) + amount);
    const b = clampChannel(parseInt(normalized.slice(4, 6), 16) + amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.replace('#', '');
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  function getSliderSize(element: HTMLElement): [number, number] {
    const rect = element.getBoundingClientRect();
    let width = rect?.width || element.clientWidth || element.offsetWidth || FALLBACK_SIZE;
    let height = rect?.height || element.clientHeight || element.offsetHeight || width;
    if (!width || width < 10) {width = FALLBACK_SIZE;}
    if (!height || height < 10) {height = width;}
    return [Math.round(width), Math.round(height)];
  }

  function updateSize(): void {
    if (!container) {return;}
    size = getSliderSize(container);
  }

  function updateColorsForColor(color: string): void {
    const palette = store.state.colorPalette[color] || { primary: color, light: color };
    const lightest = palette.light || lightenHex(palette.primary, 80);
    const opacity = config?.backgroundOpacity ?? 0.5;

    colors = {
      accent: palette.primary,
      fill: hexToRgba(lightest, opacity),
      stroke: '#c3c9d0',
      grid: '#d7dce4',
      text: '#3c4048'
    };
  }

  function updateValuesFromState(): void {
    if (!config || !effectType) {return;}
    const state = effectsController.getEffectState(effectType) || {};
    const nextX = typeof state[config.xParam] === 'number' ? state[config.xParam] : config.xRange.min;
    const nextY = typeof state[config.yParam] === 'number' ? state[config.yParam] : config.yRange.min;
    xValue = nextX;
    yValue = nextY;
  }

  function handleChange({ x, y }: { x: number; y: number }): void {
    if (!config || !effectType) {return;}
    effectsController.updateEffect(effectType, {
      [config.xParam]: x,
      [config.yParam]: y
    });
  }

  function handleInteractionStart(): void {
    if (!effectType || isDragging) {return;}
    isDragging = true;
    const color = effectsController.getActiveColor();
    store.emit('effectDialInteractionStart', { effectType, color });
    effectsController.startHoldPreview(effectType);
  }

  function handleInteractionEnd(): void {
    if (!effectType || !isDragging) {return;}
    isDragging = false;
    const color = effectsController.getActiveColor();
    store.emit('effectDialInteractionEnd', { effectType, color });
    effectsController.stopHoldPreview(effectType);
  }

  onMount(() => {
    if (!host) {return;}
    container = host.parentElement as HTMLElement | null;
    if (!container) {return;}

    const raw = container.dataset.effect;
    if (raw === 'delay' || raw === 'vibrato' || raw === 'tremolo') {
      effectType = raw;
      config = EFFECT_CONFIGS[raw];
      xValue = config.xRange.min;
      yValue = config.yRange.min;
    } else {
      if (raw) {
        console.warn('[EffectsCartesianSlider] Unknown effect type:', raw);
      }
      return;
    }

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);

    return () => observer.disconnect();
  });

  $effect(() => {
    if (!config || !effectType) {return;}

    const handleNoteChanged = (payload: NoteChangedPayload = {}) => {
      const nextColor = payload.newNote?.color ?? null;
      currentColor = nextColor;
      if (nextColor) {
        updateColorsForColor(nextColor);
      } else {
        colors = {};
      }
      if (!isDragging) {
        updateValuesFromState();
      }
    };

    const handleTimbreChanged = (color?: string) => {
      if (!color || color !== currentColor) {return;}
      if (!isDragging) {
        updateValuesFromState();
      }
    };

    const handleAudioEffectChanged = (payload?: AudioEffectChangePayload) => {
      if (!payload || payload.effectType !== effectType) {return;}
      if (payload.color !== currentColor) {return;}
      if (isDragging) {return;}

      if (payload.effectParams) {
        const nextX = payload.effectParams[config.xParam];
        const nextY = payload.effectParams[config.yParam];
        if (typeof nextX === 'number') {xValue = nextX;}
        if (typeof nextY === 'number') {yValue = nextY;}
        return;
      }

      updateValuesFromState();
    };

    store.on('noteChanged', handleNoteChanged);
    store.on('timbreChanged', handleTimbreChanged);
    store.on('audioEffectChanged', handleAudioEffectChanged);

    if (currentColor) {
      updateColorsForColor(currentColor);
    } else {
      colors = {};
    }
    updateValuesFromState();

    const handleWindowPointerUp = () => handleInteractionEnd();
    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      store.off('noteChanged', handleNoteChanged);
      store.off('timbreChanged', handleTimbreChanged);
      store.off('audioEffectChanged', handleAudioEffectChanged);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  });
</script>

<div
  class="effects-cartesian-slider"
  bind:this={host}
  on:pointerdown={handleInteractionStart}
  on:pointerup={handleInteractionEnd}
  on:pointerleave={handleInteractionEnd}
  on:pointercancel={handleInteractionEnd}
>
  {#if config}
    <CartesianSlider
      bind:x={xValue}
      bind:y={yValue}
      minX={config.xRange.min}
      maxX={config.xRange.max}
      stepX={config.xRange.step}
      minY={config.yRange.min}
      maxY={config.yRange.max}
      stepY={config.yRange.step}
      size={size}
      mode="relative"
      colors={colors}
      onchange={handleChange}
    />
  {/if}
</div>

<style>
  .effects-cartesian-slider {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
