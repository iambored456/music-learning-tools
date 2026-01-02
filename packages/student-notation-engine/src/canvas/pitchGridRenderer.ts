/**
 * Pitch Grid Renderer
 *
 * Main orchestrator for pitch grid canvas rendering.
 * Uses modular sub-renderers with dependency injection.
 */

import type {
  PlacedNote,
  TonicSign,
  PitchRowData,
  MacrobeatGrouping,
  ModulationMarker,
  DegreeDisplayMode,
  LongNoteStyle,
  AccidentalMode,
} from '@mlt/types';

import { createCoordinateUtils, type ViewportInfo } from './coordinateUtils.js';
import { createNoteRenderer, type AnimationEffectsManager } from './notes.js';
import { createGridLineRenderer, type MacrobeatInfo } from './gridLines.js';

/**
 * Options for rendering the pitch grid
 */
export interface PitchGridRenderOptions {
  /** Placed notes to render */
  placedNotes: PlacedNote[];
  /** Placed tonic signs */
  placedTonicSigns: TonicSign[];
  /** Full row data for all pitches */
  fullRowData: PitchRowData[];
  /** Column widths (multipliers) */
  columnWidths: number[];
  /** Base cell width in pixels */
  cellWidth: number;
  /** Base cell height in pixels */
  cellHeight: number;
  /** Row height (usually same as cellHeight) */
  rowHeight: number;
  /** Macrobeat groupings (2 or 3) */
  macrobeatGroupings: MacrobeatGrouping[];
  /** Macrobeat boundary styles */
  macrobeatBoundaryStyles: string[];
  /** Accidental display mode */
  accidentalMode: AccidentalMode;
  /** Whether to show frequency labels */
  showFrequencyLabels: boolean;
  /** Whether to show octave labels */
  showOctaveLabels: boolean;
  /** Color mode (color or black/white) */
  colorMode: 'color' | 'bw';
  /** Degree display mode */
  degreeDisplayMode: DegreeDisplayMode;
  /** Long note rendering style */
  longNoteStyle: LongNoteStyle;
  /** Zoom level */
  zoomLevel: number;
  /** Viewport height */
  viewportHeight: number;
  /** Modulation markers */
  modulationMarkers: ModulationMarker[];
  /** Whether piece has anacrusis */
  hasAnacrusis: boolean;
}

/**
 * Callbacks for pitch grid rendering
 */
export interface PitchGridRenderCallbacks {
  /** Get viewport info (visible row range) */
  getViewportInfo: () => ViewportInfo;
  /** Convert column index to X pixel (handles modulation) */
  columnToPixelX?: (columnIndex: number, options: PitchGridRenderOptions) => number;
  /** Convert X pixel to column index (handles modulation) */
  pixelXToColumn?: (pixelX: number, options: PitchGridRenderOptions) => number;
  /** Get macrobeat info by index */
  getMacrobeatInfo?: (index: number) => MacrobeatInfo | null;
  /** Get tonic span column indices */
  getTonicSpanColumnIndices?: (tonicSigns: TonicSign[]) => Set<number>;
  /** Get anacrusis background colors from CSS */
  getAnacrusisColors?: () => { background: string; border: string };
  /** Get scale degree for a note */
  getDegreeForNote?: (note: PlacedNote) => string | null;
  /** Check if degree has accidental */
  hasAccidental?: (degree: string) => boolean;
  /** Get enharmonic degree */
  getEnharmonicDegree?: (degree: string) => string | null;
  /** Get animation effects manager */
  getAnimationEffectsManager?: () => AnimationEffectsManager | undefined;
}

/**
 * Render the pitch grid to a canvas context
 *
 * This is the main entry point for pitch grid rendering.
 * It orchestrates the sub-renderers (grid lines, notes) with proper layering.
 */
export function renderPitchGrid(
  ctx: CanvasRenderingContext2D,
  options: PitchGridRenderOptions,
  callbacks: PitchGridRenderCallbacks
): void {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Create coordinate utilities
  const coords = createCoordinateUtils({
    getViewportInfo: callbacks.getViewportInfo,
    columnToPixelX: callbacks.columnToPixelX
      ? (index, opts) => callbacks.columnToPixelX!(index, options)
      : undefined,
    pixelXToColumn: callbacks.pixelXToColumn
      ? (x, opts) => callbacks.pixelXToColumn!(x, options)
      : undefined
  });

  // Create grid line renderer
  const gridLines = createGridLineRenderer({
    coords,
    getMacrobeatInfo: callbacks.getMacrobeatInfo,
    getPlacedTonicSigns: () => options.placedTonicSigns,
    getTonicSpanColumnIndices: callbacks.getTonicSpanColumnIndices,
    getAnacrusisColors: callbacks.getAnacrusisColors
  });

  // Create note renderer
  const noteRenderer = createNoteRenderer({
    coords,
    getDegreeForNote: callbacks.getDegreeForNote,
    hasAccidental: callbacks.hasAccidental,
    getEnharmonicDegree: callbacks.getEnharmonicDegree,
    getAnimationEffectsManager: callbacks.getAnimationEffectsManager
  });

  // Build render options for sub-renderers
  const gridLineOptions = {
    ...options,
    canvasWidth,
    canvasHeight
  };

  const noteOptions = {
    ...options,
    placedNotes: options.placedNotes
  };

  // === RENDER LAYERS ===

  // Layer 1: Horizontal grid lines (pitch lines)
  gridLines.drawHorizontalLines(ctx, gridLineOptions);

  // Layer 2: Vertical grid lines (beat lines)
  gridLines.drawVerticalLines(ctx, gridLineOptions);

  // Layer 3: Notes
  const { startRow, endRow } = coords.getVisibleRowRange();

  // Filter notes to only visible rows for performance
  const visibleNotes = options.placedNotes.filter(note => {
    if (note.isDrum) return false;
    const rowIndex = note.globalRow ?? note.row;
    return rowIndex >= startRow && rowIndex <= endRow;
  });

  // Render notes
  for (const note of visibleNotes) {
    const rowIndex = note.globalRow ?? note.row;

    if (note.shape === 'circle') {
      noteRenderer.drawTwoColumnOvalNote(ctx, noteOptions, note, rowIndex);
    } else {
      noteRenderer.drawSingleColumnOvalNote(ctx, noteOptions, note, rowIndex);
    }
  }

  // Layer 4: Tonic signs
  for (const tonicSign of options.placedTonicSigns) {
    const rowIndex = tonicSign.globalRow ?? tonicSign.row;
    if (rowIndex >= startRow && rowIndex <= endRow) {
      drawTonicSign(ctx, options, tonicSign, coords);
    }
  }
}

/**
 * Draw a tonic sign
 */
function drawTonicSign(
  ctx: CanvasRenderingContext2D,
  options: PitchGridRenderOptions,
  tonicSign: TonicSign,
  coords: ReturnType<typeof createCoordinateUtils>
): void {
  const { cellWidth, cellHeight } = options;
  const y = coords.getRowY(tonicSign.globalRow ?? tonicSign.row, options);
  const x = coords.getColumnX(tonicSign.columnIndex, options);

  const width = cellWidth * 2;
  const centerX = x + width / 2;
  const radius = (Math.min(width, cellHeight) / 2) * 0.9;

  if (radius < 2) return;

  ctx.beginPath();
  ctx.arc(centerX, y, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#212529';
  ctx.lineWidth = Math.max(0.5, cellWidth * 0.05);
  ctx.stroke();

  if (tonicSign.tonicNumber == null) return;

  const numberText = tonicSign.tonicNumber.toString();
  const fontSize = radius * 1.5;
  if (fontSize < 6) return;

  ctx.fillStyle = '#212529';
  ctx.font = `bold ${fontSize}px 'Atkinson Hyperlegible', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberText, centerX, y);
}
