<script lang="ts">
  import DraggableNumber from './DraggableNumber.svelte';
  import { EIGHTH_NOTE_SVG, QUARTER_NOTE_SVG, DOTTED_QUARTER_NOTE_SVG } from './noteGlyphs.js';

  interface Props {
    quarterTempo?: number;
    minQuarter?: number;
    maxQuarter?: number;
    step?: number;
    sliderOrientation?: 'horizontal' | 'vertical';
    onchange?: (quarterTempo: number) => void;
    showEighth?: boolean;
    showQuarter?: boolean;
    showDottedQuarter?: boolean;
    showSlider?: boolean;
  }

  let {
    quarterTempo = 90,
    minQuarter = 60,
    maxQuarter = 180,
    step = 1,
    sliderOrientation = 'horizontal',
    onchange,
    showEighth = true,
    showQuarter = true,
    showDottedQuarter = true,
    showSlider = true,
  }: Props = $props();

  let currentQuarter = $state(90);

  const eighthTempo = $derived(Math.round(currentQuarter * 2));
  const dottedQuarterTempo = $derived(Math.round(currentQuarter / 1.5));

  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  function snapToStep(value: number): number {
    if (!Number.isFinite(step) || step <= 0) return value;
    const offset = value - minQuarter;
    return minQuarter + Math.round(offset / step) * step;
  }

  function commitQuarterTempo(rawQuarterTempo: number): void {
    if (!Number.isFinite(rawQuarterTempo)) return;
    const snapped = snapToStep(rawQuarterTempo);
    const next = clamp(Math.round(snapped), minQuarter, maxQuarter);

    if (next === currentQuarter) return;

    currentQuarter = next;
    onchange?.(next);
  }

  function nudgeTempo(source: 'eighth' | 'quarter' | 'dotted', delta: number): void {
    if (source === 'quarter') {
      commitQuarterTempo(currentQuarter + delta);
      return;
    }

    if (source === 'eighth') {
      commitQuarterTempo((eighthTempo + delta) / 2);
      return;
    }

    commitQuarterTempo((dottedQuarterTempo + delta) * 1.5);
  }

  function handleSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    commitQuarterTempo(Number(target.value));
  }

  $effect(() => {
    const externalQuarter = clamp(snapToStep(Math.round(quarterTempo)), minQuarter, maxQuarter);
    if (externalQuarter !== currentQuarter) {
      currentQuarter = externalQuarter;
    }
  });
</script>

<div class="tempo-controls" class:vertical={sliderOrientation === 'vertical'}>
  {#if showEighth}
  <div class="tempo-row">
    <span class="tempo-label" aria-label="Eighth note tempo">{@html EIGHTH_NOTE_SVG}</span>
    <div class="tempo-stepper">
      <button type="button" class="tempo-step-btn" aria-label="Increase eighth note tempo" onclick={() => nudgeTempo('eighth', 1)}>^</button>
      <DraggableNumber
        value={eighthTempo}
        min={minQuarter * 2}
        max={maxQuarter * 2}
        step={1}
        decimalPlaces={0}
        size={[52, 24]}
        useAppStyling={true}
        onchange={(value) => commitQuarterTempo(value / 2)}
      />
      <button type="button" class="tempo-step-btn" aria-label="Decrease eighth note tempo" onclick={() => nudgeTempo('eighth', -1)}>v</button>
    </div>
  </div>
  {/if}

  {#if showQuarter}
  <div class="tempo-row">
    <span class="tempo-label" aria-label="Quarter note tempo">{@html QUARTER_NOTE_SVG}</span>
    <div class="tempo-stepper">
      <button type="button" class="tempo-step-btn" aria-label="Increase quarter note tempo" onclick={() => nudgeTempo('quarter', 1)}>^</button>
      <DraggableNumber
        value={currentQuarter}
        min={minQuarter}
        max={maxQuarter}
        step={1}
        decimalPlaces={0}
        size={[52, 24]}
        useAppStyling={true}
        onchange={(value) => commitQuarterTempo(value)}
      />
      <button type="button" class="tempo-step-btn" aria-label="Decrease quarter note tempo" onclick={() => nudgeTempo('quarter', -1)}>v</button>
    </div>
  </div>
  {/if}

  {#if showDottedQuarter}
  <div class="tempo-row">
    <span class="tempo-label" aria-label="Dotted quarter note tempo">{@html DOTTED_QUARTER_NOTE_SVG}</span>
    <div class="tempo-stepper">
      <button type="button" class="tempo-step-btn" aria-label="Increase dotted quarter note tempo" onclick={() => nudgeTempo('dotted', 1)}>^</button>
      <DraggableNumber
        value={dottedQuarterTempo}
        min={Math.round(minQuarter / 1.5)}
        max={Math.round(maxQuarter / 1.5)}
        step={1}
        decimalPlaces={0}
        size={[52, 24]}
        useAppStyling={true}
        onchange={(value) => commitQuarterTempo(value * 1.5)}
      />
      <button type="button" class="tempo-step-btn" aria-label="Decrease dotted quarter note tempo" onclick={() => nudgeTempo('dotted', -1)}>v</button>
    </div>
  </div>
  {/if}

  {#if showSlider}
  <div class="tempo-slider-container">
    <input
      class="tempo-slider"
      type="range"
      min={minQuarter}
      max={maxQuarter}
      step={step}
      value={currentQuarter}
      oninput={handleSliderInput}
      aria-label="Quarter note tempo slider"
    />
  </div>
  {/if}
</div>

<style>
  .tempo-controls {
    --c-surface: #f8f8f8;
    --c-surface-muted: #f3f3f3;
    --c-border: #a9a9a9;
    --c-gridline: #d0d0d0;
    --c-text: #1e1e1e;
    --c-text-muted: #505050;
    --c-accent: #2f7fd4;
    --c-accent-light: #d6e7fa;
    --border-radius-sm: 5px;
    --space-015: 6px;
    --space-020: 8px;

    display: grid;
    grid-template-rows: repeat(3, 34px) 14px;
    gap: var(--space-020);
    width: 100%;
  }

  .tempo-controls.vertical {
    grid-template-columns: max-content 18px;
    grid-template-rows: repeat(3, 34px);
    width: max-content;
    max-width: 100%;
  }

  .tempo-controls.vertical .tempo-row {
    grid-column: 1;
  }

  .tempo-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-015);
    width: max-content;
    max-width: 100%;
    height: 34px;
    padding: 4px 6px;
    border: 1px solid var(--c-border);
    border-radius: var(--border-radius-sm);
    background: var(--c-surface-muted);
  }

  .tempo-label {
    color: var(--c-text-muted);
    display: flex;
    align-items: center;
    min-width: 1.6rem;
  }

  .tempo-label :global(svg) {
    height: 22px;
    width: auto;
    display: block;
  }

  .tempo-stepper {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .tempo-step-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--c-border);
    border-radius: 4px;
    background: var(--c-surface);
    color: var(--c-text-muted);
    font-size: 9px;
    line-height: 1;
    cursor: pointer;
    user-select: none;
  }

  .tempo-step-btn:hover {
    background: var(--c-accent-light);
    color: var(--c-accent);
  }

  .tempo-step-btn:active {
    background: var(--c-accent);
    color: #fff;
  }

  .tempo-slider-container {
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    min-width: 0;
    width: 100%;
  }

  .tempo-controls.vertical .tempo-slider-container {
    grid-column: 2;
    grid-row: 1 / span 3;
    width: 18px;
    height: 100%;
    min-height: 0;
    align-items: center;
    justify-content: center;
  }

  .tempo-slider {
    width: 100%;
    min-width: 0;
    height: 14px;
    min-height: 14px;
    margin: 0;
    border-radius: 10px;
    background: var(--c-gridline);
    -webkit-appearance: none;
    appearance: none;
    outline: none;
  }

  .tempo-controls.vertical .tempo-slider {
    width: 14px;
    height: 100%;
    min-height: 0;
    writing-mode: vertical-lr;
    direction: rtl;
  }

  .tempo-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2c2c2c;
    border: 2px solid #fff;
    cursor: pointer;
  }

  .tempo-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2c2c2c;
    border: 2px solid #fff;
    cursor: pointer;
  }
</style>
