<script lang="ts">
  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    decimalPlaces?: number;
    size?: [number, number];
    colors?: { fill?: string; dark?: string; light?: string; accent?: string };
    useAppStyling?: boolean;
    onchange?: (value: number) => void;
  }

  let {
    value = $bindable(0),
    min = 0,
    max = 20000,
    step = 1,
    decimalPlaces = 2,
    size = [60, 30],
    colors = {},
    useAppStyling = false,
    onchange,
  }: Props = $props();

  const colorDefaults = { fill: '#e7e7e7', dark: '#333', light: '#fff', accent: '#b35' };
  const mergedColors = $derived({
    fill: colors.fill ?? colorDefaults.fill,
    dark: colors.dark ?? colorDefaults.dark,
    light: colors.light ?? colorDefaults.light,
    accent: colors.accent ?? colorDefaults.accent,
  });

  let inputElement: HTMLInputElement | null = $state(null);
  let displayValue = $state(formatValue(value));
  let isDragging = $state(false);
  let isEditing = $state(false);
  let dragStart = $state({ y: 0, value: 0 });
  let changeFactor = $state(1);

  const width = $derived(size[0]);
  const height = $derived(size[1]);
  const minDimension = $derived(Math.min(width, height));

  function clip(v: number, minVal: number, maxVal: number): number {
    return Math.max(minVal, Math.min(maxVal, v));
  }

  function invert(t: number): number {
    return 1 - clip(t, 0, 1);
  }

  function stepValue(v: number): number {
    if (!isFinite(step) || step <= 0) return v;
    const n = Math.round((v - min) / step);
    return min + n * step;
  }

  function formatValue(v: number): string {
    if (!isFinite(v)) return '';
    const s = Number(v).toFixed(Math.max(0, decimalPlaces));
    return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  }

  function updateValue(newValue: number): void {
    const clamped = clip(newValue, min, max);
    const stepped = stepValue(clamped);
    if (stepped !== value) {
      value = stepped;
      onchange?.(value);
    }
    displayValue = formatValue(value);
  }

  function handleMouseDown(e: MouseEvent): void {
    if (!inputElement) return;

    isDragging = true;
    dragStart = { y: e.clientY, value };

    const rect = inputElement.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    changeFactor = invert(relX);

    inputElement.readOnly = true;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging) return;

      const dy = ev.clientY - dragStart.y;
      const range = clip(max - min, 0, 1000);
      const scale = (range / 200) * Math.pow(changeFactor, 2);
      const newValue = dragStart.value - dy * scale;

      updateValue(newValue);
    };

    const handleMouseUp = () => {
      isDragging = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (Math.abs(e.clientY - dragStart.y) < 3) {
        isEditing = true;
        inputElement!.readOnly = false;
        inputElement!.focus();
        inputElement!.setSelectionRange(0, inputElement!.value.length);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    const val = target.value;

    if (!/^-?\d*\.?\d*$/.test(val)) {
      target.value = displayValue;
      return;
    }

    displayValue = val;
  }

  function handleBlur(): void {
    isEditing = false;
    const parsed = parseFloat(displayValue);
    if (!Number.isNaN(parsed)) {
      updateValue(parsed);
    } else {
      displayValue = formatValue(value);
    }
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      inputElement?.blur();
    }
  }

  $effect(() => {
    if (!isDragging && !isEditing) {
      displayValue = formatValue(value);
    }
  });
</script>

<input
  bind:this={inputElement}
  type="text"
  value={displayValue}
  class:app-styling={useAppStyling}
  class:editing={isEditing}
  style:width="{width}px"
  style:height="{height}px"
  style:--fill={useAppStyling ? 'var(--c-surface, #f7f7f7)' : mergedColors.fill}
  style:--text={useAppStyling ? 'var(--c-text, #191919)' : mergedColors.dark}
  style:--accent={useAppStyling ? 'var(--c-accent, #2f7fd4)' : mergedColors.accent}
  style:--light={mergedColors.light}
  style:--font-size={useAppStyling ? '13px' : `${minDimension / 2}px`}
  style:--padding={useAppStyling ? '0' : `${minDimension / 4}px`}
  oninput={handleInput}
  onmousedown={handleMouseDown}
  onblur={handleBlur}
  onkeydown={handleKeyDown}
  ondragstart={(e) => e.preventDefault()}
/>

<style>
  input {
    background-color: var(--fill);
    color: var(--text);
    font-family: 'Atkinson Hyperlegible Next', system-ui, sans-serif;
    font-weight: 500;
    font-size: var(--font-size);
    border: none;
    outline: none;
    padding: var(--padding);
    box-sizing: border-box;
    user-select: text;
    text-align: center;
  }

  input.app-styling {
    background-color: var(--c-surface, #f7f7f7);
    color: var(--c-text, #191919);
    border: 1px solid var(--c-border, #a0a0a0);
    border-radius: var(--border-radius-sm, 5px);
    font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
    font-weight: 600;
    font-size: 13px;
  }

  input.editing {
    background-color: var(--accent);
    color: var(--light);
  }

  input.app-styling.editing {
    background-color: var(--c-accent, #2f7fd4);
    color: var(--c-surface, #f7f7f7);
  }
</style>
