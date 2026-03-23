<script lang="ts">
  import DraggableNumber from './DraggableNumber.svelte';
  import { EIGHTH_NOTE_SVG, QUARTER_NOTE_SVG, DOTTED_QUARTER_NOTE_SVG } from './noteGlyphs.js';

  interface Props {
    quarterTempo?: number;
    minQuarter?: number;
    maxQuarter?: number;
    step?: number;
    sliderOrientation?: 'horizontal' | 'vertical';
    fillVerticalAvailableHeight?: boolean;
    onchange?: (quarterTempo: number) => void;
    showEighth?: boolean;
    showQuarter?: boolean;
    showDottedQuarter?: boolean;
    showRows?: boolean;
    showSlider?: boolean;
  }

  let {
    quarterTempo = 90,
    minQuarter = 60,
    maxQuarter = 180,
    step = 1,
    sliderOrientation = 'horizontal',
    fillVerticalAvailableHeight = false,
    onchange,
    showEighth = true,
    showQuarter = true,
    showDottedQuarter = true,
    showRows = true,
    showSlider = true,
  }: Props = $props();

  let currentQuarter = $state(90);

  const eighthTempo = $derived(Math.round(currentQuarter * 2));
  const dottedQuarterTempo = $derived(Math.round(currentQuarter / 1.5));
  const visibleTempoRowCount = $derived(
    showRows
      ? Math.max(1, (showEighth ? 1 : 0) + (showQuarter ? 1 : 0) + (showDottedQuarter ? 1 : 0))
      : 0,
  );

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

<div
  class="tempo-controls"
  class:vertical={sliderOrientation === 'vertical'}
  class:with-rows={showRows}
  class:with-slider={showSlider}
  class:fill-available-height={fillVerticalAvailableHeight && sliderOrientation === 'vertical' && showSlider}
  style={`--tempo-row-count:${visibleTempoRowCount};`}
>
  {#if showRows}
  <div class="tempo-rows">
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
    --tempo-controls-surface: var(--c-surface, #f8f8f8);
    --tempo-controls-surface-muted: var(--c-surface-muted, #f3f3f3);
    --tempo-controls-border: var(--c-border, #a9a9a9);
    --tempo-controls-gridline: var(--c-gridline, #d0d0d0);
    --tempo-controls-text: var(--c-text, #1e1e1e);
    --tempo-controls-text-muted: var(--c-text-muted, #505050);
    --tempo-controls-accent: var(--c-accent, #2f7fd4);
    --tempo-controls-accent-light: var(--c-accent-light, #d6e7fa);
    --tempo-controls-radius-sm: var(--border-radius-sm, 5px);
    --tempo-controls-space-015: var(--space-015, 6px);
    --tempo-controls-space-020: var(--space-020, 8px);
    --tempo-controls-row-height: var(--tempo-row-height, 34px);
    --tempo-controls-slider-shell-width: var(--tempo-slider-shell-width, 18px);
    --tempo-controls-slider-shell-padding: var(--tempo-slider-shell-padding, 4px);
    --tempo-controls-slider-track-thickness: var(--tempo-slider-track-thickness, 6px);
    --tempo-controls-slider-thumb-size: var(--tempo-slider-thumb-size, 16px);
    --tempo-controls-vertical-slider-length: var(--tempo-vertical-slider-length, 184px);

    display: grid;
    gap: var(--tempo-controls-space-020);
    width: 100%;
  }

  .tempo-rows {
    display: grid;
    grid-template-rows: repeat(var(--tempo-row-count), var(--tempo-controls-row-height));
    gap: var(--tempo-controls-space-020);
    align-content: start;
    min-width: 0;
    min-height: 0;
  }

  .tempo-controls.with-slider:not(.vertical).with-rows {
    grid-template-rows: auto var(--tempo-controls-slider-shell-width);
  }

  .tempo-controls.with-slider:not(.vertical):not(.with-rows) {
    grid-template-rows: var(--tempo-controls-slider-shell-width);
  }

  .tempo-controls.vertical {
    width: max-content;
    max-width: 100%;
    align-items: stretch;
    align-self: stretch;
    min-height: 0;
  }

  .tempo-controls.vertical.with-slider.with-rows {
    grid-template-columns: max-content var(--tempo-controls-slider-shell-width);
    column-gap: var(--tempo-controls-space-020);
  }

  .tempo-controls.vertical.with-slider:not(.with-rows) {
    grid-template-columns: var(--tempo-controls-slider-shell-width);
  }

  .tempo-controls.vertical.with-slider:not(.fill-available-height).with-rows {
    align-self: start;
    height: max(
      var(--tempo-controls-vertical-slider-length),
      calc(
        (var(--tempo-row-count) * var(--tempo-controls-row-height))
        + ((var(--tempo-row-count) - 1) * var(--tempo-controls-space-020))
      )
    );
  }

  .tempo-controls.vertical.with-slider:not(.fill-available-height):not(.with-rows) {
    align-self: start;
    height: var(--tempo-controls-vertical-slider-length);
  }

  .tempo-controls.vertical.with-slider:not(.fill-available-height).with-rows .tempo-rows {
    align-self: center;
  }

  .tempo-controls.vertical.with-slider.fill-available-height {
    grid-template-rows: minmax(0, 1fr);
  }

  .tempo-controls.vertical.with-slider.fill-available-height .tempo-rows {
    align-self: center;
  }

  .tempo-controls.vertical:not(.with-slider) {
    grid-template-columns: max-content;
  }

  .tempo-controls.vertical .tempo-rows {
    grid-column: 1;
    grid-row: 1;
    align-self: start;
  }

  .tempo-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--tempo-controls-space-015);
    width: max-content;
    max-width: 100%;
    height: var(--tempo-controls-row-height);
    padding: 4px 6px;
    border: 1px solid var(--tempo-controls-border);
    border-radius: var(--tempo-controls-radius-sm);
    background: var(--tempo-controls-surface-muted);
  }

  .tempo-label {
    color: var(--tempo-controls-text-muted);
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
    border: 1px solid var(--tempo-controls-border);
    border-radius: 4px;
    background: var(--tempo-controls-surface);
    color: var(--tempo-controls-text-muted);
    font-size: 9px;
    line-height: 1;
    cursor: pointer;
    user-select: none;
  }

  .tempo-step-btn:hover {
    background: var(--tempo-controls-accent-light);
    color: var(--tempo-controls-accent);
  }

  .tempo-step-btn:active {
    background: var(--tempo-controls-accent);
    color: #fff;
  }

  .tempo-slider-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: var(--tempo-controls-slider-shell-width);
    padding: 0 var(--tempo-controls-slider-shell-padding);
    border: 1px solid var(--tempo-controls-border);
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
      var(--tempo-controls-surface-muted);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .tempo-controls.vertical .tempo-slider-container {
    grid-column: 2;
    grid-row: 1;
    align-self: center;
    width: var(--tempo-controls-slider-shell-width);
    height: min(var(--tempo-controls-vertical-slider-length), 100%);
    max-height: 100%;
    min-height: 0;
    padding: var(--tempo-controls-slider-shell-padding) 0;
    overflow: hidden;
  }

  .tempo-controls.vertical.with-slider.fill-available-height .tempo-slider-container {
    align-self: stretch;
    height: auto;
  }

  .tempo-slider {
    width: 100%;
    min-width: 0;
    height: var(--tempo-controls-slider-track-thickness);
    min-height: var(--tempo-controls-slider-track-thickness);
    margin: 0;
    border-radius: 999px;
    background: transparent;
    -webkit-appearance: none;
    appearance: none;
    outline: none;
    accent-color: var(--tempo-controls-accent);
  }

  .tempo-controls.vertical .tempo-slider {
    width: var(--tempo-controls-slider-track-thickness);
    height: 100%;
    max-height: 100%;
    min-height: 0;
    writing-mode: vertical-lr;
    direction: rtl;
    flex: 1 1 auto;
  }

  .tempo-slider:focus-visible {
    outline: 2px solid var(--tempo-controls-accent);
    outline-offset: 4px;
  }

  .tempo-slider::-webkit-slider-runnable-track {
    width: 100%;
    height: var(--tempo-controls-slider-track-thickness);
    border: none;
    border-radius: 999px;
    background: var(--tempo-controls-gridline);
  }

  .tempo-controls.vertical .tempo-slider::-webkit-slider-runnable-track {
    width: var(--tempo-controls-slider-track-thickness);
  }

  .tempo-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: var(--tempo-controls-slider-thumb-size);
    height: var(--tempo-controls-slider-thumb-size);
    margin-top: calc((var(--tempo-controls-slider-track-thickness) - var(--tempo-controls-slider-thumb-size)) / 2);
    border: 2px solid #fff;
    border-radius: 50%;
    background: var(--tempo-controls-accent);
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.28);
    cursor: pointer;
  }

  .tempo-controls.vertical .tempo-slider::-webkit-slider-thumb {
    margin-left: calc((var(--tempo-controls-slider-track-thickness) - var(--tempo-controls-slider-thumb-size)) / 2);
    margin-top: 0;
  }

  .tempo-slider::-moz-range-track {
    height: var(--tempo-controls-slider-track-thickness);
    border: none;
    border-radius: 999px;
    background: var(--tempo-controls-gridline);
  }

  .tempo-slider::-moz-range-progress {
    height: var(--tempo-controls-slider-track-thickness);
    border-radius: 999px;
    background: var(--tempo-controls-accent);
  }

  .tempo-slider::-moz-range-thumb {
    width: var(--tempo-controls-slider-thumb-size);
    height: var(--tempo-controls-slider-thumb-size);
    border: 2px solid #fff;
    border-radius: 50%;
    background: var(--tempo-controls-accent);
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.28);
    cursor: pointer;
  }
</style>
