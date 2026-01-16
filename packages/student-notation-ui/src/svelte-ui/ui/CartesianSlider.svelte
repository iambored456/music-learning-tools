<script lang="ts">
  /**
   * CartesianSlider - Svelte 5 reusable 2D slider component
   *
   * This replaces: src/components/ui/CartesianSlider.ts
   *
   * Features:
   * - 2D draggable slider (XY pad)
   * - Absolute or relative Y-axis mode
   * - min/max/step enforcement for both axes
   * - Grid visualization
   * - Crosshair guides
   */

  type PositionMode = 'absolute' | 'relative';

  interface Props {
    x?: number;
    y?: number;
    minX?: number;
    maxX?: number;
    stepX?: number;
    minY?: number;
    maxY?: number;
    stepY?: number;
    size?: [number, number];
    mode?: PositionMode;
    reverseX?: boolean;
    colors?: {
      accent?: string;
      fill?: string;
      stroke?: string;
      grid?: string;
      text?: string;
    };
    onchange?: (value: { x: number; y: number }) => void;
  }

  let {
    x = $bindable(0.5),
    y = $bindable(0.5),
    minX = 0,
    maxX = 1,
    stepX = 0,
    minY = 0,
    maxY = 1,
    stepY = 0,
    size = [200, 200],
    mode = 'absolute',
    reverseX = false,
    colors = {},
    onchange
  }: Props = $props();

  // Pull theme colors from CSS variables with defaults
  const defaultColors = {
    accent: '#4a90e2',
    fill: '#1f1f1f',
    stroke: '#555',
    grid: '#333',
    text: '#fff'
  };

  let mergedColors = $state({ ...defaultColors });

  // Initialize theme colors
  $effect(() => {
    try {
      const styles = getComputedStyle(document.documentElement);
      const surface = styles.getPropertyValue('--c-surface').trim();
      const border = styles.getPropertyValue('--c-border').trim();
      const grid = styles.getPropertyValue('--c-border-strong').trim();
      const textColor = styles.getPropertyValue('--c-text').trim();
      mergedColors = {
        ...defaultColors,
        fill: surface || defaultColors.fill,
        stroke: border || defaultColors.stroke,
        grid: grid || defaultColors.grid,
        text: textColor || defaultColors.text,
        ...colors
      };
    } catch {
      mergedColors = { ...defaultColors, ...colors };
    }
  });

  // Reactive state
  let isDragging = $state(false);
  let normX = $state(0);
  let normY = $state(0);

  const width = $derived(size[0]);
  const height = $derived(size[1]);
  const patternId = `pos-grid-${Math.random().toString(36).slice(2, 8)}`;

  // Helper functions
  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  function maybeStep(value: number, min: number, max: number, step: number) {
    if (step <= 0) return value;
    const delta = value - min;
    const rounded = Math.round(delta / step);
    const snapped = min + rounded * step;
    return clamp(snapped, min, max);
  }

  function updateFromValues() {
    // Only allow an "off" state at the true origin (0,0)
    if (!(x === minX && y === minY)) {
      if (x === minX) {
        const minStepX = stepX > 0 ? stepX : Math.max((maxX - minX) / 100, 0.01);
        x = minX + minStepX;
      }
      if (y === minY) {
        const minStepY = stepY > 0 ? stepY : Math.max((maxY - minY) / 100, 0.01);
        y = minY + minStepY;
      }
    }

    normX = clamp((x - minX) / (maxX - minX || 1), 0, 1);
    normY = clamp((y - minY) / (maxY - minY || 1), 0, 1);
  }

  // Derived values for visualization
  const visualX = $derived(reverseX ? (1 - normX) * width : normX * width);
  const visualY = $derived(mode === 'absolute' ? normY * height : (1 - normY) * height);

  // Handle pointer events
  function handlePointerDown(e: PointerEvent) {
    isDragging = true;
    handlePointerMove(e);
    (e.target as SVGElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;

    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();

    const rawNx = (e.clientX - rect.left) / rect.width;
    const nx = reverseX ? 1 - rawNx : rawNx;
    const ny = (e.clientY - rect.top) / rect.height;

    normX = clamp(nx, 0, 1);
    const normalizedY = mode === 'relative' ? 1 - ny : ny;
    normY = clamp(normalizedY, 0, 1);

    x = minX + normX * (maxX - minX);
    y = minY + normY * (maxY - minY);

    // Apply stepping
    if (stepX > 0) {
      x = maybeStep(x, minX, maxX, stepX);
    }
    if (stepY > 0) {
      y = maybeStep(y, minY, maxY, stepY);
    }

    // Handle zero-axis nudging
    if (!(x === minX && y === minY)) {
      if (x === minX) {
        const minStepX = stepX > 0 ? stepX : Math.max((maxX - minX) / 100, 0.01);
        x = minX + minStepX;
      }
      if (y === minY) {
        const minStepY = stepY > 0 ? stepY : Math.max((maxY - minY) / 100, 0.01);
        y = minY + minStepY;
      }
    }

    // Recompute norms after adjustments
    normX = clamp((x - minX) / (maxX - minX || 1), 0, 1);
    normY = clamp((y - minY) / (maxY - minY || 1), 0, 1);

    onchange?.({ x, y });
  }

  function handlePointerUp(e: PointerEvent) {
    isDragging = false;
    (e.target as SVGElement).releasePointerCapture?.(e.pointerId);
  }

  // Initialize values on mount
  $effect(() => {
    updateFromValues();
  });

  // Watch for external value changes
  $effect(() => {
    if (!isDragging) {
      updateFromValues();
    }
  });
</script>

<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  style:touch-action="none"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
>
  <defs>
    <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="none" stroke={mergedColors.grid} stroke-width="1" />
    </pattern>
  </defs>

  <!-- Background -->
  <rect x="0" y="0" {width} {height} fill={mergedColors.fill} stroke={mergedColors.stroke} />

  <!-- Grid pattern -->
  <rect x="0" y="0" {width} {height} fill="url(#{patternId})" opacity="0.2" />

  <!-- Crosshairs -->
  <line
    x1={visualX}
    x2={visualX}
    y1="0"
    y2={height}
    stroke={mergedColors.grid}
    stroke-width="1"
    opacity="0.6"
  />
  <line
    x1="0"
    x2={width}
    y1={visualY}
    y2={visualY}
    stroke={mergedColors.grid}
    stroke-width="1"
    opacity="0.6"
  />

  <!-- Dial (handle) -->
  <circle cx={visualX} cy={visualY} r="10" fill={mergedColors.accent} stroke="#fff" stroke-width="2" />
</svg>

<style>
  svg {
    display: block;
    cursor: crosshair;
  }

  svg:active {
    cursor: grabbing;
  }
</style>
