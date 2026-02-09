// js/services/layoutService.ts
//
// NOTE: This file has been partially refactored. Helper functions have been
// extracted to sub-modules in ./layout/. The LayoutService object remains
// here for backwards compatibility.
//
// Sub-modules:
// - ./layout/types.ts - Type definitions
// - ./layout/viewportCalculations.ts - Pure viewport math
// - ./layout/canvasDimensions.ts - DOM/canvas sizing
// - ./layout/resizeHandler.ts - Resize event handling

import store from '@state/initStore.ts';
import { getColumnX as getColumnXFromPixelMap, getTotalPixelWidth } from './pixelMapService.ts';
import logger from '@utils/logger.ts';
import { isStampLayoutDebugEnabled, logStampLayout } from '@utils/stampLayoutDebug.ts';
import {
  DEFAULT_SCROLL_POSITION, GRID_WIDTH_RATIO,  BASE_DRUM_ROW_HEIGHT,
  DRUM_HEIGHT_SCALE_FACTOR, DRUM_ROW_COUNT,
  RESIZE_DEBOUNCE_DELAY,
  SIDE_COLUMN_WIDTH,
  BASE_ABSTRACT_UNIT
} from '@/core/constants.ts';
import { calculateColumnWidths, getCanvasWidth as getCanvasWidthFromColumns } from './columnsLayout.ts';
import { fullRowData as masterRowData } from '@state/pitchData.ts';
import { buildSpanLadder, DEFAULT_MIN_VIEWPORT_ROWS, getSpan, normalizeRange, setBottomEndpoint, setTopEndpoint, shiftRangeBy, zoomRangeOnSpanLadder } from '@utils/pitchViewport.ts';
import { calculateZoomToFitRowCount as calculateZoomToFitRowCountShared } from '@mlt/pitch-viewport';
import type { PitchRange } from '@app-types/state.js';

// Import from extracted modules
import {
  getDevicePixelRatio as getDevicePixelRatioFromModule,
  resizeCanvasForPixelRatio as resizeCanvasForPixelRatioFromModule,
  getPitchGridContainerHeight as getPitchGridContainerHeightFromModule
} from './layout/canvasDimensions.ts';
import {
  easeInOutCubic
} from './layout/viewportCalculations.ts';
import type { ViewportInfo } from './layout/types.ts';





/**
 * Terminology (PitchGrid)
 * ----------------------
 * - Pitch gamut: the full set of available pitch rows (see `src/state/pitchData.ts`, `masterRowData/fullRowData`).
 * - Pitch viewport: the currently visible window into that gamut (scroll/zoom derived; see `pitchRange` and `getViewportInfo()`).
 * - Pitch Y-axis labels: the left/right pitch label canvases (historically called "legend" canvases).
 *
 * This file mostly deals with viewport sizing (DOM -> canvas sizes) and mapping viewport state to row indices.
 */

// Pure abstract units - independent of container size





let currentZoomLevel = 1.0;
let currentScrollPosition = DEFAULT_SCROLL_POSITION;

let viewportHeight = 0;

let /* gridContainer, */ pitchGridWrapper: HTMLElement | null,
  canvas: HTMLCanvasElement | null,
  ctx: CanvasRenderingContext2D | null,
  legendLeftCanvas: HTMLCanvasElement | null,
  legendRightCanvas: HTMLCanvasElement | null,
  drumGridWrapper: HTMLElement | null,
  drumCanvas: HTMLCanvasElement | null,
  drumCtx: CanvasRenderingContext2D | null,
  drumPlayheadCanvas: HTMLCanvasElement | null,
  playheadCanvas: HTMLCanvasElement | null,
  hoverCanvas: HTMLCanvasElement | null,
  drumHoverCanvas: HTMLCanvasElement | null,
  buttonGridWrapper: HTMLElement | null;

let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

let isRecalculating = false;
let isZooming = false;
let pitchGridNotReadyLogged = false;
let beatLineWidthWarningShown = false;
let hasResolvedInitialLayout = false;
let lastViewportDebugLogAt = 0;
let deferredPitchResizeTimeout: ReturnType<typeof setTimeout> | null = null;
let postFramePitchHeightSyncFrame: number | null = null;
let pitchContainerResizeObserver: ResizeObserver | null = null;
let pitchContainerResizeSyncFrame: number | null = null;
let lastObservedPitchContainerHeight: number | null = null;
let pitchRangeAnimationFrame: number | null = null;
let pitchRangeAnimationToken = 0;
let zoomReferenceContainerHeight: number | null = null;
let resolveInitialLayout: (() => void) | null = null;
let pendingFinalRecalc = false;
let finalRecalcAttempts = 0;
const MAX_FINAL_RECALC_ATTEMPTS = 3;
let layoutPassCounter = 0;
let lastLayoutTriggerSource = 'init';
let lastLayoutTriggerMeta: Record<string, unknown> | null = null;
const initialLayoutPromise = new Promise<void>(resolve => {
  resolveInitialLayout = () => resolve();
});

// let lastCalculatedWidth = 0;  // Unused variable
let lastCalculatedDrumHeight = 0;
let lastCalculatedButtonGridHeight = 0;
let lockedButtonGridHeight: number | null = null;
const ENABLE_ZOOM_ANIMATION = false;
const ENABLE_LAYOUT_DIAGNOSTICS = false;

function getPitchGridContainerHeight(): number {
  // "pitch-grid-container" is the pitch *viewport container* (its height determines how much of the gamut is visible).
  const pitchGridContainer = document.getElementById('pitch-grid-container');
  const fallbackViewport = viewportHeight || window.innerHeight || 0;
  const height = pitchGridContainer?.clientHeight || (fallbackViewport ? fallbackViewport * 0.7 : 0);
  return height;
}

function calculateZoomToFitRowCount(containerHeight: number, rowCount: number): number {
  return calculateZoomToFitRowCountShared(containerHeight, rowCount, {
    baseUnit: BASE_ABSTRACT_UNIT,
    paddingRows: 0
  });
}

function getNormalizedPitchRange(): PitchRange {
  const totalRanks = store.state.fullRowData.length;
  const maxIndex = Math.max(0, totalRanks - 1);
  const current = store.state.pitchRange || { topIndex: 0, bottomIndex: maxIndex };
  return normalizeRange(current, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
}

function rangeFromCenterAndSpan(
  center: number,
  span: number,
  totalRanks: number
): PitchRange {
  const maxIndex = Math.max(0, totalRanks - 1);
  const normalizedSpan = Math.max(
    DEFAULT_MIN_VIEWPORT_ROWS,
    Math.min(totalRanks, Math.round(span))
  );
  const half = (normalizedSpan - 1) / 2;

  let topIndex = Math.round(center - half);
  let bottomIndex = topIndex + normalizedSpan - 1;

  if (topIndex < 0) {
    bottomIndex += -topIndex;
    topIndex = 0;
  }
  if (bottomIndex > maxIndex) {
    const overshoot = bottomIndex - maxIndex;
    topIndex -= overshoot;
    bottomIndex = maxIndex;
  }

  topIndex = Math.max(0, Math.min(maxIndex, topIndex));
  bottomIndex = Math.max(topIndex, Math.min(maxIndex, bottomIndex));

  return normalizeRange(
    { topIndex, bottomIndex },
    totalRanks,
    DEFAULT_MIN_VIEWPORT_ROWS
  );
}

function quantizeWithHysteresis(
  rawValue: number,
  previousValue: number | null,
  hysteresisPx: number
): number {
  const rounded = Math.round(rawValue);
  if (previousValue === null || !Number.isFinite(previousValue)) {
    return rounded;
  }
  if (Math.abs(rawValue - previousValue) <= Math.max(0, hysteresisPx)) {
    return Math.round(previousValue);
  }
  return rounded;
}

function getMinimumCellHeightForViewportCoverage(containerHeight: number, rowCount: number): number {
  if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
    return 1;
  }
  const normalizedRowCount = Math.max(1, Math.round(rowCount));
  // Row centers are spaced at half-unit intervals; to avoid a visible bottom strip after
  // integer quantization we require (rowCount + 1) * halfUnit >= containerHeight.
  const minimum = (2 * containerHeight) / (normalizedRowCount + 1);
  return Math.max(1, Math.ceil(minimum));
}

function resolveZoomAnimationDuration(requestedDurationMs: number, source: string): number {
  if (!ENABLE_ZOOM_ANIMATION) {
    return 0;
  }
  if (source === 'wheel') {
    return 0;
  }
  return Math.max(0, Math.round(requestedDurationMs));
}

function getHorizontalScrollbarBlockSize(container: HTMLElement | null): number {
  if (!container) {
    return 0;
  }
  const scrollbarBlockSize = container.offsetHeight - container.clientHeight;
  return Math.max(0, Number.isFinite(scrollbarBlockSize) ? scrollbarBlockSize : 0);
}

function cancelPitchRangeAnimation(): void {
  if (pitchRangeAnimationFrame !== null) {
    cancelAnimationFrame(pitchRangeAnimationFrame);
    pitchRangeAnimationFrame = null;
  }
  if (postFramePitchHeightSyncFrame !== null) {
    cancelAnimationFrame(postFramePitchHeightSyncFrame);
    postFramePitchHeightSyncFrame = null;
  }
  if (pitchContainerResizeSyncFrame !== null) {
    cancelAnimationFrame(pitchContainerResizeSyncFrame);
    pitchContainerResizeSyncFrame = null;
  }
  pitchRangeAnimationToken += 1;
  isZooming = false;
  zoomReferenceContainerHeight = null;
}

function applyPitchRange(nextRange: PitchRange, source: string): void {
  const totalRanks = store.state.fullRowData.length;
  const prevRange = getNormalizedPitchRange();
  const normalizedNext = normalizeRange(nextRange, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);

  if (normalizedNext.topIndex === prevRange.topIndex && normalizedNext.bottomIndex === prevRange.bottomIndex) {
    return;
  }

  const prevTop = prevRange.topIndex;
  const prevSpan = getSpan(prevRange);

  store.setPitchRange(normalizedNext);
  store.emit('scrollChanged');

  const rowDelta = normalizedNext.topIndex - prevTop;
  if (rowDelta !== 0) {
    store.emit('scrollByUnits', rowDelta);
  }

  const spanChanged = getSpan(normalizedNext) !== prevSpan;
  if (spanChanged) {
    setLayoutTrigger('applyPitchRange:spanChanged', {
      source,
      prevSpan,
      nextSpan: getSpan(normalizedNext)
    });
    recalcAndApplyLayout();
    store.emit('zoomChanged');
    return;
  }

  document.dispatchEvent(new CustomEvent('canvasResized', { detail: { source } }));
}

function animatePitchRangeTo(targetRange: PitchRange, durationMs: number, source: string): void {
  cancelPitchRangeAnimation();
  isZooming = true;
  zoomReferenceContainerHeight = getPitchGridContainerHeight();

  const totalRanks = store.state.fullRowData.length;
  const startRange = getNormalizedPitchRange();
  const normalizedTarget = normalizeRange(targetRange, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);

  if (normalizedTarget.topIndex === startRange.topIndex && normalizedTarget.bottomIndex === startRange.bottomIndex) {
    isZooming = false;
    zoomReferenceContainerHeight = null;
    return;
  }

  const token = pitchRangeAnimationToken;
  const startTime = performance.now();
  const duration = Math.max(0, Math.round(durationMs));
  let lastTop = startRange.topIndex;
  let lastSpan = getSpan(startRange);
  const startSpan = getSpan(startRange);
  const targetSpan = getSpan(normalizedTarget);
  const startCenter = (startRange.topIndex + startRange.bottomIndex) / 2;
  const targetCenter = (normalizedTarget.topIndex + normalizedTarget.bottomIndex) / 2;
  const isZoomOut = targetSpan >= startSpan;

  const easeInOutCubic = (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const step = () => {
    if (token !== pitchRangeAnimationToken) {return;}

    const now = performance.now();
    const rawT = duration > 0 ? (now - startTime) / duration : 1;
    const t = Math.max(0, Math.min(1, rawT));
    const eased = easeInOutCubic(t);

    const rawCenter = startCenter + ((targetCenter - startCenter) * eased);
    const rawSpan = startSpan + ((targetSpan - startSpan) * eased);

    const interpolatedSpan = isZoomOut
      ? Math.ceil(rawSpan)
      : Math.floor(rawSpan);

    const boundedSpan = Math.max(
      Math.min(startSpan, targetSpan),
      Math.min(Math.max(startSpan, targetSpan), interpolatedSpan)
    );

    const frameRange = t >= 1
      ? normalizedTarget
      : rangeFromCenterAndSpan(rawCenter, boundedSpan, totalRanks);

    store.setPitchRange(frameRange);
    store.emit('scrollChanged');

    const rowDelta = frameRange.topIndex - lastTop;
    if (rowDelta !== 0) {
      store.emit('scrollByUnits', rowDelta);
      lastTop = frameRange.topIndex;
    }
    const frameSpan = getSpan(frameRange);
    const spanChanged = frameSpan !== lastSpan;

    setLayoutTrigger('animatePitchRangeTo:frame', {
      source,
      t: Math.round(t * 1000) / 1000,
      topIndex: frameRange.topIndex,
      bottomIndex: frameRange.bottomIndex,
      span: frameSpan,
      spanChanged
    });
    if (t < 1) {
      if (spanChanged) {
        lastSpan = frameSpan;
        recalcAndApplyLayout();
        store.emit('zoomChanged');
      }
      pitchRangeAnimationFrame = requestAnimationFrame(step);
      return;
    }

    // Final frame: end zoom mode first so the settle pass can run full correction logic.
    pitchRangeAnimationFrame = null;
    isZooming = false;
    zoomReferenceContainerHeight = null;
    setLayoutTrigger('animatePitchRangeTo:complete', {
      source,
      topIndex: frameRange.topIndex,
      bottomIndex: frameRange.bottomIndex
    });
    recalcAndApplyLayout();
    store.emit('zoomChanged');
  };

  pitchRangeAnimationFrame = requestAnimationFrame(step);
}

function isViewportDebugEnabled(): boolean {
  // Be defensive: in some contexts `localStorage` access can throw (privacy modes, file://, etc).
  // We want `window.__SN_DEBUG_VIEWPORT = true` to work even if storage/query parsing fails.
  try {
    const win = globalThis as typeof globalThis & { __SN_DEBUG_VIEWPORT?: boolean };
    if (Boolean(win.__SN_DEBUG_VIEWPORT)) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    const byQueryParam = new URLSearchParams(window.location.search).get('debugViewport') === '1';
    if (byQueryParam) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    return localStorage.getItem('sn:debugViewport') === '1';
  } catch {
    return false;
  }
}

let _didAnnounceViewportDebug = false;
function logViewportDebug(message: string, data: Record<string, unknown>): void {
  if (!isViewportDebugEnabled()) {return;}
  try {
    const now = performance?.now?.() ?? Date.now();
    if (now - lastViewportDebugLogAt < 500) {return;}
    lastViewportDebugLogAt = now;
    _didAnnounceViewportDebug = true;
    void message;
    void data;
  } catch {
    // Never let debug logging break layout.
  }
}

function isGridSeamDebugEnabled(): boolean {
  if (!ENABLE_LAYOUT_DIAGNOSTICS) {
    return false;
  }
  try {
    const win = globalThis as typeof globalThis & { __SN_DEBUG_GRID_SEAM?: boolean };
    if (Boolean(win.__SN_DEBUG_GRID_SEAM)) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    const byQueryParam = new URLSearchParams(window.location.search).get('debugGridSeam') === '1';
    if (byQueryParam) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    return localStorage.getItem('sn:debugGridSeam') === '1';
  } catch {
    return false;
  }
}

function roundDebugValue(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

function parseDatasetNumber(value: string | undefined): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getLogicalCanvasWidthOrNull(canvasElement: HTMLCanvasElement | null): number | null {
  if (!canvasElement) {
    return null;
  }
  const fromDataset = parseDatasetNumber(canvasElement.dataset['logicalWidth']);
  if (fromDataset !== null && fromDataset > 0) {
    return fromDataset;
  }
  const rectWidth = canvasElement.getBoundingClientRect().width;
  if (Number.isFinite(rectWidth) && rectWidth > 0) {
    return rectWidth;
  }
  return canvasElement.clientWidth > 0 ? canvasElement.clientWidth : null;
}

function syncPitchCanvasHeightsToContainer(
  reason: string,
  extra: Record<string, unknown> = {}
): boolean {
  const pitchGridContainer = document.getElementById('pitch-grid-container');
  if (!pitchGridContainer) {
    if (isStampLayoutDebugEnabled()) {
      logStampLayout('layout:syncPitchCanvasHeights:skip-no-container', { reason, extra });
    }
    return false;
  }

  const settledHeight = pitchGridContainer.clientHeight || 0;
  if (settledHeight <= 0) {
    if (isStampLayoutDebugEnabled()) {
      logStampLayout('layout:syncPitchCanvasHeights:skip-zero-height', {
        reason,
        extra,
        settledHeight
      });
    }
    return false;
  }

  const notationWidth = getLogicalCanvasWidthOrNull(canvas);
  const leftLegendWidth = getLogicalCanvasWidthOrNull(legendLeftCanvas);
  const rightLegendWidth = getLogicalCanvasWidthOrNull(legendRightCanvas);
  const pixelRatio = parseDatasetNumber(canvas?.dataset['pixelRatio']) ?? getDevicePixelRatio();

  const currentPitchLogicalHeight = parseDatasetNumber(canvas?.dataset['logicalHeight']);
  const currentLeftLegendLogicalHeight = parseDatasetNumber(legendLeftCanvas?.dataset['logicalHeight']);
  const currentRightLegendLogicalHeight = parseDatasetNumber(legendRightCanvas?.dataset['logicalHeight']);

  const pitchInSync = currentPitchLogicalHeight !== null && Math.abs(currentPitchLogicalHeight - settledHeight) <= 0.5;
  const leftInSync = legendLeftCanvas === null
    || (currentLeftLegendLogicalHeight !== null && Math.abs(currentLeftLegendLogicalHeight - settledHeight) <= 0.5);
  const rightInSync = legendRightCanvas === null
    || (currentRightLegendLogicalHeight !== null && Math.abs(currentRightLegendLogicalHeight - settledHeight) <= 0.5);

  if (pitchInSync && leftInSync && rightInSync) {
    if (isStampLayoutDebugEnabled()) {
      logStampLayout('layout:syncPitchCanvasHeights:already-in-sync', {
        reason,
        settledHeight,
        currentPitchLogicalHeight,
        currentLeftLegendLogicalHeight,
        currentRightLegendLogicalHeight,
        extra
      });
    }
    return false;
  }

  if (isStampLayoutDebugEnabled()) {
    logStampLayout('layout:syncPitchCanvasHeights:apply', {
      reason,
      settledHeight,
      notationWidth,
      leftLegendWidth,
      rightLegendWidth,
      pixelRatio,
      currentPitchLogicalHeight,
      currentLeftLegendLogicalHeight,
      currentRightLegendLogicalHeight,
      extra
    });
  }

  const pitchCanvasTargets = [
    { element: canvas, context: ctx },
    { element: playheadCanvas, context: null as CanvasRenderingContext2D | null },
    { element: hoverCanvas, context: null as CanvasRenderingContext2D | null }
  ];

  pitchCanvasTargets.forEach(({ element, context }) => {
    resizeCanvasForPixelRatio(element, notationWidth ?? undefined, settledHeight, pixelRatio, context);
    if (element && leftLegendWidth !== null) {
      element.style.left = `${leftLegendWidth}px`;
    }
  });

  resizeCanvasForPixelRatio(legendLeftCanvas, leftLegendWidth ?? undefined, settledHeight, pixelRatio, null);
  resizeCanvasForPixelRatio(legendRightCanvas, rightLegendWidth ?? undefined, settledHeight, pixelRatio, null);

  logGridSeamSnapshot('pitch-height-resync', {
    reason,
    settledHeight,
    notationWidth,
    leftLegendWidth,
    rightLegendWidth,
    currentPitchLogicalHeight,
    currentLeftLegendLogicalHeight,
    currentRightLegendLogicalHeight,
    ...extra
  });

  document.dispatchEvent(new CustomEvent('canvasResized', {
    detail: { source: `layoutService-${reason}` }
  }));

  if (isStampLayoutDebugEnabled()) {
    logStampLayout('layout:syncPitchCanvasHeights:canvasResized-dispatch', {
      source: `layoutService-${reason}`
    });
  }

  return true;
}

function schedulePitchContainerHeightSync(
  reason: string,
  extra: Record<string, unknown> = {}
): void {
  if (isStampLayoutDebugEnabled()) {
    logStampLayout('layout:schedulePitchContainerHeightSync', {
      reason,
      extra,
      hadPendingFrame: pitchContainerResizeSyncFrame !== null
    });
  }
  if (pitchContainerResizeSyncFrame !== null) {
    cancelAnimationFrame(pitchContainerResizeSyncFrame);
  }
  pitchContainerResizeSyncFrame = requestAnimationFrame(() => {
    pitchContainerResizeSyncFrame = null;
    syncPitchCanvasHeightsToContainer(reason, extra);
  });
}

function setupPitchContainerResizeObserver(): void {
  if (pitchContainerResizeObserver) {
    pitchContainerResizeObserver.disconnect();
    pitchContainerResizeObserver = null;
  }
  if (typeof ResizeObserver === 'undefined') {
    return;
  }

  const pitchGridContainer = document.getElementById('pitch-grid-container');
  if (!pitchGridContainer) {
    return;
  }

  lastObservedPitchContainerHeight = pitchGridContainer.clientHeight || null;
  pitchContainerResizeObserver = new ResizeObserver((entries) => {
    const nextHeight = entries[0]?.contentRect?.height ?? pitchGridContainer.clientHeight;
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
      return;
    }
    if (
      lastObservedPitchContainerHeight !== null
      && Math.abs(nextHeight - lastObservedPitchContainerHeight) <= 0.5
    ) {
      return;
    }

    const previousHeight = lastObservedPitchContainerHeight;
    lastObservedPitchContainerHeight = nextHeight;
    if (isStampLayoutDebugEnabled()) {
      logStampLayout('layout:pitch-container-resize-observer', {
        nextHeight: roundDebugValue(nextHeight),
        previousHeight: roundDebugValue(previousHeight),
        delta: roundDebugValue(
          previousHeight === null ? null : nextHeight - previousHeight
        )
      });
    }
    schedulePitchContainerHeightSync('container-resize-observer', {
      observedHeight: roundDebugValue(nextHeight),
      previousObservedHeight: roundDebugValue(previousHeight)
    });
  });
  pitchContainerResizeObserver.observe(pitchGridContainer);
}

function getElementMetrics(element: HTMLElement | null): Record<string, number | null> | null {
  if (!element) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  return {
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    offsetWidth: element.offsetWidth,
    offsetHeight: element.offsetHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
    rectWidth: roundDebugValue(rect.width),
    rectHeight: roundDebugValue(rect.height)
  };
}

function getCanvasMetrics(canvasElement: HTMLCanvasElement | null): Record<string, number | null> | null {
  if (!canvasElement) {
    return null;
  }
  const baseMetrics = getElementMetrics(canvasElement);
  return {
    ...baseMetrics,
    logicalWidth: parseDatasetNumber(canvasElement.dataset['logicalWidth']),
    logicalHeight: parseDatasetNumber(canvasElement.dataset['logicalHeight']),
    bufferWidth: canvasElement.width,
    bufferHeight: canvasElement.height
  };
}

function isLayoutSizingDebugEnabled(): boolean {
  if (!ENABLE_LAYOUT_DIAGNOSTICS) {
    return false;
  }
  try {
    const win = globalThis as typeof globalThis & { __SN_DEBUG_LAYOUT_SIZING?: boolean };
    if (Boolean(win.__SN_DEBUG_LAYOUT_SIZING)) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    const byQueryParam = new URLSearchParams(window.location.search).get('debugLayoutSizing') === '1';
    if (byQueryParam) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    if (localStorage.getItem('sn:debugLayoutSizing') === '1') {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

function logLayoutSizingSnapshot(stage: string, extra: Record<string, unknown> = {}): void {
  if (!isLayoutSizingDebugEnabled()) {return;}

  try {
    const appContainer = document.getElementById('app-container');
    const toolbar = document.getElementById('toolbar');
    const canvasContainer = document.getElementById('canvas-container');
    const canvasContent = document.getElementById('canvas-content');
    const gridsWrapper = document.getElementById('grids-wrapper');
    const buttonGrid = document.getElementById('button-grid');
    const buttonMiddleCell = document.querySelector<HTMLElement>('.button-grid-middle-cell');
    const pitchGridWrapperEl = document.getElementById('pitch-grid-wrapper');
    const pitchGridContainer = document.getElementById('pitch-grid-container');
    const drumGridWrapperEl = document.getElementById('drum-grid-wrapper');
    const drumMiddleCell = document.querySelector<HTMLElement>('.drum-grid-middle-cell');
    const drumCanvasWrapper = document.getElementById('drum-canvas-wrapper');

    const notation = document.getElementById('notation-grid') as HTMLCanvasElement | null;
    const legendLeft = document.getElementById('legend-left-canvas') as HTMLCanvasElement | null;
    const legendRight = document.getElementById('legend-right-canvas') as HTMLCanvasElement | null;
    const drumGridCanvas = document.getElementById('drum-grid') as HTMLCanvasElement | null;

    const gridsWrapperScrollbarBlockSize = gridsWrapper
      ? Math.max(0, gridsWrapper.offsetHeight - gridsWrapper.clientHeight)
      : null;

    const payload = {
      stage,
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        dpr: window.devicePixelRatio ?? 1
      },
      containers: {
        appContainer: getElementMetrics(appContainer),
        toolbar: getElementMetrics(toolbar),
        canvasContainer: getElementMetrics(canvasContainer),
        canvasContent: getElementMetrics(canvasContent),
        gridsWrapper: getElementMetrics(gridsWrapper),
        gridsWrapperScrollbarBlockSize,
        buttonGrid: getElementMetrics(buttonGrid),
        buttonMiddleCell: getElementMetrics(buttonMiddleCell),
        pitchGridWrapper: getElementMetrics(pitchGridWrapperEl),
        pitchGridContainer: getElementMetrics(pitchGridContainer),
        drumGridWrapper: getElementMetrics(drumGridWrapperEl),
        drumMiddleCell: getElementMetrics(drumMiddleCell),
        drumCanvasWrapper: getElementMetrics(drumCanvasWrapper)
      },
      canvases: {
        notation: getCanvasMetrics(notation),
        legendLeft: getCanvasMetrics(legendLeft),
        legendRight: getCanvasMetrics(legendRight),
        drumGrid: getCanvasMetrics(drumGridCanvas)
      },
      overflow: {
        gridsWrapperOverflowX: gridsWrapper ? window.getComputedStyle(gridsWrapper).overflowX : null,
        gridsWrapperOverflowY: gridsWrapper ? window.getComputedStyle(gridsWrapper).overflowY : null,
        pitchGridContainerOverflowX: pitchGridContainer ? window.getComputedStyle(pitchGridContainer).overflowX : null,
        pitchGridContainerOverflowY: pitchGridContainer ? window.getComputedStyle(pitchGridContainer).overflowY : null,
        drumGridWrapperOverflowX: drumGridWrapperEl ? window.getComputedStyle(drumGridWrapperEl).overflowX : null,
        drumGridWrapperOverflowY: drumGridWrapperEl ? window.getComputedStyle(drumGridWrapperEl).overflowY : null
      },
      ...extra
    };

    console.log(`[SN:layout-sizing] ${stage}`, payload);
  } catch (error) {
    console.warn('[SN:layout-sizing] logging failed', error);
  }
}

let lastGridSeamDebugLogAt = 0;
function logGridSeamSnapshot(stage: string, extra: Record<string, unknown> = {}): void {
  if (!isGridSeamDebugEnabled()) {return;}

  try {
    const pitchContainer = document.getElementById('pitch-grid-container');
    const gridsWrapper = document.getElementById('grids-wrapper');
    const buttonMiddleCell = document.querySelector<HTMLElement>('.button-grid-middle-cell');
    const drumMiddleCell = document.querySelector<HTMLElement>('.drum-grid-middle-cell');

    const notation = document.getElementById('notation-grid') as HTMLCanvasElement | null;
    const legendLeft = document.getElementById('legend-left-canvas') as HTMLCanvasElement | null;
    const legendRight = document.getElementById('legend-right-canvas') as HTMLCanvasElement | null;

    if (!pitchContainer || !notation || !legendRight) {
      console.log(`[SN:grid-seam] ${stage}`, {
        ...extra,
        missing: {
          pitchContainer: !pitchContainer,
          notation: !notation,
          legendRight: !legendRight
        }
      });
      return;
    }

    const containerRect = pitchContainer.getBoundingClientRect();
    const notationRect = notation.getBoundingClientRect();
    const legendRightRect = legendRight.getBoundingClientRect();

    const seamGapPx = legendRightRect.left - notationRect.right;
    const seamFromContainerPx = (legendRightRect.left - containerRect.left) - ((notationRect.left - containerRect.left) + notationRect.width);

    const legendLeftLogicalWidth = parseDatasetNumber(legendLeft?.dataset['logicalWidth']);
    const notationLogicalWidth = parseDatasetNumber(notation.dataset['logicalWidth']);
    const legendRightLogicalWidth = parseDatasetNumber(legendRight.dataset['logicalWidth']);

    const logicalSpan = (legendLeftLogicalWidth ?? 0) + (notationLogicalWidth ?? 0) + (legendRightLogicalWidth ?? 0);
    const containerClientWidth = pitchContainer.clientWidth;
    const containerSlackPx = logicalSpan > 0 ? containerClientWidth - logicalSpan : null;
    const normalizedRange = getNormalizedPitchRange();
    const rowCount = Math.max(1, getSpan(normalizedRange));
    const cellHeight = Number.isFinite(store.state.cellHeight) && (store.state.cellHeight ?? 0) > 0
      ? (store.state.cellHeight as number)
      : null;
    const halfUnit = cellHeight !== null ? cellHeight / 2 : null;
    const coveragePx = halfUnit !== null ? ((rowCount + 1) * halfUnit) : null;
    const coverageGapPx = coveragePx !== null ? (pitchContainer.clientHeight - coveragePx) : null;
    const minimumCellHeightForCoverage = getMinimumCellHeightForViewportCoverage(pitchContainer.clientHeight, rowCount);
    const underCoveragePx = coverageGapPx !== null ? Math.max(0, coverageGapPx) : null;
    const startRow = store.state.fullRowData[normalizedRange.topIndex];
    const endRow = store.state.fullRowData[normalizedRange.bottomIndex];

    const now = performance?.now?.() ?? Date.now();
    const severeMismatch = Math.abs(seamGapPx) > 0.75 || (containerSlackPx !== null && Math.abs(containerSlackPx) > 0.75);
    if (!severeMismatch && now - lastGridSeamDebugLogAt < 120) {
      return;
    }
    lastGridSeamDebugLogAt = now;

    const payload = {
      stage,
      seamGapPx: roundDebugValue(seamGapPx),
      seamFromContainerPx: roundDebugValue(seamFromContainerPx),
      containerSlackPx: roundDebugValue(containerSlackPx),
      widths: {
        containerClient: containerClientWidth,
        containerRect: roundDebugValue(containerRect.width),
        notationRect: roundDebugValue(notationRect.width),
        legendRightRect: roundDebugValue(legendRightRect.width),
        buttonMiddleRect: roundDebugValue(buttonMiddleCell?.getBoundingClientRect().width ?? null),
        drumMiddleRect: roundDebugValue(drumMiddleCell?.getBoundingClientRect().width ?? null)
      },
      logicalWidths: {
        legendLeft: legendLeftLogicalWidth,
        notation: notationLogicalWidth,
        legendRight: legendRightLogicalWidth
      },
      scroll: {
        gridsWrapperScrollLeft: gridsWrapper?.scrollLeft ?? null,
        gridsWrapperClientWidth: gridsWrapper?.clientWidth ?? null,
        gridsWrapperScrollWidth: gridsWrapper?.scrollWidth ?? null
      },
      verticalCoverage: {
        containerHeight: pitchContainer.clientHeight,
        rowCount,
        cellHeight: cellHeight ?? null,
        minimumCellHeightForCoverage,
        halfUnit: halfUnit !== null ? roundDebugValue(halfUnit) : null,
        coveragePx: coveragePx !== null ? roundDebugValue(coveragePx) : null,
        coverageGapPx: coverageGapPx !== null ? roundDebugValue(coverageGapPx) : null,
        underCoveragePx: underCoveragePx !== null ? roundDebugValue(underCoveragePx) : null,
        isUnderCovered: underCoveragePx !== null ? underCoveragePx > 0.75 : null,
        topIndex: normalizedRange.topIndex,
        bottomIndex: normalizedRange.bottomIndex,
        topRow: startRow ? { pitch: startRow.pitch, column: startRow.column, isBoundary: Boolean((startRow as any).isBoundary) } : null,
        bottomRow: endRow ? { pitch: endRow.pitch, column: endRow.column, isBoundary: Boolean((endRow as any).isBoundary) } : null
      },
      dpr: window.devicePixelRatio ?? 1,
      ...extra
    };

    if (severeMismatch) {
      console.warn(`[SN:grid-seam] ${stage}`, payload);
    } else {
      console.log(`[SN:grid-seam] ${stage}`, payload);
    }
  } catch (error) {
    console.warn('[SN:grid-seam] logging failed', error);
  }
}

function setLayoutTrigger(source: string, meta: Record<string, unknown> = {}): void {
  lastLayoutTriggerSource = source;
  lastLayoutTriggerMeta = meta;
  if (isStampLayoutDebugEnabled()) {
    logStampLayout('layout:set-trigger', { source, meta }, { includeSnapshot: false });
  }
}

function isLayoutFlowDebugEnabled(): boolean {
  if (!ENABLE_LAYOUT_DIAGNOSTICS) {
    return false;
  }
  try {
    const win = globalThis as typeof globalThis & { __SN_DEBUG_LAYOUT_FLOW?: boolean };
    if (Boolean(win.__SN_DEBUG_LAYOUT_FLOW)) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    const byQueryParam = new URLSearchParams(window.location.search).get('debugLayoutFlow') === '1';
    if (byQueryParam) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    return localStorage.getItem('sn:debugLayoutFlow') === '1';
  } catch {
    return false;
  }
}

let lastLayoutFlowLogAt = 0;
function logLayoutFlowSnapshot(stage: string, data: Record<string, unknown>): void {
  if (!isLayoutFlowDebugEnabled()) {return;}

  try {
    const now = performance?.now?.() ?? Date.now();
    if (now - lastLayoutFlowLogAt < 60) {return;}
    lastLayoutFlowLogAt = now;
    console.log(`[SN:layout-flow] ${stage}`, data);
  } catch {
    // Never let debug logging break layout.
  }
}


function getDevicePixelRatio() {


  const ratio = window?.devicePixelRatio ?? 1;


  if (!Number.isFinite(ratio) || ratio <= 0) {


    return 1;


  }


  return ratio;


}





function resizeCanvasForPixelRatio(
  canvasElement: HTMLCanvasElement | null,
  logicalWidth: number | undefined,
  logicalHeight: number | undefined,
  pixelRatio: number,
  existingContext?: CanvasRenderingContext2D | null
) {


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





function initDOMElements() {


  // gridContainer = document.getElementById('grid-container');  // Unused variable


  pitchGridWrapper = document.getElementById('pitch-grid-wrapper');


  canvas = document.getElementById('notation-grid') as HTMLCanvasElement | null;


  legendLeftCanvas = document.getElementById('legend-left-canvas') as HTMLCanvasElement | null;


  legendRightCanvas = document.getElementById('legend-right-canvas') as HTMLCanvasElement | null;


  drumGridWrapper = document.getElementById('drum-grid-wrapper');


  drumCanvas = document.getElementById('drum-grid') as HTMLCanvasElement | null;


  drumPlayheadCanvas = document.getElementById('drum-playhead-canvas') as HTMLCanvasElement | null;


  playheadCanvas = document.getElementById('playhead-canvas') as HTMLCanvasElement | null;


  hoverCanvas = document.getElementById('hover-canvas') as HTMLCanvasElement | null;


  drumHoverCanvas = document.getElementById('drum-hover-canvas') as HTMLCanvasElement | null;



  buttonGridWrapper = document.getElementById('button-grid');





  const canvasContainer = document.getElementById('canvas-container');





  if (!pitchGridWrapper || !canvas || !canvasContainer) {


    return {};


  }





  ctx = canvas.getContext('2d');


  drumCtx = drumCanvas?.getContext('2d') || null;


  const legendLeftCtx = legendLeftCanvas?.getContext('2d') || null;


  const legendRightCtx = legendRightCanvas?.getContext('2d') || null;


  return { ctx, drumCtx, legendLeftCtx, legendRightCtx, canvasContainer };


}





function markInitialLayoutReady(): void {
  if (hasResolvedInitialLayout) {
    return;
  }

  const hasColumns = (store.state.columnWidths?.length || 0) > 0;
  const hasCellWidth = Boolean(store.state.cellWidth && store.state.cellWidth > 0);

  if (!hasColumns || !hasCellWidth) {
    return;
  }

  hasResolvedInitialLayout = true;
  resolveInitialLayout?.();
}

function recalcAndApplyLayout() {
  if (!pitchGridWrapper || pitchGridWrapper.clientHeight === 0) {


    if (!pitchGridNotReadyLogged) {


      logger.warn('LayoutService', 'Pitch grid wrapper not ready for layout (height=0). Retrying on next frame.', null, 'layout');


      pitchGridNotReadyLogged = true;


    }


    setLayoutTrigger('recalc:wrapper-not-ready', {
      wrapperHeight: pitchGridWrapper?.clientHeight ?? null
    });
    requestAnimationFrame(recalcAndApplyLayout);


    return;


  }


  pitchGridNotReadyLogged = false;





  if (isRecalculating) {


    return;


  }





  isRecalculating = true;
  const layoutPassId = ++layoutPassCounter;
  const layoutTriggerSource = lastLayoutTriggerSource;
  const layoutTriggerMeta = lastLayoutTriggerMeta;
  lastLayoutTriggerSource = 'internal:unspecified';
  lastLayoutTriggerMeta = null;





  const pitchGridContainer = document.getElementById('pitch-grid-container');


  const _containerWidth = pitchGridWrapper.clientWidth;

  const windowHeight = window.innerHeight;


  const referenceDiff = Math.abs(windowHeight - viewportHeight);





  if (referenceDiff > 3 || viewportHeight === 0) {


    viewportHeight = windowHeight;


  }






  // const availableHeight = pitchGridContainer.clientHeight || (windowHeight * 0.7);  // Unused variable


  // const viewportWidth = containerWidth;  // Unused variable


  // cellHeight is the fundamental abstract unit, scaled only by zoom


  const baseCellHeight = BASE_ABSTRACT_UNIT;


  const baseCellWidth = baseCellHeight * GRID_WIDTH_RATIO;

  // RANGE-AUTHORITATIVE VIEWPORT:
  // `pitchRange` endpoints define the vertical span; zoom is derived to fit that span into the container.
  const normalizedRange = getNormalizedPitchRange();
  const gridsWrapper = document.getElementById('grids-wrapper');
  const horizontalScrollbarBlockSize = getHorizontalScrollbarBlockSize(gridsWrapper);
  const liveContainerHeight = getPitchGridContainerHeight();
  const effectiveContainerHeight = liveContainerHeight + horizontalScrollbarBlockSize;
  const zoomContainerHeight = isZooming
    && typeof zoomReferenceContainerHeight === 'number'
    && zoomReferenceContainerHeight > 0
    ? zoomReferenceContainerHeight
    : null;
  const containerHeight = zoomContainerHeight ?? effectiveContainerHeight;
  const rowCount = Math.max(1, getSpan(normalizedRange));
  currentZoomLevel = calculateZoomToFitRowCount(containerHeight, rowCount);

  // Keep X and Y scaling coupled so pitch cells remain square under zoom.
  // Scrollbar feedback is handled structurally by taking the proxy out of layout flow.
  const rawCellHeight = baseCellHeight * currentZoomLevel;
  const previousCellHeight = Number.isFinite(store.state.cellHeight) && (store.state.cellHeight ?? 0) > 0
    ? (store.state.cellHeight as number)
    : null;
  const quantizedCellHeight = quantizeWithHysteresis(rawCellHeight, previousCellHeight, isZooming ? 0.08 : 0.24);
  const minimumCellHeightForCoverage = getMinimumCellHeightForViewportCoverage(containerHeight, rowCount);
  const newCellHeight = Math.max(quantizedCellHeight, minimumCellHeightForCoverage);
  const newCellWidth = Math.round(newCellHeight * GRID_WIDTH_RATIO);
  const effectiveHalfUnit = newCellHeight / 2;
  const coveredBottomEdgePx = (rowCount + 1) * effectiveHalfUnit;
  const rowCoverageGapPx = containerHeight - coveredBottomEdgePx;

  store.setLayoutConfig({
    cellHeight: newCellHeight,
    cellWidth: newCellWidth
  });

  // Keep a stable width basis for this entire pass.
  // A later "final container height" correction may update store.state.cellWidth,
  // but this pass must stay internally consistent to avoid legend/canvas gaps.
  const passCellWidth = newCellWidth;

  const newColumnWidths = calculateColumnWidths(store.state);
  store.setLayoutConfig({
    columnWidths: newColumnWidths
  });

  const hadResolvedInitialLayout = hasResolvedInitialLayout;
  markInitialLayoutReady();

  if (!store.state.cellWidth || !newColumnWidths.length) {
    logger.warn('LayoutService', 'Unexpected layout configuration', {
      cellWidth: store.state.cellWidth,
      columnCount: newColumnWidths.length
    }, 'layout');
  }





  const totalWidthUnits = newColumnWidths.reduce((sum, w) => sum + w, 0);


  const musicalCanvasWidth = totalWidthUnits * passCellWidth;  // Musical area only (canvas-space)


  const modulatedMusicalWidth = LayoutService.getModulatedCanvasWidth();


  // Always use modulated width if modulation is active (allows compression)
  // Only fall back to unmodulated musical width if no modulation present
  const hasModulation = store.state.tempoModulationMarkers && store.state.tempoModulationMarkers.length > 0;
  const finalMusicalWidth = hasModulation ? modulatedMusicalWidth : musicalCanvasWidth;

  // After Phase 8: Add legend widths to musical width to get total grid width
  const leftLegendWidthUnits = SIDE_COLUMN_WIDTH * 2 * passCellWidth;
  const rightLegendWidthUnits = SIDE_COLUMN_WIDTH * 2 * passCellWidth;
  const totalCanvasWidthPx = Math.round(finalMusicalWidth + leftLegendWidthUnits + rightLegendWidthUnits);

  const pixelRatio = getDevicePixelRatio();





  const _drumGridWrapper = document.getElementById('drum-grid-wrapper');


  const targetWidth = totalCanvasWidthPx + 'px';

  logLayoutSizingSnapshot('pre-width-assignment', {
    pass: layoutPassId,
    triggerSource: layoutTriggerSource,
    triggerMeta: layoutTriggerMeta,
    rowCount,
    passCellWidth,
    storeCellWidth: store.state.cellWidth,
    newCellHeight,
    quantizedCellHeight,
    minimumCellHeightForCoverage,
    newCellWidth,
    totalCanvasWidthPx,
    targetWidth,
    liveContainerHeight,
    coveredBottomEdgePx,
    rowCoverageGapPx,
    effectiveContainerHeight,
    horizontalScrollbarBlockSize,
    zoomReferenceContainerHeight,
    containerHeight
  });




  // Both pitch grid and drum grid now use the same total width (unified grid system)


  if (pitchGridContainer) {
    pitchGridContainer.style.width = targetWidth;
  }





  if (pitchGridWrapper) {


    pitchGridWrapper.style.width = targetWidth;


  }





  if (drumGridWrapper) {


    drumGridWrapper.style.width = targetWidth;


  }





  const gridsWrapperWidth = gridsWrapper?.getBoundingClientRect().width || 0;
  const needsScrollbar = totalCanvasWidthPx > gridsWrapperWidth;

  logGridSeamSnapshot('post-width-assignment', {
    pass: layoutPassId,
    passCellWidth,
    storeCellWidth: store.state.cellWidth,
    totalCanvasWidthPx,
    targetWidth,
    needsScrollbar
  });

  logLayoutSizingSnapshot('post-width-assignment', {
    pass: layoutPassId,
    triggerSource: layoutTriggerSource,
    passCellWidth,
    storeCellWidth: store.state.cellWidth,
    totalCanvasWidthPx,
    targetWidth,
    needsScrollbar,
    gridsWrapperClientWidth: gridsWrapper?.clientWidth ?? null,
    gridsWrapperScrollWidth: gridsWrapper?.scrollWidth ?? null
  });

  logLayoutFlowSnapshot('pass-summary', {
    pass: layoutPassId,
    triggerSource: layoutTriggerSource,
    triggerMeta: layoutTriggerMeta,
    referenceDiff,
    isZooming,
    hasResolvedInitialLayout,
    viewportHeight,
    containerHeight,
    liveContainerHeight,
    effectiveContainerHeight,
    horizontalScrollbarBlockSize,
    zoomReferenceContainerHeight,
    rowCount,
    rawCellHeight: Math.round(rawCellHeight * 1000) / 1000,
    newCellHeight,
    quantizedCellHeight,
    minimumCellHeightForCoverage,
    newCellWidth,
    storeCellWidth: store.state.cellWidth,
    coveredBottomEdgePx,
    rowCoverageGapPx,
    totalCanvasWidthPx,
    targetWidth,
    needsScrollbar,
    gridsWrapperClientWidth: gridsWrapper?.clientWidth ?? null,
    gridsWrapperRectWidth: gridsWrapper ? Math.round(gridsWrapper.getBoundingClientRect().width * 100) / 100 : null,
    gridsWrapperScrollWidth: gridsWrapper?.scrollWidth ?? null
  });





  // Keep button grid height stable across zoom frames. Drum grid remains zoom-coupled.
  const zoomResponsiveButtonRowHeight = Math.max(BASE_DRUM_ROW_HEIGHT, DRUM_HEIGHT_SCALE_FACTOR * store.state.cellHeight);
  const zoomResponsiveButtonGridHeight = DRUM_ROW_COUNT * zoomResponsiveButtonRowHeight;
  const shouldRefreshLockedButtonHeight =
    lockedButtonGridHeight === null
    || layoutTriggerSource.startsWith('init:')
    || layoutTriggerSource.startsWith('window:')
    || layoutTriggerSource.startsWith('api:')
    || layoutTriggerSource.startsWith('animatePitchRangeTo:complete')
    || layoutTriggerSource.startsWith('recalc:final-pass');
  if (shouldRefreshLockedButtonHeight) {
    lockedButtonGridHeight = zoomResponsiveButtonGridHeight;
  }

  const buttonGridHeight = lockedButtonGridHeight ?? zoomResponsiveButtonGridHeight;


  const buttonGridHeightPx = `${buttonGridHeight}px`;





  // Calculate middle cell width (excluding left and right legend columns)
  // IMPORTANT: Apply modulation if active to match the musical canvas width


  const columnWidthsCount = store.state.columnWidths?.length ?? 0;


  let middleCellWidth = 0;

  if (hasModulation) {
    // Use modulated width calculation (columnWidths is now canvas-space after Phase 8)
    const renderOptions = {
      cellWidth: passCellWidth,
      columnWidths: store.state.columnWidths,
      tempoModulationMarkers: store.state.tempoModulationMarkers,
      baseMicrobeatPx: passCellWidth,
      cellHeight: store.state.cellHeight,
      state: store.state
    };
    // Get total modulated width from pixelMapService
    middleCellWidth = getTotalPixelWidth(renderOptions);
  } else {
    // No modulation: use unmodulated width calculation
    // columnWidths is now canvas-space (no legends), so sum all of it
    for (let i = 0; i < columnWidthsCount; i++) {


      middleCellWidth += (store.state.columnWidths[i] || 0) * passCellWidth;


    }
  }


  if (columnWidthsCount === 0) {


    logger.warn('LayoutService', 'Column widths array is empty.', {


      columnWidthsCount,


      columnWidths: store.state.columnWidths


    }, 'layout');


  }


  if (middleCellWidth < 50 && columnWidthsCount > 0) {


    logger.warn('LayoutService', 'Computed button-grid middle cell width is unexpectedly small.', {


      middleCellWidth,


      columnWidthsSample: store.state.columnWidths?.slice(0, 10),


      cellWidth: passCellWidth,


      macrobeatGroupings: store.state.macrobeatGroupings


    }, 'layout');


  }





  // Set widths and heights for the three-cell button grid structure


  if (buttonGridWrapper) {


    const leftCell = buttonGridWrapper.querySelector<HTMLElement>('.button-grid-left-cell');


    const middleCell = buttonGridWrapper.querySelector<HTMLElement>('.button-grid-middle-cell');


    const rightCell = buttonGridWrapper.querySelector<HTMLElement>('.button-grid-right-cell');





    // Calculate left legend width (first 2 columns)


    const leftCellWidth = SIDE_COLUMN_WIDTH * 2 * passCellWidth;





    // Calculate right legend width (last 2 columns)


    const rightCellWidth = SIDE_COLUMN_WIDTH * 2 * passCellWidth;





    const buttonGridHeightChanged = Math.abs(lastCalculatedButtonGridHeight - buttonGridHeight) > 5;


    const shouldUpdateButtonGridHeight = shouldRefreshLockedButtonHeight || buttonGridHeightChanged || lastCalculatedButtonGridHeight === 0;





    if (shouldUpdateButtonGridHeight) {


      buttonGridWrapper.style.height = buttonGridHeightPx;


      lastCalculatedButtonGridHeight = buttonGridHeight;


    }





    const applyCellSizing = (cell: HTMLElement | null, widthPx: number) => {


      if (!cell) {return;}


      const widthValue = `${Math.max(0, widthPx)}px`;


      cell.style.width = widthValue;


      cell.style.flex = `0 0 ${widthValue}`;


      cell.style.maxWidth = widthValue;


      cell.style.minWidth = widthValue;


      cell.style.height = buttonGridHeightPx;


    };





    if (leftCell) {


      applyCellSizing(leftCell, leftCellWidth);


      const leftRect = leftCell.getBoundingClientRect();


      if (leftCellWidth > 0 && leftRect.width === 0) {


        logger.warn('LayoutService', 'Left button-grid cell measured width is 0 after assignment.', {


          assignedWidth: leftCellWidth,


          measuredWidth: leftRect.width,


          computedDisplay: window.getComputedStyle(leftCell).display


        }, 'layout');


      }


    }





    if (middleCell) {


      if (middleCellWidth === 0) {


        logger.warn('LayoutService', 'Calculated middle button-grid width is 0. Check column width data.', {


          columnWidths: store.state.columnWidths,


          cellWidth: passCellWidth


        }, 'layout');


      }


      applyCellSizing(middleCell, middleCellWidth);


      const middleRect = middleCell.getBoundingClientRect();


      if (middleCellWidth > 0 && middleRect.width === 0) {


        logger.warn('LayoutService', 'Middle button-grid cell assigned width but still measures 0.', {


          assignedWidth: middleCellWidth,


          measuredWidth: middleRect.width,


          computedStyles: window.getComputedStyle(middleCell)


        }, 'layout');


      }


      if (Math.abs(middleRect.width - middleCellWidth) > 5) {


        logger.warn('LayoutService', 'Middle cell measured width does not match assigned width.', {


          assignedWidth: middleCellWidth,


          measuredWidth: middleRect.width,


          styleWidth: middleCell.style.width,


          cellWidth: passCellWidth


        }, 'layout');


        requestAnimationFrame(() => {


          const postRect = middleCell.getBoundingClientRect();


          if (Math.abs(postRect.width - middleCellWidth) > 5) {


            logger.warn('LayoutService', 'Middle cell still mismatched after RAF.', {


              assignedWidth: middleCellWidth,


              measuredWidth: postRect.width,


              delta: postRect.width - middleCellWidth,


              computedStyles: window.getComputedStyle(middleCell)


            }, 'layout');


          }


        });

      }





      if (!beatLineWidthWarningShown) {


        const beatLineLayer = middleCell.querySelector('#beat-line-button-layer');


        if (beatLineLayer) {


          const beatLineRect = beatLineLayer.getBoundingClientRect();


          if (beatLineRect.width === 0) {


            const beatLineStyles = window.getComputedStyle(beatLineLayer);


            logger.warn('LayoutService', '#beat-line-button-layer width is 0 despite middle cell sizing.', {


              beatLineRect,


              beatLineStyles: {


                display: beatLineStyles.display,


                position: beatLineStyles.position,


                flex: {


                  direction: beatLineStyles.flexDirection,


                  grow: beatLineStyles.flexGrow,


                  shrink: beatLineStyles.flexShrink,


                  basis: beatLineStyles.flexBasis


                },


                width: beatLineStyles.width,


                minWidth: beatLineStyles.minWidth,


                maxWidth: beatLineStyles.maxWidth


              },


              middleRect,


              middleCellComputedWidth: beatLineStyles.width


            }, 'layout');


            beatLineWidthWarningShown = true;


          }


        } else {


          logger.warn('LayoutService', 'Could not find #beat-line-button-layer inside middle cell to measure.', null, 'layout');


          beatLineWidthWarningShown = true;


        }


      }


    }





    if (rightCell) {


      applyCellSizing(rightCell, rightCellWidth);


      const rightRect = rightCell.getBoundingClientRect();


      if (rightCellWidth > 0 && rightRect.width === 0) {


        logger.warn('LayoutService', 'Right button-grid cell measured width is 0 after assignment.', {


          assignedWidth: rightCellWidth,


          measuredWidth: rightRect.width,


          computedDisplay: window.getComputedStyle(rightCell).display


        }, 'layout');


      }


    }





    const totalButtonGridWidth = leftCellWidth + middleCellWidth + rightCellWidth;





    // Button grid should match the total canvas width (same as pitch/drum grids)


    // Use targetWidth directly to ensure alignment


    if (Number.isFinite(totalButtonGridWidth) && totalButtonGridWidth > 0) {


      buttonGridWrapper.style.width = targetWidth;


      buttonGridWrapper.style.maxWidth = targetWidth;


      buttonGridWrapper.style.minWidth = targetWidth;





    }





    const buttonGridRect = buttonGridWrapper.getBoundingClientRect();


    if (buttonGridRect.width === 0) {


      logger.warn('LayoutService', 'Entire button grid wrapper width is 0 after layout pass.', {


        leftCellWidth,


        middleCellWidth,


        rightCellWidth,


        wrapperStyles: window.getComputedStyle(buttonGridWrapper)


      }, 'layout');


    }





  }





  // Both pitch and drum canvases now use the same unified width


  // Keep drum cells square with pitch time cells (strict 1:1 in CSS pixel space).
  const drumRowHeight = Math.max(1, Math.round(passCellWidth));


  const drumCanvasHeight = DRUM_ROW_COUNT * drumRowHeight;


  const drumHeightPx = `${drumCanvasHeight}px`;





  // ============================================================================
  // CANVAS ARCHITECTURE:
  // - Container (pitch-grid-container): pitch viewport container (full width including Y-axis labels)
  // - Left pitch Y-axis labels canvas (aka "legend-left"): positioned at left: 0, width = 2 columns
  // - Main canvases (notation-grid, playhead, hover): musical area only (excluding Y-axis labels)
  // - Right pitch Y-axis labels canvas (aka "legend-right"): positioned at right: 0, width = 2 columns
  // ============================================================================

  // Calculate musical-only width (excluding left and right legends)
  const pitchContainerHeight = pitchGridContainer?.clientHeight || 0;
  const finalContainerHeightForZoom = pitchContainerHeight + horizontalScrollbarBlockSize;

  // Keep a single width/height basis per layout pass.
  // If post-reflow container height implies a different zoom, queue one full follow-up pass
  // rather than mutating `cellWidth`/`cellHeight` mid-pass.
  if (!isZooming && pitchContainerHeight > 0) {
    const finalRowCount = Math.max(1, getSpan(normalizedRange));
    const recalculatedZoom = calculateZoomToFitRowCount(finalContainerHeightForZoom, finalRowCount);
    const rawFinalCellHeight = baseCellHeight * recalculatedZoom;
    const quantizedFinalCellHeight = quantizeWithHysteresis(rawFinalCellHeight, newCellHeight, 0.24);
    const minimumFinalCellHeightForCoverage = getMinimumCellHeightForViewportCoverage(finalContainerHeightForZoom, finalRowCount);
    const finalCellHeight = Math.max(quantizedFinalCellHeight, minimumFinalCellHeightForCoverage);
    const finalCellWidth = Math.round(finalCellHeight * GRID_WIDTH_RATIO);

    if (finalCellHeight !== newCellHeight || finalCellWidth !== newCellWidth) {
      pendingFinalRecalc = true;
      logLayoutFlowSnapshot('queued-final-pass-for-height-settle', {
        pass: layoutPassId,
        passCellHeight: newCellHeight,
        passCellWidth: newCellWidth,
        settledCellHeight: finalCellHeight,
        settledCellWidth: finalCellWidth,
        rawFinalCellHeight: Math.round(rawFinalCellHeight * 1000) / 1000,
        quantizedFinalCellHeight,
        minimumFinalCellHeightForCoverage,
        finalContainerHeightForZoom,
        horizontalScrollbarBlockSize,
        pitchContainerHeight,
        initialContainerHeight: containerHeight
      });
    }
  }

  // Legend columns are fixed width (not in newColumnWidths after Phase 8)
  const leftLegendWidthPx = Math.round(SIDE_COLUMN_WIDTH * 2 * passCellWidth);
  const rightLegendWidthPx = Math.round(SIDE_COLUMN_WIDTH * 2 * passCellWidth);

  // Musical canvas width is already calculated above as finalMusicalWidth
  const musicalCanvasWidthPx = Math.round(finalMusicalWidth);

  const pitchCanvasTargets = [
    { element: canvas, context: ctx },
    { element: playheadCanvas },
    { element: hoverCanvas }
  ];

  // Size main pitch canvases to MUSICAL width only (excluding legends)
  pitchCanvasTargets.forEach(({ element, context }) => {
    // Match container height so the bottom edge aligns with the legend canvases.
    resizeCanvasForPixelRatio(element, musicalCanvasWidthPx, pitchContainerHeight, pixelRatio, context);

    // Position canvas after the left legend
    if (element) {
      element.style.left = `${leftLegendWidthPx}px`;
    }
  });

  // Size pitch Y-axis label canvases separately - they have fixed widths (2 columns each)
  // Use container height to match the container exactly
  resizeCanvasForPixelRatio(legendLeftCanvas, leftLegendWidthPx, pitchContainerHeight, pixelRatio, null);
  resizeCanvasForPixelRatio(legendRightCanvas, rightLegendWidthPx, pitchContainerHeight, pixelRatio, null);

  logGridSeamSnapshot('post-canvas-resize', {
    pass: layoutPassId,
    passCellWidth,
    storeCellWidth: store.state.cellWidth,
    musicalCanvasWidthPx,
    leftLegendWidthPx,
    rightLegendWidthPx,
    pitchContainerHeight
  });





  const drumCanvasTargets = [


    { element: drumCanvas, context: drumCtx },


    { element: drumPlayheadCanvas },


    { element: drumHoverCanvas }


  ];





  drumCanvasTargets.forEach(({ element, context }) => {


    resizeCanvasForPixelRatio(element, musicalCanvasWidthPx, drumCanvasHeight, pixelRatio, context);


  });





  if (drumGridWrapper) {
    drumGridWrapper.style.setProperty('--drum-row-height', `${drumRowHeight}px`);
    drumGridWrapper.style.setProperty('--drum-grid-height', drumHeightPx);

    const drumLeftCell = drumGridWrapper.querySelector('.drum-grid-left-cell');

    const drumMiddleCell = drumGridWrapper.querySelector('.drum-grid-middle-cell');

    const drumRightCell = drumGridWrapper.querySelector('.drum-grid-right-cell');

    const applyDrumCellSizing = (cell: HTMLElement | null, widthPx: number) => {

      if (!cell) {return;}

      const widthValue = `${Math.max(0, Math.round(widthPx))}px`;

      cell.style.width = widthValue;

      cell.style.flex = `0 0 ${widthValue}`;

      cell.style.maxWidth = widthValue;

      cell.style.minWidth = widthValue;

      cell.style.height = drumHeightPx;

    };

    applyDrumCellSizing(drumLeftCell as HTMLElement | null, leftLegendWidthPx);

    applyDrumCellSizing(drumMiddleCell as HTMLElement | null, musicalCanvasWidthPx);

    applyDrumCellSizing(drumRightCell as HTMLElement | null, rightLegendWidthPx);

    const drumCanvasWrapper = drumMiddleCell?.querySelector('#drum-canvas-wrapper') as HTMLElement | null;

    if (drumCanvasWrapper) {

      drumCanvasWrapper.style.width = '100%';

      drumCanvasWrapper.style.height = drumHeightPx;

    }

  }


  const shouldUpdateDrumHeight = drumCanvasHeight !== lastCalculatedDrumHeight;

  if (drumGridWrapper && shouldUpdateDrumHeight) {


    drumGridWrapper.style.height = drumHeightPx;


    lastCalculatedDrumHeight = drumCanvasHeight;


  }

  // Drum sizing can change flex distribution and therefore the final pitch container height.
  // Re-sync pitch/legend canvas heights in the same pass to avoid transient bottom strips.
  const settledPitchContainerHeight = pitchGridContainer?.clientHeight || pitchContainerHeight;
  const needsPitchHeightResync = Math.abs(settledPitchContainerHeight - pitchContainerHeight) > 0.5;
  if (needsPitchHeightResync) {
    pitchCanvasTargets.forEach(({ element, context }) => {
      resizeCanvasForPixelRatio(element, musicalCanvasWidthPx, settledPitchContainerHeight, pixelRatio, context);
      if (element) {
        element.style.left = `${leftLegendWidthPx}px`;
      }
    });

    resizeCanvasForPixelRatio(legendLeftCanvas, leftLegendWidthPx, settledPitchContainerHeight, pixelRatio, null);
    resizeCanvasForPixelRatio(legendRightCanvas, rightLegendWidthPx, settledPitchContainerHeight, pixelRatio, null);

    logGridSeamSnapshot('post-drum-pitch-resize-sync', {
      pass: layoutPassId,
      passCellWidth,
      initialPitchContainerHeight: pitchContainerHeight,
      settledPitchContainerHeight
    });
  }

  logLayoutSizingSnapshot('post-drum-sizing', {
    pass: layoutPassId,
    passCellWidth,
    drumRowHeight,
    drumCanvasHeight,
    drumHeightPx,
    shouldUpdateDrumHeight,
    lastCalculatedDrumHeight,
    settledPitchContainerHeight,
    needsPitchHeightResync,
    musicalCanvasWidthPx,
    leftLegendWidthPx,
    rightLegendWidthPx
  });





  document.dispatchEvent(new CustomEvent('canvasResized', {
    detail: { source: 'layoutService-immediate' }
  }));

  const scheduledPixelRatio = pixelRatio;


  const scheduledPitchWidth = musicalCanvasWidthPx; // Use musical width, not total width





  // Coalesce the deferred resize work so rapid reflows (e.g., animated zoom presets) don't
  // stack up many pending timers and `canvasResized` events.
  if (deferredPitchResizeTimeout) {
    clearTimeout(deferredPitchResizeTimeout);
  }
  const shouldRunDeferredResize = !isZooming && !pendingFinalRecalc && (
    !hadResolvedInitialLayout ||
    layoutTriggerSource.startsWith('window:') ||
    layoutTriggerSource.startsWith('init:') ||
    layoutTriggerSource.startsWith('recalc:final-pass') ||
    layoutTriggerSource.startsWith('animatePitchRangeTo:complete')
  );
  if (!shouldRunDeferredResize && !isZooming && pendingFinalRecalc) {
    logGridSeamSnapshot('deferred-resize-skipped', {
      pass: layoutPassId,
      reason: 'final-pass-pending',
      pendingFinalRecalc,
      finalRecalcAttempts,
      triggerSource: layoutTriggerSource
    });
  }
  if (shouldRunDeferredResize) {
    deferredPitchResizeTimeout = setTimeout(() => {
      deferredPitchResizeTimeout = null;

      if (pendingFinalRecalc || finalRecalcAttempts > 0) {
        logGridSeamSnapshot('deferred-resize-skipped', {
          pass: layoutPassId,
          reason: 'stale-deferred-while-final-pass-active',
          pendingFinalRecalc,
          finalRecalcAttempts,
          triggerSource: layoutTriggerSource
        });
        return;
      }


    const finalPitchGridContainer = document.getElementById('pitch-grid-container');


    const finalContainerHeight = finalPitchGridContainer?.clientHeight || 0;





    pitchCanvasTargets.forEach(({ element, context }) => {


      resizeCanvasForPixelRatio(element, scheduledPitchWidth, finalContainerHeight, scheduledPixelRatio, context);

      // Re-apply positioning after resize
      if (element) {
        element.style.left = `${leftLegendWidthPx}px`;
      }


    });





    // IMPORTANT: Resizing is done twice during init because container height can change after the
    // initial layout pass (fonts, toolbars, and other DOM settling). We must also resize the
    // pitch Y-axis label canvases (aka "legend" canvases) here; otherwise they retain the earlier
    // height and can show a blank band at the bottom even when the pitch viewport is mid-gamut.
    resizeCanvasForPixelRatio(legendLeftCanvas, leftLegendWidthPx, finalContainerHeight, scheduledPixelRatio, null);
    resizeCanvasForPixelRatio(legendRightCanvas, rightLegendWidthPx, finalContainerHeight, scheduledPixelRatio, null);

    logViewportDebug('deferredResize', {
      finalContainerHeight,
      pitchCanvasLogicalHeight: canvas?.dataset?.['logicalHeight'],
      legendLeftLogicalHeight: legendLeftCanvas?.dataset?.['logicalHeight'],
      legendRightLogicalHeight: legendRightCanvas?.dataset?.['logicalHeight']
    });

    logGridSeamSnapshot('deferred-post-canvas-resize', {
      pass: layoutPassId,
      scheduledPitchWidth,
      leftLegendWidthPx,
      rightLegendWidthPx,
      finalContainerHeight
    });

    logLayoutSizingSnapshot('deferred-post-canvas-resize', {
      pass: layoutPassId,
      scheduledPitchWidth,
      leftLegendWidthPx,
      rightLegendWidthPx,
      finalContainerHeight,
      scheduledPixelRatio
    });

    document.dispatchEvent(new CustomEvent('canvasResized', {


      detail: { source: 'layoutService-deferred' }


    }));





    } );
  }

  // Final per-frame safety net: if flex/scrollbar resolution changes pitch container height
  // after this pass, keep pitch/legend canvas heights in lockstep with the settled container.
  if (postFramePitchHeightSyncFrame !== null) {
    cancelAnimationFrame(postFramePitchHeightSyncFrame);
  }
  postFramePitchHeightSyncFrame = requestAnimationFrame(() => {
    postFramePitchHeightSyncFrame = null;

    if (isZooming) {
      return;
    }
    syncPitchCanvasHeightsToContainer('post-frame-height-sync', {
      pass: layoutPassId,
      triggerSource: layoutTriggerSource,
      pendingFinalRecalc,
      finalRecalcAttempts
    });
  });








  // Ensure `pitchRange` stays clamped and respects the minimum span.
  try {
    const totalRanks = store.state.fullRowData.length;
    const maxIndex = Math.max(0, totalRanks - 1);
    const current = store.state.pitchRange || { topIndex: 0, bottomIndex: maxIndex };
    const normalized = normalizeRange(current, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
    if (current.topIndex !== normalized.topIndex || current.bottomIndex !== normalized.bottomIndex) {
      store.setPitchRange(normalized);
    }
  } catch {
    // Ignore viewport sync errors during early init
  }

  store.emit('layoutConfigChanged');


  isRecalculating = false;

  if (pendingFinalRecalc) {
    pendingFinalRecalc = false;
    if (finalRecalcAttempts < MAX_FINAL_RECALC_ATTEMPTS) {
      finalRecalcAttempts += 1;
      setLayoutTrigger('recalc:final-pass', {
        attempt: finalRecalcAttempts
      });
      requestAnimationFrame(recalcAndApplyLayout);
    } else {
      logger.warn('LayoutService', 'Skipped additional layout pass after repeated final zoom adjustments.', {
        finalRecalcAttempts,
        maxFinalRecalcAttempts: MAX_FINAL_RECALC_ATTEMPTS
      }, 'layout');
    }
  } else {
    finalRecalcAttempts = 0;
  }


}








const LayoutService = {


  init() {


    const { ctx, drumCtx, legendLeftCtx, legendRightCtx } = initDOMElements();
    setupPitchContainerResizeObserver();


    setLayoutTrigger('init:first-layout-pass');
    requestAnimationFrame(recalcAndApplyLayout);


    this.initScrollHandler();





    const handleWindowResize = () => {


      if (isRecalculating) {


        return;


      }





      if (resizeTimeout !== null) {
        clearTimeout(resizeTimeout);
      }


      resizeTimeout = setTimeout(() => {


        setLayoutTrigger('window:resize', {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight
        });
        recalcAndApplyLayout();


      }, RESIZE_DEBOUNCE_DELAY);


    };





    window.addEventListener('resize', handleWindowResize);


    // Listen to zoom events from store
    store.on('zoomIn', (payload?: { source?: string }) => {
      this.zoomIn(payload);
    });

    store.on('zoomOut', (payload?: { source?: string }) => {
      this.zoomOut(payload);
    });


    return { ctx, drumCtx, legendLeftCtx, legendRightCtx };


  },


  waitForInitialLayout() {


    if (hasResolvedInitialLayout) {
      return Promise.resolve();
    }
    return initialLayoutPromise;


  },



  getCurrentZoomLevel() {
    return currentZoomLevel;
  },

  /**
   * ZOOM SYSTEM
   * ===========
   * Range-authoritative vertical viewport:
   * - `pitchRange` endpoints define the visible vertical span (inclusive gamut indices).
   * - ZoomLevel is derived to fit that span into the viewport container height.
   *
   * Compatibility note:
   * `setZoomLevel()` is retained for legacy call sites; it approximates the requested zoom
   * by adjusting the pitch viewport span while keeping center stable (best-effort).
   */
  setZoomLevel(newZoom: number) {
    const zoom = Number.isFinite(newZoom) && newZoom > 0 ? newZoom : 1.0;
    const gridsWrapper = document.getElementById('grids-wrapper');
    const horizontalScrollbarBlockSize = getHorizontalScrollbarBlockSize(gridsWrapper);
    const containerHeight = getPitchGridContainerHeight() + horizontalScrollbarBlockSize;
    const totalRanks = store.state.fullRowData.length;
    const maxIndex = Math.max(0, totalRanks - 1);

    if (!totalRanks || totalRanks <= 0) {return;}

    const desiredSpanRaw = (2 * containerHeight) / (zoom * BASE_ABSTRACT_UNIT);
    // Inverse of calculateZoomToFitRowCount(): zoom fits `span` halfUnits into the container.
    const desiredSpan = Math.max(
      DEFAULT_MIN_VIEWPORT_ROWS,
      Math.min(totalRanks, Math.round(desiredSpanRaw))
    );

    const current = getNormalizedPitchRange();
    const center = (current.topIndex + current.bottomIndex) / 2;
    const half = (desiredSpan - 1) / 2;
    let topIndex = Math.round(center - half);
    let bottomIndex = topIndex + desiredSpan - 1;

    if (topIndex < 0) {
      bottomIndex += -topIndex;
      topIndex = 0;
    }
    if (bottomIndex > maxIndex) {
      const overshoot = bottomIndex - maxIndex;
      topIndex -= overshoot;
      bottomIndex = maxIndex;
    }

    applyPitchRange({ topIndex, bottomIndex }, 'setZoomLevel');
  },

  setPitchViewportRange(range: PitchRange, options: { animateMs?: number; source?: string } = {}) {
    const source = options.source ?? 'setPitchViewportRange';
    const durationMs = resolveZoomAnimationDuration(options.animateMs ?? 0, source);
    if (durationMs > 0) {
      animatePitchRangeTo(range, durationMs, source);
      return;
    }
    applyPitchRange(range, source);
  },





  _canScrollRange(direction: number | 'up' | 'down') {


    const currentRange = store.state.pitchRange;


    if (!currentRange || !masterRowData || masterRowData.length === 0) {return false;}


    const maxMasterIndex = masterRowData.length - 1;


    const directionValue = typeof direction === 'string' ? (direction === 'up' ? -1 : 1) : direction;


    const canScrollUp = directionValue < 0 && currentRange.topIndex > 0;


    const canScrollDown = directionValue > 0 && currentRange.bottomIndex < maxMasterIndex;


    return canScrollUp || canScrollDown;


  },





  initScrollHandler() {


    const scrollContainer = document.getElementById('pitch-grid-wrapper');


    if (!scrollContainer) {


      return;


    }





    scrollContainer.addEventListener('wheel', (e) => {


      e.preventDefault();





      if (e.ctrlKey || e.metaKey) {


        if (e.deltaY < 0) {


          this.zoomIn({ source: 'wheel' });


        } else {


          this.zoomOut({ source: 'wheel' });


        }


      } else {


        const scrollDirection = e.deltaY > 0 ? 1 : -1;


        if (this._canScrollRange(scrollDirection)) {
          this.scrollByUnits(scrollDirection);
        }


      }


    }, { passive: false });


  },





  zoomIn(payload?: { source?: string }) {
    const totalRanks = store.state.fullRowData.length;
    if (!totalRanks) {return;}

    const current = getNormalizedPitchRange();
    const currentSpan = getSpan(current);
    const spanLadder = buildSpanLadder(totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
    const target = zoomRangeOnSpanLadder(current, 'in', {
      totalRanks,
      minSpan: DEFAULT_MIN_VIEWPORT_ROWS,
      ladder: spanLadder
    });
    const targetSpan = getSpan(target);

    const source = payload?.source ?? 'unknown';
    const durationMs = resolveZoomAnimationDuration(280, source);

    logger.debug('LayoutService', `[Zoom] Range zoom in (span ${currentSpan} -> ${targetSpan})`, {
      source,
      ladderTop: spanLadder.slice(0, 6)
    }, 'layout');

    if (durationMs > 0) {
      animatePitchRangeTo(target, durationMs, `zoomIn:${source}`);
    } else {
      applyPitchRange(target, `zoomIn:${source}`);
      store.emit('zoomChanged');
    }
  },





  zoomOut(payload?: { source?: string }) {
    const totalRanks = store.state.fullRowData.length;
    if (!totalRanks) {return;}

    const current = getNormalizedPitchRange();
    const currentSpan = getSpan(current);
    const spanLadder = buildSpanLadder(totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
    const target = zoomRangeOnSpanLadder(current, 'out', {
      totalRanks,
      minSpan: DEFAULT_MIN_VIEWPORT_ROWS,
      ladder: spanLadder
    });
    const targetSpan = getSpan(target);

    const source = payload?.source ?? 'unknown';
    const durationMs = resolveZoomAnimationDuration(280, source);

    logger.debug('LayoutService', `[Zoom] Range zoom out (span ${currentSpan} -> ${targetSpan})`, {
      source,
      ladderTop: spanLadder.slice(0, 6)
    }, 'layout');

    if (durationMs > 0) {
      animatePitchRangeTo(target, durationMs, `zoomOut:${source}`);
    } else {
      applyPitchRange(target, `zoomOut:${source}`);
      store.emit('zoomChanged');
    }
  },





  resetZoom(payload?: { source?: string }) {
    const totalRanks = store.state.fullRowData.length;
    if (!totalRanks) {return;}
    const maxIndex = Math.max(0, totalRanks - 1);

    const source = payload?.source ?? 'unknown';
    const durationMs = resolveZoomAnimationDuration(320, source);
    if (durationMs > 0) {
      animatePitchRangeTo({ topIndex: 0, bottomIndex: maxIndex }, durationMs, `resetZoom:${source}`);
      return;
    }
    applyPitchRange({ topIndex: 0, bottomIndex: maxIndex }, `resetZoom:${source}`);
    store.emit('zoomChanged');
  },





  scroll(deltaY: number) {

    // Capture viewport info BEFORE scroll for lasso selection sync
    const viewportBefore = this.getViewportInfo();
    const startRankBefore = viewportBefore.startRank;

    const scrollAmount = (deltaY / viewportHeight) / 4;


    currentScrollPosition = Math.max(0, Math.min(1, currentScrollPosition + scrollAmount));

    // Emit scrollChanged to invalidate viewport caches
    store.emit('scrollChanged');

    // Calculate row delta for lasso selection sync
    const viewportAfter = this.getViewportInfo();
    const startRankAfter = viewportAfter.startRank;
    const rowDelta = startRankAfter - startRankBefore;

    // Emit scrollByUnits event if there was actual row movement
    if (rowDelta !== 0) {
      store.emit('scrollByUnits', rowDelta);
    }

    store.emit('layoutConfigChanged');


  },





  scrollByUnits(direction: number) {
    cancelPitchRangeAnimation();

    const currentRange = store.state.pitchRange;
    if (!currentRange || !masterRowData || masterRowData.length === 0) {return;}

    const step = Math.sign(direction || 0);
    if (step === 0) {return;}
    const totalRanks = masterRowData.length;
    const normalized = normalizeRange(currentRange, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
    const nextRange = shiftRangeBy(normalized, step, totalRanks);
    if (nextRange.topIndex === normalized.topIndex && nextRange.bottomIndex === normalized.bottomIndex) {return;}

    store.setPitchRange(nextRange);
    store.emit('scrollChanged');
    store.emit('scrollByUnits', step);
    document.dispatchEvent(new CustomEvent('canvasResized', { detail: { source: 'viewportScroll' } }));

  },

  setViewportTopIndex(topIndex: number) {
    cancelPitchRangeAnimation();
    const currentRange = store.state.pitchRange || { topIndex: 0, bottomIndex: Math.max(0, store.state.fullRowData.length - 1) };
    const totalRanks = store.state.fullRowData.length;
    const normalized = normalizeRange(currentRange, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
    const nextRange = setTopEndpoint(normalized, topIndex, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
    const rowDelta = nextRange.topIndex - (normalized.topIndex ?? 0);

    if (nextRange.topIndex === normalized.topIndex && nextRange.bottomIndex === normalized.bottomIndex) {
      return;
    }

    store.setPitchRange(nextRange);
    store.emit('scrollChanged');
    if (rowDelta !== 0) {
      store.emit('scrollByUnits', rowDelta);
    }

    // Span may have changed; recompute zoom-to-fit and resize canvases before re-rendering.
    setLayoutTrigger('setViewportTopIndex', {
      topIndex,
      rowDelta
    });
    recalcAndApplyLayout();
    store.emit('zoomChanged');
  },

  setViewportBottomIndex(bottomIndex: number) {
    cancelPitchRangeAnimation();
    const currentRange = store.state.pitchRange || { topIndex: 0, bottomIndex: Math.max(0, store.state.fullRowData.length - 1) };
    const totalRanks = store.state.fullRowData.length;
    const normalized = normalizeRange(currentRange, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
    const nextRange = setBottomEndpoint(normalized, bottomIndex, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
    const rowDelta = nextRange.topIndex - (normalized.topIndex ?? 0);

    logger.debug('LayoutService', 'setViewportBottomIndex', {
      requestedBottom: bottomIndex,
      currentRange,
      normalized,
      nextRange,
      willUpdate: !(nextRange.topIndex === normalized.topIndex && nextRange.bottomIndex === normalized.bottomIndex)
    }, 'layout');

    if (nextRange.topIndex === normalized.topIndex && nextRange.bottomIndex === normalized.bottomIndex) {
      return;
    }

    store.setPitchRange(nextRange);
    store.emit('scrollChanged');
    if (rowDelta !== 0) {
      store.emit('scrollByUnits', rowDelta);
    }

    // Span may have changed; recompute zoom-to-fit and resize canvases before re-rendering.
    setLayoutTrigger('setViewportBottomIndex', {
      bottomIndex,
      rowDelta
    });
    recalcAndApplyLayout();
    store.emit('zoomChanged');
  },





  scrollByPixels(deltaY: number, _deltaX = 0) {

    // Capture viewport info BEFORE scroll for lasso selection sync
    const viewportBefore = this.getViewportInfo();
    const startRankBefore = viewportBefore.startRank;

    const totalRanks = store.state.fullRowData.length;


    const baseRankHeight = store.state.cellHeight || BASE_ABSTRACT_UNIT;


    const rankHeight = baseRankHeight * currentZoomLevel;


    const fullVirtualHeight = totalRanks * rankHeight;


    const paddedVirtualHeight = fullVirtualHeight;


    const scrollableDist = Math.max(0, paddedVirtualHeight - viewportHeight);





    if (scrollableDist > 0) {


      const scrollDelta = deltaY / scrollableDist;


      currentScrollPosition = Math.max(0, Math.min(1, currentScrollPosition + scrollDelta));


    }

    // Emit scrollChanged to invalidate viewport caches
    store.emit('scrollChanged');

    // Calculate row delta for lasso selection sync
    const viewportAfter = this.getViewportInfo();
    const startRankAfter = viewportAfter.startRank;
    const rowDelta = startRankAfter - startRankBefore;

    // Emit scrollByUnits event if there was actual row movement
    if (rowDelta !== 0) {
      store.emit('scrollByUnits', rowDelta);
    }

    store.emit('layoutConfigChanged');


  },





  getViewportInfo() {
    // Returns the current pitch viewport window as **gamut indices**:
    // - `startRank` is the first visible pitch row index into the pitch gamut (`fullRowData`)
    // - `endRank` is an exclusive upper bound (one past the last visible gamut row)
    // This naming is historical; think: start/end *gamut row index*.


    const totalRanks = store.state.fullRowData.length;
    const maxIndex = Math.max(0, totalRanks - 1);

    const pitchGridContainer = document.getElementById('pitch-grid-container');
    const containerHeight = pitchGridContainer?.clientHeight || (viewportHeight * 0.7);

    const cellHeight = store.state.cellHeight || BASE_ABSTRACT_UNIT;
    const halfUnit = cellHeight / 2;

    const pitchRange = normalizeRange(
      store.state.pitchRange || { topIndex: 0, bottomIndex: maxIndex },
      totalRanks,
      DEFAULT_MIN_VIEWPORT_ROWS
    );

    const startRank = Math.max(0, Math.min(maxIndex, pitchRange.topIndex ?? 0));
    const bottomIndex = Math.max(startRank, Math.min(maxIndex, pitchRange.bottomIndex ?? maxIndex));
    const endRank = Math.min(totalRanks, bottomIndex + 1);

    const scrollOffset = startRank * halfUnit;

    // Viewport/canvas debug (disabled by default).
    // Enable via:
    // - `localStorage.setItem('sn:debugViewport','1')` or
    // - `window.__SN_DEBUG_VIEWPORT = true`
    //
    // When the legend canvases are a different height than the pitch container, the legend renderer can
    // appear to have "extra rows"/blank space at the bottom even though the row-range math is correct.
    const leftLegend = document.getElementById('legend-left-canvas') as HTMLCanvasElement | null;
    const rightLegend = document.getElementById('legend-right-canvas') as HTMLCanvasElement | null;
    const ratio = halfUnit ? (containerHeight / halfUnit) : 0;
    const rowCount = Math.max(1, (bottomIndex - startRank) + 1);
    const coveragePx = rowCount * halfUnit;
    const startRow = store.state.fullRowData[startRank];
    const endRow = store.state.fullRowData[bottomIndex];
    const atTopGamutEdge = startRank <= 0;
    const atBottomGamutEdge = bottomIndex >= maxIndex;

    logViewportDebug('getViewportInfo', {
      containerHeight,
      containerRectHeight: pitchGridContainer?.getBoundingClientRect?.().height,
      cellHeight,
      halfUnit,
      ratio,
      rowCount,
      coveragePx,
      coverageGapPx: containerHeight - coveragePx,
      totalRanks,
      pitchRange,
      startRank,
      endRank,
      atTopGamutEdge,
      atBottomGamutEdge,
      scrollOffset,
      startRowSummary: startRow ? { pitch: startRow.pitch, column: startRow.column, isBoundary: Boolean((startRow as any).isBoundary) } : null,
      endRowSummary: endRow ? { pitch: endRow.pitch, column: endRow.column, isBoundary: Boolean((endRow as any).isBoundary) } : null,
      pitchCanvasLogicalHeight: canvas?.dataset?.['logicalHeight'],
      legendLeftLogicalHeight: leftLegend?.dataset?.['logicalHeight'],
      legendRightLogicalHeight: rightLegend?.dataset?.['logicalHeight'],
      legendLeftCssHeight: leftLegend?.getBoundingClientRect?.().height,
      legendRightCssHeight: rightLegend?.getBoundingClientRect?.().height
    });

    return {


      zoomLevel: currentZoomLevel,


      viewportHeight: viewportHeight,


      containerHeight: containerHeight,


      cellHeight: cellHeight,


      halfUnit: halfUnit,


      startRank: startRank,


      endRank: endRank,


      scrollOffset: scrollOffset


    };


  },





  getMacrobeatWidthPx(state: any, grouping: number) {


    return grouping * state.cellWidth;


  },





  getColumnX(index: number) {
    const cellWidth = store.state.cellWidth || 40;
    const columnWidths = store.state.columnWidths || [];

    return getColumnXFromPixelMap(index, {
      cellWidth,
      columnWidths,
      tempoModulationMarkers: store.state.tempoModulationMarkers,
      baseMicrobeatPx: cellWidth,
      state: store.state
    });


  },





  getCanvasWidth() {


    return getCanvasWidthFromColumns(store.state.columnWidths, store.state.cellWidth);


  },





  getModulatedCanvasWidth() {


    const baseWidth = this.getCanvasWidth();





    if (!store.state.tempoModulationMarkers || store.state.tempoModulationMarkers.length === 0) {


      return baseWidth;


    }





    try {


      const cellWidth = store.state.cellWidth || 40;
      const columnWidths = store.state.columnWidths || [];  // Canvas-space after Phase 8

      const renderOptions = {
        cellWidth,
        columnWidths,
        tempoModulationMarkers: store.state.tempoModulationMarkers,
        baseMicrobeatPx: cellWidth,
        cellHeight: store.state.cellHeight || 40,
        state: store.state
      };

      // Get total pixel width from pixelMapService (includes modulation)
      const modulatedMusicalWidth = getTotalPixelWidth(renderOptions);

      // After Phase 8: This function returns MUSICAL width only (no legends)
      return modulatedMusicalWidth;





    } catch {
      return baseWidth;


    }


  },





  recalculateLayout() {


    setLayoutTrigger('api:recalculateLayout');
    if (isStampLayoutDebugEnabled()) {
      const stack = (new Error().stack || '')
        .split('\n')
        .slice(2, 8)
        .map(line => line.trim());
      logStampLayout('layout:api:recalculateLayout', { stack });
    }
    recalcAndApplyLayout();


  },





  reflow() {


    setLayoutTrigger('api:reflow');
    if (isStampLayoutDebugEnabled()) {
      const stack = (new Error().stack || '')
        .split('\n')
        .slice(2, 8)
        .map(line => line.trim());
      logStampLayout('layout:api:reflow', { stack });
    }
    recalcAndApplyLayout();


  },





  get isZooming() {


    return isZooming;


  }


};





export default LayoutService;
