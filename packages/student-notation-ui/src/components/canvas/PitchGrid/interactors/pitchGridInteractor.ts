/**
 * Pitch Grid Interactor
 *
 * Main event handler and coordinator for pitch grid interactions.
 * Delegates tool-specific logic to specialized interactors.
 *
 * Sub-modules:
 * - cursorManager.ts: Stamp cursor state management
 * - PitchGridInteractionCoordinator.ts: Tool routing and state coordination
 * - tools/*.ts: Tool-specific interactors (note, chord, eraser, stamps, etc.)
 *
 * @see index.ts for barrel exports
 */
import store from '@state/initStore.ts';
import { getMacrobeatInfo, getPlacedTonicSigns } from '@state/selectors.ts';
import { visualToTimeIndex, timeIndexToVisualColumn } from '@services/columnMap.ts';
import rhythmPlaybackService from '../../../../services/rhythmPlaybackService.ts';
import GridCoordsService from '@services/gridCoordsService.ts';
import pitchGridViewportService from '../../../../services/pitchGridViewportService.ts';
import annotationService from '../../../../services/annotationService.ts';
import { drawSingleColumnOvalNote, drawTwoColumnOvalNote } from '../renderers/notes.js';
import { getRowY, getColumnX } from '../renderers/rendererUtils.js';
import GlobalService from '@services/globalService.ts';
import { isNotePlayableAtColumn, isWithinTonicSpan } from '../../../../utils/tonicColumnUtils.ts';
import { setGhostNotePosition, clearGhostNotePosition } from '@services/spacebarHandler.ts';
import audioPreviewService from '@services/audioPreviewService.ts';
import { GROUP_WIDTH_CELLS } from '../../../../rhythm/tripletStamps.js';
import { canvasToTime, timeToCanvas } from '../../../../services/columnMapService.ts';
import SixteenthStampsToolbar from '@components/rhythm/stampToolbars/sixteenthStampsToolbar.js';
import TripletStampsToolbar from '@components/rhythm/stampToolbars/tripletStampsToolbar.js';
import { renderSixteenthStampPreview } from '../renderers/sixteenthStampRenderer.js';
import { renderTripletStampPreview } from '../renderers/tripletStampRenderer.js';
import { getModulationDisplayText, getModulationColor } from '../../../../rhythm/modulationMapping.js';
import { PitchGridModulationToolInteractor } from './tools/PitchGridModulationToolInteractor.ts';
import { PitchGridNoteToolInteractor } from './tools/PitchGridNoteToolInteractor.ts';
import { PitchGridEraserToolInteractor } from './tools/PitchGridEraserToolInteractor.ts';
import { PitchGridChordToolInteractor } from './tools/PitchGridChordToolInteractor.ts';
import { PitchGridSixteenthStampToolInteractor } from './tools/PitchGridSixteenthStampToolInteractor.ts';
import { PitchGridTripletStampToolInteractor } from './tools/PitchGridTripletStampToolInteractor.ts';
import { PitchGridTonicizationToolInteractor } from './tools/PitchGridTonicizationToolInteractor.ts';
import { PitchGridInteractionCoordinator } from './PitchGridInteractionCoordinator.ts';
import { PitchGridRightClickEraserInteractor } from './PitchGridRightClickEraserInteractor.ts';
import { PitchGridMobileLongPressNotePlacementInteractor } from './PitchGridMobileLongPressNotePlacementInteractor.ts';
import { getChordPitchesFromIntervals } from '@utils/chordPitchesFromIntervals.ts';
import logger from '@utils/logger.ts';
import { getLogicalCanvasWidth, getLogicalCanvasHeight } from '@utils/canvasDimensions.ts';
import { setStampHoverCursor, clearStampHoverCursor } from './cursorManager.ts';
import type { CanvasSpaceColumn, PlacedNote } from '@app-types/state.js';

// --- Interaction State ---
let pitchHoverCtx: CanvasRenderingContext2D | null = null;
let isDragging = false;
let activeNote: PlacedNote | null = null;
let activeChordNotes: PlacedNote[] = []; // NEW: To hold active chord notes during dragging
let activePreviewPitches: string[] = []; // NEW: To hold all pitches for audio preview
const placementFillNoteIds = new Set<string>(); // Track fills started during manual placement
let isEraserDragActive = false;
let lastDragRow: number | null = null; // Track last row during drag for pitch change detection

// --- Modulation Marker State ---
const modulationToolInteractor = new PitchGridModulationToolInteractor();
const noteToolInteractor = new PitchGridNoteToolInteractor();
const eraserToolInteractor = new PitchGridEraserToolInteractor();
const chordToolInteractor = new PitchGridChordToolInteractor();
const stampToolInteractor = new PitchGridSixteenthStampToolInteractor();
const tripletToolInteractor = new PitchGridTripletStampToolInteractor();
const tonicizationToolInteractor = new PitchGridTonicizationToolInteractor();
const rightClickEraserInteractor = new PitchGridRightClickEraserInteractor();
const interactionCoordinator = new PitchGridInteractionCoordinator({
  noteToolInteractor,
  chordToolInteractor,
  eraserToolInteractor,
  stampToolInteractor,
  tripletToolInteractor,
  modulationToolInteractor,
  tonicizationToolInteractor,
  placementFillNoteIds,
  getPitchForRow,
  getTimeAlignedCanvasColumn,
  getChordPitchesForRootPitch: rootPitch => getChordPitchesFromIntervals(rootPitch, store.state),
  findNearestMeasureBoundary
});

// --- Canvas + Mobile Interaction State ---
const MOBILE_LONG_PRESS_DELAY_MS = 275;
const MOBILE_GHOST_ALPHA = 0.25;
const mobileLongPressNotePlacementInteractor = new PitchGridMobileLongPressNotePlacementInteractor(
  {
    shouldUseMobileLongPress,
    isPositionWithinPitchGrid,
    getSelectedTool: () => store.state.selectedTool,
    getPitchHoverCtx: () => pitchHoverCtx,
    clearOverlay: handleMouseLeave,
    drawHoverHighlight,
    getNoteHoverColor,
    drawGhostNote,
    setGhostNotePosition,
    attemptPlaceNoteAt,
    onNotePlaced: handleGlobalMouseUp,
    onNoteNotPlaced: handleMouseLeave
  },
  { longPressDelayMs: MOBILE_LONG_PRESS_DELAY_MS, ghostAlpha: MOBILE_GHOST_ALPHA }
);

const DEFAULT_NOTE_COLOR = '#4a90e2';

function hexToRgba(hex: string, alpha = 1): string {
  const normalizedHex = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalizedHex.length !== 6) {return hex;}
  const r = parseInt(normalizedHex.slice(0, 2), 16);
  const g = parseInt(normalizedHex.slice(2, 4), 16);
  const b = parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getNoteHoverColor(alpha = 0.2): string {
  const color = store.state.selectedNote?.color || DEFAULT_NOTE_COLOR;
  return hexToRgba(color, alpha);
}

function getNoteColor(): string {
  return store.state.selectedNote?.color || DEFAULT_NOTE_COLOR;
}

const NOTE_DEBUG_LIMIT = 20;
let noteDebugCount = 0;
function debugNotePlacement(_stage: string, _details: Record<string, unknown> = {}): void {
  if (noteDebugCount >= NOTE_DEBUG_LIMIT) {
    return;
  }
  noteDebugCount += 1;
}

// --- Interaction Helpers ---
function isAnnotationToolActive(): boolean {
  return Boolean(annotationService.currentTool);
}

function getPitchForRow(rowIndex: number): string | null {
  const rowData = store.state.fullRowData[rowIndex];
  if (!rowData || rowData.isBoundary) {
    return null;
  }
  return rowData.toneNote;
}

// Convert a canvas-space column (no legends) to the nearest time-bearing canvas column
// by stripping tonic/non-time columns using the column map helper.
function getTimeAlignedCanvasColumn(canvasCol: number): number | null {
  const visualIndex = canvasCol + 2; // account for left legends
  const timeIndex = visualToTimeIndex(store.state, visualIndex);
  if (timeIndex === null) {return null;}
  const visualAligned = timeIndexToVisualColumn(store.state, timeIndex);
  if (visualAligned === null) {return null;}
  return Math.max(0, visualAligned - 2); // back to canvas-space
}

function isPositionWithinPitchGrid(colIndex: number, rowIndex: number): boolean {
  const isCircleNote =
        (store.state.selectedTool === 'note' || store.state.selectedTool === 'chord') &&
        store.state.selectedNote?.shape === 'circle';

  // colIndex is now CANVAS-SPACE (0 = first musical beat)
  // Use musicalColumnWidths to get the count of musical columns
  // Check for non-empty array (empty array is truthy but useless)
  const musicalColumnWidths = (store.state.musicalColumnWidths && store.state.musicalColumnWidths.length > 0)
    ? store.state.musicalColumnWidths
    : store.state.columnWidths || [];
  const musicalColumns = musicalColumnWidths.length;

  // Circle notes span 2 columns, so they can't be placed in the last column
  const maxColumn = isCircleNote ? musicalColumns - 1 : musicalColumns;

  if (colIndex < 0 || colIndex >= maxColumn) {
    return false;
  }

  return getPitchForRow(rowIndex) !== null;
}

// --- Hover Drawing Logic ---
function drawHoverHighlight(colIndex: number, rowIndex: number, color: string) {
  if (!pitchHoverCtx) {return;}

  // MODULATION FIX: Use modulated column positioning to match placed notes
  const fullOptions = { ...store.state, zoomLevel: pitchGridViewportService.getViewportInfo().zoomLevel };
  const x = getColumnX(colIndex, fullOptions);
  const centerY = getRowY(rowIndex, store.state);
  const y = centerY - (store.state.cellHeight / 2); // Center the full-height highlight on the rank


  const toolType = store.state.selectedTool;

  // MODULATION FIX: Calculate highlight width based on modulated grid scaling
  let highlightWidth;
  if (store.state.tempoModulationMarkers && store.state.tempoModulationMarkers.length > 0) {
    // For modulated grids, calculate the actual width by finding the difference
    // between this column position and the next column position
    const nextX = getColumnX(colIndex + 1, fullOptions);
    highlightWidth = nextX - x;
  } else {
    // No modulation - use standard calculation
    highlightWidth = (store.state.columnWidths[colIndex] ?? 1) * store.state.cellWidth;
  }

  // Apply tool-specific width overrides, but account for modulation scaling
  if (toolType === 'eraser' || rightClickEraserInteractor.getIsActive()) {
    if (store.state.tempoModulationMarkers && store.state.tempoModulationMarkers.length > 0) {
      // For modulated grids, calculate 2-column span using actual positions
      const twoColumnsEndX = getColumnX(colIndex + 2, fullOptions);
      highlightWidth = twoColumnsEndX - x;
    } else {
      highlightWidth = store.state.cellWidth * 2;
    }
  } else if (toolType === 'note' && store.state.selectedNote?.shape === 'circle') {
    if (store.state.tempoModulationMarkers && store.state.tempoModulationMarkers.length > 0) {
      // For modulated grids, calculate 2-column span using actual positions
      const twoColumnsEndX = getColumnX(colIndex + 2, fullOptions);
      highlightWidth = twoColumnsEndX - x;
    } else {
      highlightWidth = store.state.cellWidth * 2;
    }
  } else if (toolType === 'sixteenthStamp') {
    if (store.state.tempoModulationMarkers && store.state.tempoModulationMarkers.length > 0) {
      // For modulated grids, calculate 2-column span using actual positions
      const twoColumnsEndX = getColumnX(colIndex + 2, fullOptions);
      highlightWidth = twoColumnsEndX - x;
    } else {
      highlightWidth = store.state.cellWidth * 2;
    }
  } else if (toolType === 'tripletStamp') {
    // Triplet width depends on the selected triplet stamp (1 or 2 cells)
    const selectedTriplet = TripletStampsToolbar.getSelectedTripletStamp();
    if (selectedTriplet) {
      const span = selectedTriplet.span === 'eighth' ? 1 : 2; // eighth=1 cell, quarter=2 cells
      const cellSpan = 2 * span; // Each cell is 2 microbeats
      if (store.state.tempoModulationMarkers && store.state.tempoModulationMarkers.length > 0) {
        const spanEndX = getColumnX(colIndex + cellSpan, fullOptions);
        highlightWidth = spanEndX - x;
      } else {
        highlightWidth = store.state.cellWidth * cellSpan;
      }
    } else {
      highlightWidth = store.state.cellWidth * 2;
    }
  } else if (toolType === 'tonicization') {
    if (store.state.tempoModulationMarkers && store.state.tempoModulationMarkers.length > 0) {
      // For modulated grids, calculate 2-column span using actual positions
      const twoColumnsEndX = getColumnX(colIndex + 2, fullOptions);
      highlightWidth = twoColumnsEndX - x;
    } else {
      highlightWidth = store.state.cellWidth * 2;
    }
  }


  pitchHoverCtx.fillStyle = color;
  pitchHoverCtx.fillRect(x, y, highlightWidth, store.state.cellHeight); // Full height to cover rank space
}

function drawGhostNote(colIndex: number, rowIndex: number, isFaint = false) {
  if (!pitchHoverCtx || !store.state.selectedNote) {return;}
  const toolType = store.state.selectedTool;
  const { shape, color } = store.state.selectedNote;

  pitchHoverCtx.globalAlpha = isFaint ? 0.2 : 0.4;

  if (toolType === 'note') {
    // Create ghost note that snaps to grid positions like normal notes
    const baseEndColumn = shape === 'circle' ? colIndex + 1 : colIndex;
    const ghostNote = {
      uuid: 'ghost-note',
      globalRow: rowIndex,
      row: rowIndex,
      startColumnIndex: colIndex as CanvasSpaceColumn,
      endColumnIndex: baseEndColumn as CanvasSpaceColumn,
      color,
      shape,
      isDrum: false
    };
    const fullOptions = { ...store.state, zoomLevel: pitchGridViewportService.getViewportInfo().zoomLevel };
    if (shape === 'oval') {
      drawSingleColumnOvalNote(pitchHoverCtx, fullOptions, ghostNote as any, rowIndex);
    } else {
      drawTwoColumnOvalNote(pitchHoverCtx, fullOptions, ghostNote as any, rowIndex);
    }
  }
  pitchHoverCtx.globalAlpha = 1.0;
}

function attemptPlaceNoteAt(colIndex: number, rowIndex: number): boolean {
  const result = noteToolInteractor.attemptPlaceNoteAt(
    colIndex,
    rowIndex,
    { activeNote, lastDragRow, activePreviewPitches },
    placementFillNoteIds,
    {
      getPitchForRow
    }
  );

  activeNote = result.state.activeNote;
  lastDragRow = result.state.lastDragRow;
  activePreviewPitches = result.state.activePreviewPitches;
  if (result.placed && result.shouldStartDragging) {
    isDragging = true;
  }

  return result.placed;
}

function shouldUseMobileLongPress(): boolean {
  if (store.state.selectedTool !== 'note') {
    return false;
  }

  const profile = store.state.deviceProfile;
  if (profile && typeof profile.isMobile === 'boolean') {
    return profile.isMobile;
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  }

  return false;
}

// --- Event Handlers ---
function handleMouseDown(e: MouseEvent) {
  if (isAnnotationToolActive()) {
    handleMouseLeave();
    return;
  }

  if (!pitchHoverCtx) {
    return;
  }

  const target = e.target instanceof Element ? e.target : null;
  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const scrollLeft = document.getElementById('canvas-container')?.scrollLeft ?? 0;
  const colIndex = GridCoordsService.getColumnIndex(x + scrollLeft);
  const rowIndex = GridCoordsService.getPitchRowIndex(y);

  // Check boundaries - circle notes need more space than other tools
  if (!isPositionWithinPitchGrid(colIndex, rowIndex)) {
    if (store.state.selectedTool === 'note') {
      debugNotePlacement('blocked - outside pitch grid', { colIndex, rowIndex });
    }
    return;
  }

  if (e.button === 2) {
    const handled = rightClickEraserInteractor.handleMouseDown({
      event: e,
      colIndex: colIndex as CanvasSpaceColumn,
      rowIndex,
      annotationService
    });
    if (handled) {
      pitchHoverCtx.clearRect(0, 0, getLogicalCanvasWidth(pitchHoverCtx.canvas), getLogicalCanvasHeight(pitchHoverCtx.canvas));
      drawHoverHighlight(colIndex, rowIndex, 'rgba(220, 53, 69, 0.3)');
      return;
    }
  }

  if (e.button === 0) {
    // First check for modulation marker interactions (before tool-specific logic)
    const actualX = x + scrollLeft;

    if (modulationToolInteractor.handleMouseDown(actualX, y)) {
      return;
    }

    const existingNotePreviewResult = noteToolInteractor.handleExistingNoteMouseDown(
      colIndex,
      rowIndex,
      { activeNote, lastDragRow, activePreviewPitches },
      { getPitchForRow }
    );
    if (existingNotePreviewResult.handled) {
      activeNote = existingNotePreviewResult.state.activeNote;
      lastDragRow = existingNotePreviewResult.state.lastDragRow;
      activePreviewPitches = existingNotePreviewResult.state.activePreviewPitches;
      return; // Don't process as a new note placement
    }

    const toolType = store.state.selectedTool;
    if (toolType === 'note' || toolType === 'chord') {
      // Clicking on a stamp while in note/chord mode should drag the stamp shape,
      // not place a new note on top of it.
      const dragSixteenth = stampToolInteractor.tryStartShapeDrag({ actualX: x + scrollLeft, canvasY: y });
      const dragTriplet = !dragSixteenth && tripletToolInteractor.tryStartShapeDrag({ actualX: x + scrollLeft, canvasY: y });
      if (dragSixteenth || dragTriplet) {
        return;
      }

      const hitSixteenth = rhythmPlaybackService.getSixteenthStampAtPosition(colIndex, rowIndex);
      const timeCol = canvasToTime(colIndex, store.state);
      const hitTriplet = timeCol === null ? null : rhythmPlaybackService.getTripletStampAtPosition(timeCol, rowIndex);
      if (hitSixteenth || hitTriplet) {
        return;
      }
    }
    const toolResult = interactionCoordinator.handleToolMouseDown({
      toolType,
      colIndex,
      rowIndex,
      actualX: x + scrollLeft,
      canvasY: y,
      state: {
        isDragging,
        isEraserDragActive,
        activeNote,
        activeChordNotes,
        activePreviewPitches,
        lastDragRow
      }
    });

    if (toolResult.handled) {
      isDragging = toolResult.state.isDragging;
      isEraserDragActive = toolResult.state.isEraserDragActive;
      activeNote = toolResult.state.activeNote;
      activeChordNotes = toolResult.state.activeChordNotes;
      activePreviewPitches = toolResult.state.activePreviewPitches;
      lastDragRow = toolResult.state.lastDragRow;
      return;
    }
  }
}

function handleMouseMove(e: MouseEvent) {
  if (isAnnotationToolActive()) {
    handleMouseLeave();
    return;
  }

  if (!pitchHoverCtx) {
    return;
  }

  const target = e.target instanceof Element ? e.target : null;
  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const scrollLeft = document.getElementById('canvas-container')?.scrollLeft ?? 0;
  const colIndex = GridCoordsService.getColumnIndex(x + scrollLeft);
  const rowIndex = GridCoordsService.getPitchRowIndex(y);

  if (!pitchHoverCtx) {return;}
  pitchHoverCtx.clearRect(0, 0, getLogicalCanvasWidth(pitchHoverCtx.canvas), getLogicalCanvasHeight(pitchHoverCtx.canvas));

  const canvasEl = e.target instanceof HTMLElement ? e.target : null;
  const toolType = store.state.selectedTool;
  const actualX = x + scrollLeft;
  const timeCol = canvasToTime(colIndex, store.state);
  const preBoundsMoveResult = interactionCoordinator.handleToolMouseMoveBeforeBoundsCheck({
    actualX,
    rowIndex,
    canvasEl,
    state: {
      isDragging,
      isEraserDragActive,
      activeNote,
      activeChordNotes,
      activePreviewPitches,
      lastDragRow
    }
  });
  if (preBoundsMoveResult.handled) {
    return;
  }

  interactionCoordinator.handleToolHoverVisuals({
    toolType,
    actualX,
    canvasY: y,
    pitchHoverCtx,
    canvasEl,
    selectedModulationRatio: store.state.selectedModulationRatio,
    findNearestMeasureBoundary,
    drawModulationPreview
  });

  // Debug log when dragging (currently disabled)
  // if (isDragging) {
  //   // TODO: Add drag debugging
  // }

  // CANVAS-SPACE FIX: Check boundaries using canvas-space coordinates (0 = first musical beat)
  const isCircleNote = (store.state.selectedTool === 'note' || store.state.selectedTool === 'chord') && store.state.selectedNote?.shape === 'circle';
  const musicalColumnsLength = store.state.columnWidths.length;
  const maxColumn = isCircleNote ? musicalColumnsLength - 1 : musicalColumnsLength;
  if (colIndex < 0 || colIndex >= maxColumn || getPitchForRow(rowIndex) === null) {
    // Out of bounds - handled below
    tonicizationToolInteractor.resetHoverState();
    clearGhostNotePosition();
    return;
  }

  // Update ghost note position for spacebar handler
  setGhostNotePosition(colIndex, rowIndex);

  const hitSixteenth = rhythmPlaybackService.getSixteenthStampAtPosition(colIndex, rowIndex);
  const hitTriplet = timeCol === null ? null : rhythmPlaybackService.getTripletStampAtPosition(timeCol, rowIndex);
  const isStampHover = Boolean(hitSixteenth || hitTriplet);
  const suppressNoteHover = isStampHover && (toolType === 'note' || toolType === 'chord');

  const shouldShowGrabCursor = isStampHover &&
    toolType !== 'eraser' &&
    !stampToolInteractor.isDraggingShape() &&
    !tripletToolInteractor.isDraggingShape();
  if (shouldShowGrabCursor) {
    setStampHoverCursor(canvasEl);
  } else {
    clearStampHoverCursor();
  }

  const isStampTool = toolType === 'sixteenthStamp' || toolType === 'tripletStamp';

  if (isStampTool && isStampHover) {
    return;
  }

  // Handle dragging FIRST, before any tool-specific logic
  // During drag, we update note positions and trigger pitch changes
  const dragMoveResult = interactionCoordinator.handleNoteOrChordDragMouseMove({
    colIndex,
    rowIndex,
    state: {
      isDragging,
      isEraserDragActive,
      activeNote,
      activeChordNotes,
      activePreviewPitches,
      lastDragRow
    }
  });
  if (dragMoveResult.handled) {
    isDragging = dragMoveResult.state.isDragging;
    isEraserDragActive = dragMoveResult.state.isEraserDragActive;
    activeNote = dragMoveResult.state.activeNote;
    activeChordNotes = dragMoveResult.state.activeChordNotes;
    activePreviewPitches = dragMoveResult.state.activePreviewPitches;
    lastDragRow = dragMoveResult.state.lastDragRow;
    return;
  }

  if (!suppressNoteHover && interactionCoordinator.handleChordToolHover({
    colIndex,
    rowIndex,
    pitchHoverCtx,
    zoomLevel: pitchGridViewportService.getViewportInfo().zoomLevel,
    drawSingleColumnOvalNote,
    drawTwoColumnOvalNote
  })) {
    return;
  }

  if (rightClickEraserInteractor.handleMouseMove({
    event: e,
    colIndex: colIndex as CanvasSpaceColumn,
    rowIndex,
    annotationService
  })) {
    drawHoverHighlight(colIndex, rowIndex, 'rgba(220, 53, 69, 0.3)');
    return;
  }

  if (eraserToolInteractor.handleMouseMove(colIndex, rowIndex, isEraserDragActive)) {
    drawHoverHighlight(colIndex, rowIndex, 'rgba(220, 53, 69, 0.3)');
    return;
  }

  if (pitchHoverCtx && tonicizationToolInteractor.handleMouseMove({ colIndex, rowIndex, hoverCtx: pitchHoverCtx, getPitchForRow })) {
    return;
  }

  // When hovering a stamp, suppress note/chord hover visuals so stamps remain the active target.
  if (suppressNoteHover) {
    return;
  }

  const placedTonicSigns = getPlacedTonicSigns(store.state);
  const isCircle = store.state.selectedNote?.shape === 'circle';
  let tripletStartTimeIndex: number | null = null;

    // Determine if placement is allowed based on tool type
    let canPlace = true;
    if (store.state.selectedTool === 'note' || store.state.selectedTool === 'chord') {
      // Notes: check start column, and for circles also check end column
      canPlace = isNotePlayableAtColumn(colIndex, store.state) &&
        (!isCircle || isNotePlayableAtColumn(colIndex + 1, store.state));
    } else if (store.state.selectedTool === 'sixteenthStamp') {
      // Stamps span 2 microbeats - check both columns
      const alignedCol = getTimeAlignedCanvasColumn(colIndex);
      canPlace = alignedCol !== null &&
        !isWithinTonicSpan(alignedCol, placedTonicSigns) &&
        !isWithinTonicSpan(alignedCol + 1, placedTonicSigns);
    } else if (store.state.selectedTool === 'tripletStamp') {
      // Triplets span multiple microbeats - check all microbeat columns
      const selectedTriplet = TripletStampsToolbar.getSelectedTripletStamp();
      if (selectedTriplet) {
        // Convert canvas-space column to time-space
        const timeCol = canvasToTime(colIndex, store.state);
        if (timeCol === null) {
          canPlace = false; // On a tonic column
        } else {
          tripletStartTimeIndex = timeCol;
          // Use GROUP_WIDTH_CELLS to get the correct span (eighth=1, quarter=2)
          const span = GROUP_WIDTH_CELLS[selectedTriplet.span] ?? 1;

          // Check if triplet would overlap tonic columns
          // This mirrors the fixed logic in canPlaceTripletAt()
          const timeSpan = span * 2; // How many time columns (microbeats) this triplet occupies

          // Get the canvas-space start column
          const startCanvasCol = timeToCanvas(tripletStartTimeIndex, store.state);

          // Check if any tonic falls within the required canvas range
          canPlace = true; // Assume allowed unless tonic found
          for (const tonicSign of placedTonicSigns) {
            const tonicStart = tonicSign.columnIndex;
            const tonicEnd = tonicSign.columnIndex + 1;

            // Block if tonic starts within our required time span
            if (tonicStart >= startCanvasCol && tonicStart < startCanvasCol + timeSpan) {
              canPlace = false;
              break;
            }

            // Block if we're trying to start ON a tonic
            if (startCanvasCol >= tonicStart && startCanvasCol <= tonicEnd) {
              canPlace = false;
              break;
            }
          }
        }
      }
    }

    const highlightColor = store.state.selectedTool === 'eraser'
      ? 'rgba(220, 53, 69, 0.3)'
      : canPlace
        ? getNoteHoverColor(0.2)
        : 'rgba(220, 53, 69, 0.15)';

    const highlightStartCol = colIndex;
    drawHoverHighlight(highlightStartCol, rowIndex, highlightColor);

    if (store.state.selectedTool === 'sixteenthStamp') {
      // Show stamp preview (only if placement is allowed)
      const selectedStamp = SixteenthStampsToolbar.getSelectedSixteenthStamp();
      if (selectedStamp && canPlace) {

        const alignedCol = getTimeAlignedCanvasColumn(colIndex);
        if (alignedCol === null) {return;}

        const options = {
          cellWidth: store.state.cellWidth,
          cellHeight: store.state.cellHeight,
          columnWidths: store.state.columnWidths,
          musicalColumnWidths: store.state.columnWidths,
          tempoModulationMarkers: store.state.tempoModulationMarkers,
          baseMicrobeatPx: store.state.cellWidth,
          macrobeatGroupings: store.state.macrobeatGroupings,
          previewColor: getNoteColor()
        };

        renderSixteenthStampPreview(pitchHoverCtx, alignedCol, rowIndex, selectedStamp, options);
      }
    } else if (store.state.selectedTool === 'tripletStamp') {
      // Show triplet preview (only if placement is allowed)
      const selectedTriplet = TripletStampsToolbar.getSelectedTripletStamp();
      if (selectedTriplet && canPlace && tripletStartTimeIndex !== null) {
        // Pass canvas-space column directly - the renderer will handle coordinate conversion
        const options = {
          cellWidth: store.state.cellWidth,
          cellHeight: store.state.cellHeight,
          columnWidths: store.state.columnWidths,
          musicalColumnWidths: store.state.columnWidths,
          tempoModulationMarkers: store.state.tempoModulationMarkers,
          baseMicrobeatPx: store.state.cellWidth,
          macrobeatGroupings: store.state.macrobeatGroupings,
          previewColor: getNoteColor()
        };
        renderTripletStampPreview(pitchHoverCtx, tripletStartTimeIndex, rowIndex, selectedTriplet, options);
      }
    } else if (canPlace) {
      drawGhostNote(colIndex, rowIndex);
    }
}

function handleMouseLeave() {
  if (pitchHoverCtx) {
    pitchHoverCtx.clearRect(0, 0, getLogicalCanvasWidth(pitchHoverCtx.canvas), getLogicalCanvasHeight(pitchHoverCtx.canvas));
  }
  clearStampHoverCursor();
  tonicizationToolInteractor.resetHoverState();
  clearGhostNotePosition();
}

function handleGlobalMouseUp() {
  if (interactionCoordinator.handleToolMouseUp()) {
    return;
  }

  // MODIFIED: Release any pitches that were triggered for preview
  if (activePreviewPitches.length > 0) {
    // Stop any active rhythm pattern playback
    rhythmPlaybackService.stopCurrentPattern();

    const previewColor = activeNote?.color
      ?? activeChordNotes[0]?.color
      ?? store.state.selectedNote?.color;

    if (previewColor) {
      audioPreviewService.releasePitches(activePreviewPitches, previewColor);
    }

    // Determine which ADSR visual to release
    const note = activeNote;
    if (note && previewColor) {
      const adsr = store.state.timbres[previewColor]?.adsr;
      if (adsr) {
        const pitchColor = store.state.fullRowData[note.row]?.hex || '#888888';
        GlobalService.adsrComponent?.playheadManager.trigger(note.uuid, 'release', pitchColor, adsr);
      }
    } else if (previewColor) { // It was a chord preview
      const rootPitch = activePreviewPitches[0];
      if (!rootPitch) {
        activePreviewPitches = [];
        return;
      }
      const rootRow = store.state.fullRowData.find(row => row.toneNote === rootPitch);
      if (rootRow) {
        const adsr = store.state.timbres[previewColor]?.adsr;
        if (adsr) {
          const pitchColor = rootRow.hex;
          GlobalService.adsrComponent?.playheadManager.trigger('chord_preview', 'release', pitchColor, adsr);
        }
      }
    }
    activePreviewPitches = [];

    // Stop dynamic waveform visualization when releasing note
    const staticWaveform = window.waveformVisualizer;
    if (staticWaveform) {
      staticWaveform.stopLiveVisualization();
    }
  }

  if (activeNote?.uuid && placementFillNoteIds.has(activeNote.uuid)) {
    store.emit('noteRelease', { noteId: activeNote.uuid, color: activeNote.color });
    placementFillNoteIds.delete(activeNote.uuid);
  }

  activeChordNotes.forEach(note => {
    if (note?.uuid && placementFillNoteIds.has(note.uuid)) {
      store.emit('noteRelease', { noteId: note.uuid, color: note.color });
      placementFillNoteIds.delete(note.uuid);
    }
  });

  if (isDragging) {
    store.recordState();
  }
  isDragging = false;
  lastDragRow = null; // Reset drag row tracking

  // Emit interaction end events for animation service before clearing
  if (activeNote?.uuid) {
    store.emit('noteInteractionEnd', { noteId: activeNote.uuid });
  }
  activeChordNotes.forEach(note => {
    if (note.uuid) {
      store.emit('noteInteractionEnd', { noteId: note.uuid });
    }
  });

  activeNote = null;
  activeChordNotes = [];

  if (isEraserDragActive) {
    store.recordState(); // Record state after eraser drag operation
    isEraserDragActive = false;
  }

  rightClickEraserInteractor.handleGlobalMouseUp();
  handleMouseLeave();
}

/**
 * Finds the nearest measure boundary to a given click position
 * @param {number} clickX - Canvas x position of click
 * @returns {Object|null} Measure boundary info or null if none found
 */
interface MeasureBoundary { measureIndex: number; xPosition: number; macrobeatIndex: number }

function findNearestMeasureBoundary(clickX: number): MeasureBoundary | null {
  const { macrobeatBoundaryStyles } = store.state;
  const tolerance = 100; // pixels - increased for easier placement

  // Find all measure boundaries (solid boundaries)
  const boundaries: MeasureBoundary[] = [];
  const hasModulation = store.state.tempoModulationMarkers && store.state.tempoModulationMarkers.length > 0;

  logger.debug('PitchGridInteractor', 'Boundary calculation modulation state', { hasModulation }, 'grid');

  for (let i = 0; i < macrobeatBoundaryStyles.length; i++) {
    if (macrobeatBoundaryStyles[i] === 'solid') {
      const measureInfo = getMacrobeatInfo(store.state, i);
      if (measureInfo) {
        // CANVAS-SPACE FIX: Always use rendererUtils.getColumnX()
        // measureInfo.endColumn is already in canvas-space (0 = first musical beat)
        const canvasSpaceColumn = measureInfo.endColumn + 1;
        const boundaryX = getColumnX(canvasSpaceColumn, {
          ...store.state,
          tempoModulationMarkers: store.state.tempoModulationMarkers || [],
          cellWidth: store.state.cellWidth,
          columnWidths: store.state.columnWidths,
          musicalColumnWidths: store.state.columnWidths,
          baseMicrobeatPx: store.state.cellWidth
        });

        logger.debug('PitchGridInteractor', 'Computed measure boundary', {
          boundaryIndex: i,
          endColumn: measureInfo.endColumn,
          calculatedX: boundaryX,
          method: 'canvas-space'
        }, 'grid');

        boundaries.push({
          measureIndex: i + 1, // Modulation starts after this measure
          xPosition: boundaryX,
          macrobeatIndex: i
        });
      }
    }
  }

  // Also include the start boundary (measure 0)
  // CANVAS-SPACE FIX: Always use rendererUtils.getColumnX() with canvas-space column 0
  const startBoundaryX = getColumnX(0, {
    ...store.state,
    tempoModulationMarkers: store.state.tempoModulationMarkers || [],
    cellWidth: store.state.cellWidth,
    columnWidths: store.state.columnWidths,
    musicalColumnWidths: store.state.columnWidths,
    baseMicrobeatPx: store.state.cellWidth
  });

  logger.debug('PitchGridInteractor', 'Start boundary position', {
    startBoundaryX,
    method: 'canvas-space'
  }, 'grid');
  boundaries.unshift({
    measureIndex: 0,
    xPosition: startBoundaryX,
    macrobeatIndex: -1
  });

  logger.debug('PitchGridInteractor', 'Available measure boundaries', { boundaries }, 'grid');
  logger.debug('PitchGridInteractor', 'Modulation click context', { clickX, tolerance }, 'grid');

  // Find the closest boundary within tolerance
  let closestBoundary: MeasureBoundary | null = null;
  let closestDistance = Infinity;

  boundaries.forEach(boundary => {
    const distance = Math.abs(clickX - boundary.xPosition);
    logger.debug('PitchGridInteractor', 'Boundary distance check', {
      boundaryX: boundary.xPosition,
      distance
    }, 'grid');

    if (distance <= tolerance && distance < closestDistance) {
      closestDistance = distance;
      closestBoundary = boundary;
    }
  });

  if (closestBoundary) {
    logger.debug('PitchGridInteractor', 'Found closest boundary', {
      boundary: closestBoundary,
      distance: closestDistance
    }, 'grid');
  } else {
    logger.debug('PitchGridInteractor', 'No boundary found within tolerance', { tolerance }, 'grid');
  }

  return closestBoundary;
}

/**
 * Draws modulation placement preview (three solid lines)
 * @param {CanvasRenderingContext2D} ctx - Hover canvas context
 * @param {number} xPosition - X position of the measure boundary
 * @param {number} ratio - Modulation ratio
 */
function drawModulationPreview(ctx: CanvasRenderingContext2D, xPosition: number, ratio: number) {
  if (!ratio) {return;}

  const color = getModulationColor(ratio);
  const displayText = getModulationDisplayText(ratio);

  ctx.save();

  // Draw three solid preview lines
  const lineSpacing = 3; // pixels between lines
  const lineWidth = 2;
  const canvasHeight = getLogicalCanvasHeight(ctx.canvas);

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = 0.7; // Semi-transparent preview
  ctx.setLineDash([]); // Solid lines

  for (let i = -1; i <= 1; i++) {
    const x = xPosition + (i * lineSpacing);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }

  // Draw preview label
  ctx.globalAlpha = 0.8;
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(`Preview: ${displayText}`, xPosition, 10);

  ctx.restore();
}

export function initPitchGridInteraction() {
  const pitchCanvas = document.getElementById('notation-grid') as HTMLCanvasElement | null;
  const hoverCanvas = document.getElementById('hover-canvas') as HTMLCanvasElement | null;

  if (!pitchCanvas || !hoverCanvas) {
    logger.error('PitchGridInteractor', 'Could not find required canvas elements.', { hasPitchCanvas: Boolean(pitchCanvas), hasHoverCanvas: Boolean(hoverCanvas) }, 'grid');
    return;
  }
  pitchHoverCtx = hoverCanvas.getContext('2d');
  if (!pitchHoverCtx) {
    logger.error('PitchGridInteractor', 'Could not get hover canvas context.', null, 'grid');
    return;
  }
  mobileLongPressNotePlacementInteractor.setPitchCanvasElement(pitchCanvas);

  pitchCanvas.addEventListener('mousedown', handleMouseDown);
  pitchCanvas.addEventListener('mousemove', handleMouseMove);
  pitchCanvas.addEventListener('mouseleave', handleMouseLeave);
  pitchCanvas.addEventListener('contextmenu', e => e.preventDefault());

  pitchCanvas.addEventListener('touchstart', e => mobileLongPressNotePlacementInteractor.handleTouchStart(e), { passive: false });
  pitchCanvas.addEventListener('touchmove', e => mobileLongPressNotePlacementInteractor.handleTouchMove(e), { passive: false });
  pitchCanvas.addEventListener('touchend', e => mobileLongPressNotePlacementInteractor.handleTouchEnd(e), { passive: false });
  pitchCanvas.addEventListener('touchcancel', () => mobileLongPressNotePlacementInteractor.handleTouchCancel(), { passive: false });
  window.addEventListener('mouseup', handleGlobalMouseUp);

}


