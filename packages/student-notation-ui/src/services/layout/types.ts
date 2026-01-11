/**
 * Layout Service Types
 *
 * Shared type definitions for the layout service modules.
 */

import type { PitchRange } from '../../../types/state.js';

/**
 * Information about the current pitch viewport.
 *
 * The viewport represents the visible window into the pitch gamut (all available pitch rows).
 */
export interface ViewportInfo {
  /** Current zoom level (1.0 = base zoom) */
  zoomLevel: number;
  /** Full viewport height in pixels */
  viewportHeight: number;
  /** Pitch grid container height in pixels */
  containerHeight: number;
  /** Height of one cell in pixels */
  cellHeight: number;
  /** Half the cell height (fundamental unit for pitch rows) */
  halfUnit: number;
  /** First visible pitch row index (inclusive, into fullRowData) */
  startRank: number;
  /** Last visible pitch row index + 1 (exclusive, into fullRowData) */
  endRank: number;
  /** Vertical scroll offset in pixels */
  scrollOffset: number;
}

/**
 * Configuration for canvas resizing operations.
 */
export interface CanvasResizeConfig {
  logicalWidth?: number;
  logicalHeight?: number;
  pixelRatio: number;
}

/**
 * DOM element references managed by the layout service.
 */
export interface LayoutDOMElements {
  pitchGridWrapper: HTMLElement | null;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  legendLeftCanvas: HTMLCanvasElement | null;
  legendRightCanvas: HTMLCanvasElement | null;
  drumGridWrapper: HTMLElement | null;
  drumCanvas: HTMLCanvasElement | null;
  drumCtx: CanvasRenderingContext2D | null;
  drumPlayheadCanvas: HTMLCanvasElement | null;
  playheadCanvas: HTMLCanvasElement | null;
  hoverCanvas: HTMLCanvasElement | null;
  drumHoverCanvas: HTMLCanvasElement | null;
  buttonGridWrapper: HTMLElement | null;
  gridScrollbarProxy: HTMLElement | null;
  gridScrollbarInner: HTMLElement | null;
}

/**
 * Layout state maintained by the service.
 */
export interface LayoutState {
  currentZoomLevel: number;
  currentScrollPosition: number;
  viewportHeight: number;
  isRecalculating: boolean;
  isZooming: boolean;
  hasResolvedInitialLayout: boolean;
}

/**
 * Re-export PitchRange for convenience.
 */
export type { PitchRange };
