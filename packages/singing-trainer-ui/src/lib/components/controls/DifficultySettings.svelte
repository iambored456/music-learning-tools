<script lang="ts">
  import { difficultyState, type DifficultyPreset } from '@mlt/singing-trainer-core/stores/difficultyState.svelte.js';
  import type { FeedbackCollectorConfig } from '@mlt/student-notation-engine';

  const presetOptions: { value: DifficultyPreset; label: string }[] = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
    { value: 'custom', label: 'Custom' },
  ];

  interface SliderDef {
    key: keyof FeedbackCollectorConfig;
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
    inverted?: boolean; // true = higher raw value is easier, so invert slider direction
  }

  const sliders: SliderDef[] = [
    { key: 'pitchToleranceCents', label: 'Pitch Precision', min: 10, max: 100, step: 5, unit: '¢', inverted: true },
    { key: 'onsetToleranceMs', label: 'Timing Precision', min: 25, max: 300, step: 25, unit: 'ms', inverted: true },
    { key: 'releaseToleranceMs', label: 'Release Precision', min: 25, max: 300, step: 25, unit: 'ms', inverted: true },
    { key: 'hitThreshold', label: 'Hit Threshold', min: 30, max: 95, step: 5, unit: '%' },
    { key: 'minCoveragePct', label: 'Min Coverage', min: 30, max: 90, step: 5, unit: '%' },
    { key: 'minVoicedMs', label: 'Min Voiced Duration', min: 100, max: 600, step: 50, unit: 'ms' },
    { key: 'minAmplitudeDb', label: 'Min Amplitude', min: -70, max: -40, step: 5, unit: 'dB' },
    { key: 'bandToleranceSemitones', label: 'Band Precision', min: 0, max: 2, step: 0.5, unit: 'st', inverted: true },
    { key: 'minSlideSemitones', label: 'Slide Min Span', min: 1, max: 6, step: 1, unit: 'st' },
  ];

  /** For inverted sliders, convert between raw config value and slider position */
  function toSlider(s: SliderDef, raw: number): number {
    return s.inverted ? s.max + s.min - raw : raw;
  }
  function fromSlider(s: SliderDef, slider: number): number {
    return s.inverted ? s.max + s.min - slider : slider;
  }

  function handlePresetChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as DifficultyPreset;
    if (value !== 'custom') {
      difficultyState.setPreset(value);
    }
  }

  function handleSliderChange(s: SliderDef, e: Event) {
    const sliderVal = Number((e.target as HTMLInputElement).value);
    difficultyState.setParam(s.key, fromSlider(s, sliderVal));
  }
</script>

<div class="difficulty-panel">
  <div class="preset-row">
    <span class="preset-label">Preset</span>
    <select class="preset-select" value={difficultyState.config.preset} onchange={handlePresetChange}>
      {#each presetOptions as opt}
        <option value={opt.value} disabled={opt.value === 'custom'}>{opt.label}</option>
      {/each}
    </select>
  </div>

  <div class="sliders">
    {#each sliders as s}
      {@const raw = difficultyState.config[s.key] as number}
      {@const sliderVal = toSlider(s, raw)}
      <div class="slider-row">
        <div class="slider-header">
          <span class="slider-label">{s.label}</span>
          <span class="slider-value">{raw}{s.unit}</span>
        </div>
        <input
          type="range"
          class="slider"
          min={s.min}
          max={s.max}
          step={s.step}
          value={sliderVal}
          oninput={(e) => handleSliderChange(s, e)}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  .difficulty-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .preset-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    padding: 12px 16px;
    background: var(--color-panel);
    border: 1px solid var(--color-border);
    border-radius: 12px;
  }

  .preset-label {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    font-weight: 600;
  }

  .preset-select {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    transition: border-color 0.2s ease;
  }

  .preset-select:hover {
    border-color: var(--color-secondary);
  }

  .sliders {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .slider-row {
    padding: 6px 12px;
    background: var(--color-control);
    border-radius: 8px;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }

  .slider-label {
    font-size: 0.75rem;
    color: var(--color-text);
  }

  .slider-value {
    font-size: 0.75rem;
    color: var(--color-text);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .slider {
    width: 100%;
    height: 4px;
    appearance: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--color-primary, #5b8def);
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border: none;
    border-radius: 50%;
    background: var(--color-primary, #5b8def);
    cursor: pointer;
  }
</style>
