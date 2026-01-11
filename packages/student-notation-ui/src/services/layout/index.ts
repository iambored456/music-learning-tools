/**
 * Layout Service
 *
 * Barrel export for all layout-related functionality.
 * This module coordinates viewport calculations, canvas dimensions, and resize handling.
 */

// Types
export * from './types.ts';

// Viewport calculations (pure math)
export {
  calculateZoomToFitRowCount,
  getNormalizedRange,
  calculateViewportBounds,
  interpolateRange,
  easeInOutCubic,
  DEFAULT_MIN_VIEWPORT_ROWS,
  getAdaptiveZoomStep,
  getSpan,
  normalizeRange,
  setBottomEndpoint,
  setTopEndpoint,
  shiftRangeBy,
  zoomRange
} from './viewportCalculations.ts';

// Canvas dimensions (DOM operations)
export {
  getDevicePixelRatio,
  resizeCanvasForPixelRatio,
  getPitchGridContainerHeight,
  initDOMElements,
  updateWrapperWidths,
  updateScrollbarDimensions
} from './canvasDimensions.ts';

// Resize handling
export {
  handleResize,
  setupResizeObserver,
  setupWindowResizeListener,
  cancelPendingResize,
  forceResize
} from './resizeHandler.ts';

// Default export is the full LayoutService object (imported from main file)
// This preserves backwards compatibility
import LayoutService from '../layoutService.ts';
export default LayoutService;
