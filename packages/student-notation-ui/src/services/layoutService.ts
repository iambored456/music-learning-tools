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
import {
  DEFAULT_SCROLL_POSITION, GRID_WIDTH_RATIO,  BASE_DRUM_ROW_HEIGHT,
  DRUM_HEIGHT_SCALE_FACTOR, DRUM_ROW_COUNT,
  RESIZE_DEBOUNCE_DELAY,
  SIDE_COLUMN_WIDTH,
  BASE_ABSTRACT_UNIT
} from '@/core/constants.ts';
import { calculateColumnWidths, getCanvasWidth as getCanvasWidthFromColumns } from './columnsLayout.ts';
import { fullRowData as masterRowData } from '@state/pitchData.ts';
import { DEFAULT_MIN_VIEWPORT_ROWS, getAdaptiveZoomStep, getSpan, normalizeRange, setBottomEndpoint, setTopEndpoint, shiftRangeBy, zoomRange } from '@utils/pitchViewport.ts';
import { calculateZoomToFitRowCount as calculateZoomToFitRowCountShared } from '@mlt/pitch-viewport';
import type { PitchRange } from '../../types/state.js';

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
  buttonGridWrapper: HTMLElement | null,
  gridScrollbarProxy: HTMLElement | null,
  gridScrollbarInner: HTMLElement | null;

let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

let isRecalculating = false;
let isZooming = false;
let pitchGridNotReadyLogged = false;
let beatLineWidthWarningShown = false;
let hasResolvedInitialLayout = false;
let lastViewportDebugLogAt = 0;
let deferredPitchResizeTimeout: ReturnType<typeof setTimeout> | null = null;
let pitchRangeAnimationFrame: number | null = null;
let pitchRangeAnimationToken = 0;
let resolveInitialLayout: (() => void) | null = null;
let pendingFinalRecalc = false;
let finalRecalcAttempts = 0;
const initialLayoutPromise = new Promise<void>(resolve => {
  resolveInitialLayout = () => resolve();
});

// let lastCalculatedWidth = 0;  // Unused variable
let lastCalculatedDrumHeight = 0;
let lastCalculatedButtonGridHeight = 0;

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
    paddingRows: 1
  });
}

function getNormalizedPitchRange(): PitchRange {
  const totalRanks = store.state.fullRowData.length;
  const maxIndex = Math.max(0, totalRanks - 1);
  const current = store.state.pitchRange || { topIndex: 0, bottomIndex: maxIndex };
  return normalizeRange(current, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);
}

function cancelPitchRangeAnimation(): void {
  if (pitchRangeAnimationFrame !== null) {
    cancelAnimationFrame(pitchRangeAnimationFrame);
    pitchRangeAnimationFrame = null;
  }
  pitchRangeAnimationToken += 1;
  isZooming = false;
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
    recalcAndApplyLayout();
    store.emit('zoomChanged');
    return;
  }

  document.dispatchEvent(new CustomEvent('canvasResized', { detail: { source } }));
}

function animatePitchRangeTo(targetRange: PitchRange, durationMs: number, source: string): void {
  cancelPitchRangeAnimation();
  isZooming = true;

  const totalRanks = store.state.fullRowData.length;
  const startRange = getNormalizedPitchRange();
  const normalizedTarget = normalizeRange(targetRange, totalRanks, DEFAULT_MIN_VIEWPORT_ROWS);

  if (normalizedTarget.topIndex === startRange.topIndex && normalizedTarget.bottomIndex === startRange.bottomIndex) {
    isZooming = false;
    return;
  }

  const token = pitchRangeAnimationToken;
  const startTime = performance.now();
  const duration = Math.max(0, Math.round(durationMs));
  let lastTop = startRange.topIndex;

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

    const interpolatedTop = Math.round(startRange.topIndex + (normalizedTarget.topIndex - startRange.topIndex) * eased);
    const interpolatedBottom = Math.round(startRange.bottomIndex + (normalizedTarget.bottomIndex - startRange.bottomIndex) * eased);
    const frameRange = normalizeRange(
      { topIndex: interpolatedTop, bottomIndex: interpolatedBottom },
      totalRanks,
      DEFAULT_MIN_VIEWPORT_ROWS
    );

    store.setPitchRange(frameRange);
    store.emit('scrollChanged');

    const rowDelta = frameRange.topIndex - lastTop;
    if (rowDelta !== 0) {
      store.emit('scrollByUnits', rowDelta);
      lastTop = frameRange.topIndex;
    }

    recalcAndApplyLayout();
    store.emit('zoomChanged');

    if (t < 1) {
      pitchRangeAnimationFrame = requestAnimationFrame(step);
      return;
    }

    pitchRangeAnimationFrame = null;
    isZooming = false;
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


  gridScrollbarProxy = document.getElementById('grid-scrollbar-proxy');


  gridScrollbarInner = (gridScrollbarProxy?.querySelector('.grid-scrollbar-inner')!) || null;





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


    requestAnimationFrame(recalcAndApplyLayout);


    return;


  }


  pitchGridNotReadyLogged = false;





  if (isRecalculating) {


    return;


  }





  isRecalculating = true;





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
  const containerHeight = getPitchGridContainerHeight();
  const rowCount = Math.max(1, getSpan(normalizedRange));
  currentZoomLevel = calculateZoomToFitRowCount(containerHeight, rowCount);

  // Round cell dimensions to prevent fractional pixels (temporary values, will be recalculated with final container height)
  const newCellHeight = Math.round(baseCellHeight * currentZoomLevel);
  const newCellWidth = Math.round(baseCellWidth * currentZoomLevel);

  store.setLayoutConfig({
    cellHeight: newCellHeight,
    cellWidth: newCellWidth
  });

  const newColumnWidths = calculateColumnWidths(store.state);
  store.setLayoutConfig({
    columnWidths: newColumnWidths
  });

  markInitialLayoutReady();

  if (!store.state.cellWidth || !newColumnWidths.length) {
    logger.warn('LayoutService', 'Unexpected layout configuration', {
      cellWidth: store.state.cellWidth,
      columnCount: newColumnWidths.length
    }, 'layout');
  }





  const totalWidthUnits = newColumnWidths.reduce((sum, w) => sum + w, 0);


  const musicalCanvasWidth = totalWidthUnits * store.state.cellWidth;  // Musical area only (canvas-space)


  const modulatedMusicalWidth = LayoutService.getModulatedCanvasWidth();


  // Always use modulated width if modulation is active (allows compression)
  // Only fall back to unmodulated musical width if no modulation present
  const hasModulation = store.state.modulationMarkers && store.state.modulationMarkers.length > 0;
  const finalMusicalWidth = hasModulation ? modulatedMusicalWidth : musicalCanvasWidth;

  // After Phase 8: Add legend widths to musical width to get total grid width
  const leftLegendWidthUnits = SIDE_COLUMN_WIDTH * 2 * store.state.cellWidth;
  const rightLegendWidthUnits = SIDE_COLUMN_WIDTH * 2 * store.state.cellWidth;
  const totalCanvasWidthPx = Math.round(finalMusicalWidth + leftLegendWidthUnits + rightLegendWidthUnits);

  const pixelRatio = getDevicePixelRatio();





  const _drumGridWrapper = document.getElementById('drum-grid-wrapper');


  const gridsWrapper = document.getElementById('grids-wrapper');


  const targetWidth = totalCanvasWidthPx + 'px';




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





  // Scrollbar proxy should fill viewport (width: 100%), inner should be full grid width


  if (gridScrollbarInner && gridScrollbarProxy) {


    gridScrollbarInner.style.width = targetWidth;





    // Check if grids extend beyond viewport


    const gridsWrapperWidth = gridsWrapper?.getBoundingClientRect().width || 0;


    const needsScrollbar = totalCanvasWidthPx > gridsWrapperWidth;





    // Show/hide scrollbar based on whether content exceeds viewport


    if (needsScrollbar) {


      gridScrollbarProxy.style.display = '';


    } else {


      gridScrollbarProxy.style.display = 'none';


    }





  }





  // Calculate button grid height (same as drum grid for visual consistency)


  const buttonRowHeight = Math.max(BASE_DRUM_ROW_HEIGHT, DRUM_HEIGHT_SCALE_FACTOR * store.state.cellHeight);


  const buttonGridHeight = DRUM_ROW_COUNT * buttonRowHeight;


  const buttonGridHeightPx = `${buttonGridHeight}px`;





  // Calculate middle cell width (excluding left and right legend columns)
  // IMPORTANT: Apply modulation if active to match the musical canvas width


  const columnWidthsCount = store.state.columnWidths?.length ?? 0;


  let middleCellWidth = 0;

  if (hasModulation) {
    // Use modulated width calculation (columnWidths is now canvas-space after Phase 8)
    const renderOptions = {
      cellWidth: store.state.cellWidth,
      columnWidths: store.state.columnWidths,
      modulationMarkers: store.state.modulationMarkers,
      baseMicrobeatPx: store.state.cellWidth,
      cellHeight: store.state.cellHeight,
      state: store.state
    };
    // Get total modulated width from pixelMapService
    middleCellWidth = getTotalPixelWidth(renderOptions);
  } else {
    // No modulation: use unmodulated width calculation
    // columnWidths is now canvas-space (no legends), so sum all of it
    for (let i = 0; i < columnWidthsCount; i++) {


      middleCellWidth += (store.state.columnWidths[i] || 0) * store.state.cellWidth;


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


      cellWidth: store.state.cellWidth,


      macrobeatGroupings: store.state.macrobeatGroupings


    }, 'layout');


  }





  // Set widths and heights for the three-cell button grid structure


  if (buttonGridWrapper) {


    const leftCell = buttonGridWrapper.querySelector<HTMLElement>('.button-grid-left-cell');


    const middleCell = buttonGridWrapper.querySelector<HTMLElement>('.button-grid-middle-cell');


    const rightCell = buttonGridWrapper.querySelector<HTMLElement>('.button-grid-right-cell');





    // Calculate left legend width (first 2 columns)


    const leftCellWidth = SIDE_COLUMN_WIDTH * 2 * store.state.cellWidth;





    // Calculate right legend width (last 2 columns)


    const rightCellWidth = SIDE_COLUMN_WIDTH * 2 * store.state.cellWidth;





    const buttonGridHeightChanged = Math.abs(lastCalculatedButtonGridHeight - buttonGridHeight) > 5;


    const shouldUpdateButtonGridHeight = buttonGridHeightChanged || lastCalculatedButtonGridHeight === 0;





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


          cellWidth: store.state.cellWidth


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


          cellWidth: store.state.cellWidth


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


  const drumRowHeight = Math.max(BASE_DRUM_ROW_HEIGHT, DRUM_HEIGHT_SCALE_FACTOR * store.state.cellHeight);


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

  // CRITICAL FIX: Recalculate zoom with FINAL container height (after DOM has settled from width changes)
  // This ensures cell dimensions match the actual container size, eliminating coverage gaps and fractional pixels.
  // The initial calculation at line 645 used the pre-reflow height (314px); now we use the final height (321px).
  if (pitchContainerHeight > 0) {
    const prevCellHeight = store.state.cellHeight;
    const prevCellWidth = store.state.cellWidth;
    const finalRowCount = Math.max(1, getSpan(normalizedRange));
    const recalculatedZoom = calculateZoomToFitRowCount(pitchContainerHeight, finalRowCount);
    const finalCellHeight = Math.round(baseCellHeight * recalculatedZoom);  // Round to prevent fractional pixels
    const finalCellWidth = Math.round(baseCellWidth * recalculatedZoom);

    // Update with final, rounded dimensions
    store.setLayoutConfig({
      cellHeight: finalCellHeight,
      cellWidth: finalCellWidth
    });

    // Update current zoom level for consistency
    currentZoomLevel = recalculatedZoom;

    if (finalCellHeight !== prevCellHeight || finalCellWidth !== prevCellWidth) {
      pendingFinalRecalc = true;
    }
  }

  // Legend columns are fixed width (not in newColumnWidths after Phase 8)
  const leftLegendWidthPx = Math.round(SIDE_COLUMN_WIDTH * 2 * store.state.cellWidth);
  const rightLegendWidthPx = Math.round(SIDE_COLUMN_WIDTH * 2 * store.state.cellWidth);

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





  const drumCanvasTargets = [


    { element: drumCanvas, context: drumCtx },


    { element: drumPlayheadCanvas },


    { element: drumHoverCanvas }


  ];





  drumCanvasTargets.forEach(({ element, context }) => {


    resizeCanvasForPixelRatio(element, musicalCanvasWidthPx, drumCanvasHeight, pixelRatio, context);


  });





  if (drumGridWrapper) {

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


  const drumHeightChanged = Math.abs(lastCalculatedDrumHeight - drumCanvasHeight) > 5;


  const shouldUpdateDrumHeight = drumHeightChanged || lastCalculatedDrumHeight === 0;





  if (drumGridWrapper && shouldUpdateDrumHeight) {


    drumGridWrapper.style.height = drumHeightPx;


    lastCalculatedDrumHeight = drumCanvasHeight;


  }





  const scheduledPixelRatio = pixelRatio;


  const scheduledPitchWidth = musicalCanvasWidthPx; // Use musical width, not total width





  // Coalesce the deferred resize work so rapid reflows (e.g., animated zoom presets) don't
  // stack up many pending timers and `canvasResized` events.
  if (deferredPitchResizeTimeout) {
    clearTimeout(deferredPitchResizeTimeout);
  }
  deferredPitchResizeTimeout = setTimeout(() => {
    deferredPitchResizeTimeout = null;


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

    document.dispatchEvent(new CustomEvent('canvasResized', {


      detail: { source: 'layoutService-deferred' }


    }));





  } );








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
    if (finalRecalcAttempts < 1) {
      finalRecalcAttempts += 1;
      requestAnimationFrame(recalcAndApplyLayout);
    } else {
      logger.warn('LayoutService', 'Skipped additional layout pass after repeated final zoom adjustments.', {
        finalRecalcAttempts
      }, 'layout');
    }
  } else {
    finalRecalcAttempts = 0;
  }


}








const LayoutService = {


  init() {


    const { ctx, drumCtx, legendLeftCtx, legendRightCtx } = initDOMElements();


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
    const containerHeight = getPitchGridContainerHeight();
    const totalRanks = store.state.fullRowData.length;
    const maxIndex = Math.max(0, totalRanks - 1);

    if (!totalRanks || totalRanks <= 0) {return;}

    const desiredSpanRaw = (2 * containerHeight) / (zoom * BASE_ABSTRACT_UNIT);
    // Inverse of calculateZoomToFitRowCount(): zoom fits (span + 1) halfUnits into the container.
    const desiredSpan = Math.max(
      DEFAULT_MIN_VIEWPORT_ROWS,
      Math.min(totalRanks, Math.round(desiredSpanRaw) - 1)
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
    const durationMs = Math.max(0, Math.round(options.animateMs ?? 0));
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
    const zoomStep = getAdaptiveZoomStep(currentSpan, totalRanks);
    const target = zoomRange(current, 'in', {
      totalRanks,
      minSpan: DEFAULT_MIN_VIEWPORT_ROWS,
      zoomStep
    });
    const targetSpan = getSpan(target);

    const source = payload?.source ?? 'unknown';
    const durationMs = source === 'wheel' ? 0 : 280;

    logger.debug('LayoutService', `[Zoom] Range zoom in (span ${currentSpan} -> ${targetSpan})`, { source }, 'layout');

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
    const zoomStep = getAdaptiveZoomStep(currentSpan, totalRanks);
    const target = zoomRange(current, 'out', {
      totalRanks,
      minSpan: DEFAULT_MIN_VIEWPORT_ROWS,
      zoomStep
    });
    const targetSpan = getSpan(target);

    const source = payload?.source ?? 'unknown';
    const durationMs = source === 'wheel' ? 0 : 280;

    logger.debug('LayoutService', `[Zoom] Range zoom out (span ${currentSpan} -> ${targetSpan})`, { source }, 'layout');

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
    animatePitchRangeTo({ topIndex: 0, bottomIndex: maxIndex }, 320, `resetZoom:${source}`);
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
      modulationMarkers: store.state.modulationMarkers,
      baseMicrobeatPx: cellWidth,
      state: store.state
    });


  },





  getCanvasWidth() {


    return getCanvasWidthFromColumns(store.state.columnWidths, store.state.cellWidth);


  },





  getModulatedCanvasWidth() {


    const baseWidth = this.getCanvasWidth();





    if (!store.state.modulationMarkers || store.state.modulationMarkers.length === 0) {


      return baseWidth;


    }





    try {


      const cellWidth = store.state.cellWidth || 40;
      const columnWidths = store.state.columnWidths || [];  // Canvas-space after Phase 8

      const renderOptions = {
        cellWidth,
        columnWidths,
        modulationMarkers: store.state.modulationMarkers,
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


    recalcAndApplyLayout();


  },





  reflow() {


    recalcAndApplyLayout();


  },





  get isZooming() {


    return isZooming;


  }


};





export default LayoutService;
