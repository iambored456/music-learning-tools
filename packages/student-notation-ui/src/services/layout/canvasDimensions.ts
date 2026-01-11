/**
 * Canvas Dimensions
 *
 * Handles DOM queries for canvas sizing and device pixel ratio management.
 * Manages the physical dimensions of all canvas elements.
 */

import type { LayoutDOMElements } from './types.ts';

/**
 * Get the current device pixel ratio, with fallback.
 */
export function getDevicePixelRatio(): number {
  const ratio = window?.devicePixelRatio ?? 1;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 1;
  }
  return ratio;
}

/**
 * Resize a canvas element for the current device pixel ratio.
 * Handles both the physical (buffer) size and CSS (logical) size.
 *
 * @param canvasElement - The canvas to resize
 * @param logicalWidth - Desired CSS width in pixels
 * @param logicalHeight - Desired CSS height in pixels
 * @param pixelRatio - Device pixel ratio
 * @param existingContext - Optional existing 2D context to scale
 * @returns true if the canvas was resized, false otherwise
 */
export function resizeCanvasForPixelRatio(
  canvasElement: HTMLCanvasElement | null,
  logicalWidth: number | undefined,
  logicalHeight: number | undefined,
  pixelRatio: number,
  existingContext?: CanvasRenderingContext2D | null
): boolean {
  if (!canvasElement) {
    return false;
  }

  const normalizedRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  canvasElement.dataset['pixelRatio'] = `${normalizedRatio}`;

  let resized = false;

  if (typeof logicalWidth === 'number') {
    const targetWidth = Math.max(1, Math.round(logicalWidth * normalizedRatio));
    if (Math.abs(canvasElement.width - targetWidth) > 0.5) {
      canvasElement.width = targetWidth;
      resized = true;
    }
    canvasElement.style.width = `${logicalWidth}px`;
    canvasElement.dataset['logicalWidth'] = `${logicalWidth}`;
  }

  if (typeof logicalHeight === 'number') {
    const targetHeight = Math.max(1, Math.round(logicalHeight * normalizedRatio));
    if (Math.abs(canvasElement.height - targetHeight) > 0.5) {
      canvasElement.height = targetHeight;
      resized = true;
    }
    canvasElement.style.height = `${logicalHeight}px`;
    canvasElement.dataset['logicalHeight'] = `${logicalHeight}`;
  }

  if (resized) {
    const ctxToScale = existingContext || canvasElement.getContext('2d');
    if (ctxToScale) {
      ctxToScale.setTransform(normalizedRatio, 0, 0, normalizedRatio, 0, 0);
    }
  }

  return resized;
}

/**
 * Get the height of the pitch grid container element.
 *
 * @param fallbackViewportHeight - Fallback value if container not found
 * @returns Container height in pixels
 */
export function getPitchGridContainerHeight(fallbackViewportHeight: number = 0): number {
  const pitchGridContainer = document.getElementById('pitch-grid-container');
  const fallback = fallbackViewportHeight || window.innerHeight || 0;
  const height = pitchGridContainer?.clientHeight || (fallback ? fallback * 0.7 : 0);
  return height;
}

/**
 * Initialize all DOM element references for the layout service.
 *
 * @returns Object containing all DOM element references
 */
export function initDOMElements(): LayoutDOMElements {
  const pitchGridWrapper = document.getElementById('pitch-grid-wrapper');
  const canvas = document.getElementById('pitch-grid-canvas') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d') ?? null;
  const legendLeftCanvas = document.getElementById('legend-left-canvas') as HTMLCanvasElement | null;
  const legendRightCanvas = document.getElementById('legend-right-canvas') as HTMLCanvasElement | null;
  const drumGridWrapper = document.getElementById('drum-grid-wrapper');
  const drumCanvas = document.getElementById('drum-grid-canvas') as HTMLCanvasElement | null;
  const drumCtx = drumCanvas?.getContext('2d') ?? null;
  const drumPlayheadCanvas = document.getElementById('drum-playhead-canvas') as HTMLCanvasElement | null;
  const playheadCanvas = document.getElementById('playhead-canvas') as HTMLCanvasElement | null;
  const hoverCanvas = document.getElementById('hover-canvas') as HTMLCanvasElement | null;
  const drumHoverCanvas = document.getElementById('drum-hover-canvas') as HTMLCanvasElement | null;
  const buttonGridWrapper = document.getElementById('beat-line-ui');
  const gridScrollbarProxy = document.getElementById('grid-scrollbar-proxy');
  const gridScrollbarInner = document.getElementById('grid-scrollbar-inner');

  return {
    pitchGridWrapper,
    canvas,
    ctx,
    legendLeftCanvas,
    legendRightCanvas,
    drumGridWrapper,
    drumCanvas,
    drumCtx,
    drumPlayheadCanvas,
    playheadCanvas,
    hoverCanvas,
    drumHoverCanvas,
    buttonGridWrapper,
    gridScrollbarProxy,
    gridScrollbarInner
  };
}

/**
 * Update wrapper element widths to match the total canvas width.
 *
 * @param elements - DOM element references
 * @param totalWidthPx - Total width in pixels
 */
export function updateWrapperWidths(
  elements: Pick<LayoutDOMElements, 'pitchGridWrapper' | 'drumGridWrapper'>,
  totalWidthPx: number
): void {
  const targetWidth = totalWidthPx + 'px';
  const pitchGridContainer = document.getElementById('pitch-grid-container');

  if (pitchGridContainer) {
    pitchGridContainer.style.width = targetWidth;
  }

  if (elements.pitchGridWrapper) {
    elements.pitchGridWrapper.style.width = targetWidth;
  }

  if (elements.drumGridWrapper) {
    elements.drumGridWrapper.style.width = targetWidth;
  }
}

/**
 * Update scrollbar proxy dimensions.
 *
 * @param proxy - Scrollbar proxy element
 * @param inner - Scrollbar inner element
 * @param innerWidth - Width for inner element
 */
export function updateScrollbarDimensions(
  proxy: HTMLElement | null,
  inner: HTMLElement | null,
  innerWidth: number
): void {
  if (inner && proxy) {
    inner.style.width = `${innerWidth}px`;
    inner.style.height = '1px';
  }
}
