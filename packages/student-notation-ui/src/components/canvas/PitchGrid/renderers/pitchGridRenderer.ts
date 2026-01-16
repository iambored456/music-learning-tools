// js/components/Canvas/PitchGrid/renderers/pitchGridRenderer.ts
import store from '@state/initStore.ts';
import { drawHorizontalLines, drawVerticalLines } from './gridLines.js';
import { drawLegendsToSeparateCanvases } from './legend.js';
import { drawSingleColumnOvalNote, drawTwoColumnOvalNote, drawTonicShape } from './notes.js';
import { getRowY, getVisibleRowRange } from './rendererUtils.js';
import { renderSixteenthStamps } from './sixteenthStampRenderer.js';
import { renderTripletStamps } from './tripletStampRenderer.js';
import { renderModulationMarkers } from './modulationRenderer.js';
import { renderAnnotations } from './annotationRenderer.js';
import { getLogicalCanvasWidth, getLogicalCanvasHeight } from '@utils/canvasDimensions.ts';
import { assertRowIntegrity } from '@utils/rowCoordinates.ts';
import { fullRowData as masterRowData } from '@state/pitchData.ts';
import CanvasContextService from '@services/canvasContextService.ts';
import type { AppState, PlacedNote, TonicSign } from '@app-types/state.js';

const isDev = import.meta.env.DEV;

let lastViewportDebugLogAt = 0;
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
    // Never let debug logging break rendering.
  }
}

type PitchGridRenderOptions = {
  placedNotes: PlacedNote[];
  placedTonicSigns: TonicSign[];
  rowHeight?: number;
  colorMode?: 'color' | 'bw';
  zoomLevel?: number;
  viewportHeight: number;
  /** Whether to show modulation marker labels (default: true). Student Notation hides PitchGrid labels. */
  showModulationLabel?: boolean;
} & Pick<AppState,
  | 'fullRowData'
  | 'columnWidths'
  | 'cellWidth'
  | 'cellHeight'
  | 'macrobeatGroupings'
  | 'macrobeatBoundaryStyles'
  | 'degreeDisplayMode'
  | 'tempoModulationMarkers'
  | 'accidentalMode'
  | 'showFrequencyLabels'
  | 'showOctaveLabels'
>;

export function drawPitchGrid(ctx: CanvasRenderingContext2D, options: PitchGridRenderOptions): void {
  const fullOptions: AppState & PitchGridRenderOptions = { ...(store.state), ...options };

  // Quick visibility debug
  if (!fullOptions.columnWidths?.length || !fullOptions.fullRowData?.length) {
    return;
  }

  ctx.clearRect(0, 0, getLogicalCanvasWidth(ctx.canvas), getLogicalCanvasHeight(ctx.canvas));

  // 1. Get the range of rows that are actually visible
  const { startRow, endRow } = getVisibleRowRange();

  // ROW COVERAGE NOTE (viewport vs draw range)
  // ------------------------------------------
  // Pitch rows are spaced at `halfUnit = cellHeight / 2`, but each row cell we draw is `cellHeight` tall.
  // Because of this overlap, a row just outside the computed visible range can still be partially visible
  // within the viewport (the "peek" area).
  //
  // If we render *only* [startRow..endRow], one parity column (A or B) can end one halfUnit earlier than
  // the other in mid-gamut, leaving a thin blank band at the top/bottom of the pitch Y-axis labels and
  // horizontal gridlines. To avoid that, we pad the draw range by 1 row on each side (clamped to gamut).
  //
  // FIX: This removes the “mystery blank row” that could appear at the bottom of the viewport even when
  // `atTopGamutEdge === false` and `atBottomGamutEdge === false`.
  const paddedStartRow = Math.max(0, startRow - 1);
  const maxRowIndex = Math.max(0, (fullOptions.fullRowData?.length ?? 1) - 1);
  const paddedEndRow = Math.min(maxRowIndex, endRow + 1);

  // Compare main canvas height to the row math (helps diagnose legend-only blank bands).
  if (isViewportDebugEnabled()) {
    const canvasHeight = getLogicalCanvasHeight(ctx.canvas);
    const halfUnit = fullOptions.cellHeight / 2;
    const yEnd = getRowY(endRow, fullOptions);
    const bottomEdge = yEnd + halfUnit;
    const totalRows = fullOptions.fullRowData?.length ?? 0;
    const atTopGamutEdge = startRow <= 0;
    const atBottomGamutEdge = totalRows > 0 ? endRow >= totalRows - 1 : false;
    const startRowData = fullOptions.fullRowData?.[startRow];
    const endRowData = fullOptions.fullRowData?.[endRow];
    logViewportDebug('pitchCanvasCoverage', {
      startRow,
      endRow,
      paddedStartRow,
      paddedEndRow,
      atTopGamutEdge,
      atBottomGamutEdge,
      canvasHeight,
      containerHeight: fullOptions.viewportHeight,
      halfUnit,
      yEnd,
      bottomEdge,
      gapCanvasMinusBottomEdge: canvasHeight - bottomEdge,
      gapCanvasMinusContainer: canvasHeight - fullOptions.viewportHeight,
      startRowSummary: startRowData ? { pitch: startRowData.pitch, column: startRowData.column, isBoundary: Boolean((startRowData as any).isBoundary) } : null,
      endRowSummary: endRowData ? { pitch: endRowData.pitch, column: endRowData.column, isBoundary: Boolean((endRowData as any).isBoundary) } : null
    });
  }

  // NOTE ABOUT VERTICAL VIRTUALIZATION
  // ---------------------------------
  // Rows are spaced at `halfUnit = cellHeight / 2`, while notes are ~`cellHeight` tall.
  // That means a note can "peek" into view before its center row is fully inside the viewport.
  //
  // If we virtualize strictly by row index (globalRow in [startRow,endRow]), notes will pop
  // in late (appearing as a full circle instead of partially visible at the bottom edge).
  // This was observed as: "notes appear from the bottom one row later than they should".
  //
  // To preserve smooth edge behavior, treat a row as visible if its center is within a
  // 1-cell padding above/below the viewport.
  const rowVisibilityPaddingPx = fullOptions.cellHeight;
  const isRowCenterInOrNearViewport = (globalRow: number): boolean => {
    const y = getRowY(globalRow, fullOptions);
    return y >= -rowVisibilityPaddingPx && y <= (fullOptions.viewportHeight + rowVisibilityPaddingPx);
  };

  // Filter tonic signs to only those in/near the visible range
  // Tonic signs are already stored with their fixed row positions (octave replication happens at placement time)
  // Use globalRow for visibility since it is stable across pitch-range changes.
  const visibleTonicSigns = fullOptions.placedTonicSigns.filter(sign => {
    if (sign.globalRow === undefined) {return false;}
    return isRowCenterInOrNearViewport(sign.globalRow);
  });

  // 2. Draw pitch-to-Y-axis labels (left/right sidebars; historically called "legend" canvases)
  const legendLeftCtx = CanvasContextService.getLegendLeftContext();
  const legendRightCtx = CanvasContextService.getLegendRightContext();
  drawLegendsToSeparateCanvases(legendLeftCtx, legendRightCtx, fullOptions, paddedStartRow, paddedEndRow);

  // 3. Pass the visible range to the renderers that draw row-based elements
  drawHorizontalLines(ctx, fullOptions, paddedStartRow, paddedEndRow);
  drawVerticalLines(ctx, fullOptions); // Vertical lines are not virtualized

  // 4. Filter notes and signs to only those that are visible before drawing
  // Use globalRow for visibility since it is stable across pitch-range changes.
  const visibleNotes = options.placedNotes.filter(note => {
    if (note.isDrum || note.globalRow === undefined) {return false;}
    return isRowCenterInOrNearViewport(note.globalRow);
  });

  const uniqueVisibleTonicSigns = visibleTonicSigns;

  if (isDev) {
    const currentTopIndex = 0;
    visibleNotes.forEach(note => {
      assertRowIntegrity(
        note,
        fullOptions.fullRowData,
        masterRowData,
        currentTopIndex,
        'pitchGridRenderer:note'
      );
    });
    uniqueVisibleTonicSigns.forEach(sign => {
      assertRowIntegrity(
        sign,
        fullOptions.fullRowData,
        masterRowData,
        currentTopIndex,
        'pitchGridRenderer:tonic'
      );
    });
  }


  // Draw each visible note
  visibleNotes.forEach(note => {

    // The note drawing functions use getRowY which expects a global row index.
    // Use globalRow (not row) since row may be viewport-relative after pitch range changes.
    if (note.shape === 'oval') {
      drawSingleColumnOvalNote(ctx, fullOptions, note, note.globalRow!);
    } else if (note.shape === 'circle') {
      drawTwoColumnOvalNote(ctx, fullOptions, note, note.globalRow!);
    }
    // Other note shapes not yet implemented
  });

  // Draw tonic signs
  uniqueVisibleTonicSigns.forEach(sign => {
    drawTonicShape(ctx, fullOptions, sign);
  });

  // Draw stamps (render on top of everything else)
  renderSixteenthStamps(ctx, fullOptions);

  // Draw triplet groups (render on top of stamps)
  renderTripletStamps(ctx, fullOptions);

  // Draw modulation markers (render on top of everything else for UI overlay)
  renderModulationMarkers(ctx, fullOptions);

  // Draw annotations (render on top of modulation markers)
  renderAnnotations(ctx, fullOptions);

}
