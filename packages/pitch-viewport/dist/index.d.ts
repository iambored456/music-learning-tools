/**
 * @mlt/pitch-viewport
 *
 * Shared viewport math utilities for pitch grids.
 * Pure functions only - no DOM dependencies.
 */
import type { PitchRowData } from '@mlt/types';
export interface PitchRange {
    topIndex: number;
    bottomIndex: number;
}
export type ZoomDirection = 'in' | 'out';
export interface ViewportMathOptions {
    totalRanks: number;
    minSpan?: number;
    zoomStep?: number;
}
export interface ZoomToFitOptions {
    baseUnit: number;
    paddingRows?: number;
}
export declare const DEFAULT_MIN_VIEWPORT_ROWS = 9;
export declare const DEFAULT_ZOOM_STEP_ROWS = 2;
export declare const MAX_ADAPTIVE_ZOOM_STEP_ROWS = 5;
/**
 * Returns a simple, ratio-based zoom step so wide ranges zoom faster and tight ranges zoom slower.
 */
export declare function getAdaptiveZoomStep(span: number, totalRanks: number, { maxStep }?: {
    maxStep?: number;
}): number;
export declare function getSpan(range: PitchRange): number;
export declare function clampToGamut(range: Partial<PitchRange>, totalRanks: number): PitchRange;
/**
 * Ensures the range is valid and has at least `minSpan` rows by expanding around its center.
 */
export declare function normalizeRange(range: Partial<PitchRange>, totalRanks: number, minSpan?: number): PitchRange;
export declare function getNormalizedRange(range: PitchRange | undefined, totalRanks: number, minSpan?: number): PitchRange;
/**
 * Sets the top endpoint while keeping the bottom fixed (wheel semantics).
 */
export declare function setTopEndpoint(current: PitchRange, requestedTop: number, totalRanks: number, minSpan?: number): PitchRange;
/**
 * Sets the bottom endpoint while keeping the top fixed (wheel semantics).
 */
export declare function setBottomEndpoint(current: PitchRange, requestedBottom: number, totalRanks: number, minSpan?: number): PitchRange;
/**
 * Computes the constrained top index without mutating state.
 */
export declare function computeConstrainedTopIndex(currentBottomIndex: number, requestedTop: number, totalRanks: number, minSpan?: number): number;
/**
 * Computes the constrained bottom index without mutating state.
 */
export declare function computeConstrainedBottomIndex(currentTopIndex: number, requestedBottom: number, totalRanks: number, minSpan?: number): number;
/**
 * Pans the viewport range by `deltaRows`, keeping its span constant.
 */
export declare function shiftRangeBy(current: PitchRange, deltaRows: number, totalRanks: number): PitchRange;
/**
 * Zooms the range in/out by moving both endpoints.
 */
export declare function zoomRange(current: PitchRange, direction: ZoomDirection, { totalRanks, minSpan, zoomStep }: ViewportMathOptions): PitchRange;
/**
 * Calculate the zoom level needed to fit a given number of rows in a container.
 */
export declare function calculateZoomToFitRowCount(containerHeight: number, rowCount: number, { baseUnit, paddingRows }: ZoomToFitOptions): number;
/**
 * Calculate viewport bounds from a pitch range.
 */
export declare function calculateViewportBounds(pitchRange: PitchRange | undefined, totalRanks: number, cellHeight: number): {
    startRank: number;
    endRank: number;
    scrollOffset: number;
};
/**
 * Create an interpolated range for smooth animations.
 */
export declare function interpolateRange(startRange: PitchRange, targetRange: PitchRange, t: number, totalRanks: number): PitchRange;
/**
 * Cubic ease-in-out function for smooth animations.
 */
export declare function easeInOutCubic(t: number): number;
export interface ViewportWindow {
    startRow: number;
    endRow: number;
    cellHeight: number;
    visibleRows: number;
}
export interface ViewportWindowConfig {
    containerHeight: number;
    fullRowData: PitchRowData[];
    preferredCellHeight?: number;
    minCellHeight?: number;
    centerOnMidi?: number;
}
/**
 * Calculate optimal viewport window that fills container height.
 */
export declare function calculateViewportWindow(config: ViewportWindowConfig): ViewportWindow;
/**
 * Scroll viewport up by specified number of rows.
 */
export declare function scrollViewportUp(currentWindow: ViewportWindow, totalRows: number, scrollRows?: number): ViewportWindow;
/**
 * Scroll viewport down by specified number of rows.
 */
export declare function scrollViewportDown(currentWindow: ViewportWindow, totalRows: number, scrollRows?: number): ViewportWindow;
//# sourceMappingURL=index.d.ts.map