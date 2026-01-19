/**
 * Legend Renderer
 *
 * Pure rendering functions for pitch grid legends (Y-axis labels).
 * All dependencies are passed explicitly as parameters - no store access.
 */

import type { PitchRowData, AccidentalMode } from '@mlt/types';
import type { CoordinateUtils, LegendHighlightConfig, LegendHighlightEntry } from '../types.js';

// ============================================================================
// Types
// ============================================================================

export interface LegendRenderConfig {
  /** Full pitch data array */
  fullRowData: PitchRowData[];
  /** Cell width in pixels */
  cellWidth: number;
  /** Cell height in pixels */
  cellHeight: number;
  /** Width of each legend column (A and B) in pixels */
  legendColumnWidth: number;
  /** Color mode for rendering */
  colorMode: 'color' | 'bw';
  /** Whether to show frequency labels instead of pitch names */
  showFrequencyLabels: boolean;
  /** Whether to show octave numbers in labels */
  showOctaveLabels: boolean;
  /** Accidental display mode */
  accidentalMode: AccidentalMode;
  /** Set of pitch classes that should be focused (0-11), null = show all */
  focusedPitchClasses: Set<number> | null;
  /** Whether focus coloring is enabled */
  focusColorsEnabled: boolean;
  /** Optional highlight overlay for a specific pitch */
  highlight?: LegendHighlightConfig;
}

export interface LegendRenderOptions {
  /** Starting row index to render */
  startRow: number;
  /** Ending row index to render */
  endRow: number;
  /** Coordinate utilities */
  coords: CoordinateUtils;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Strip octave suffix from a label.
 */
function stripOctaveSuffix(label: string): string {
  const withoutOctave = label.replace(/\d+$/, '');
  return withoutOctave.length > 0 ? withoutOctave : label;
}

/**
 * Snap a value to the nearest device pixel for crisp rendering.
 */
function snapToDevicePixel(value: number, pixelRatio: number): number {
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return value;
  }
  return Math.round(value * pixelRatio) / pixelRatio;
}

/**
 * Calculate font size based on cell dimensions and label length.
 */
function getLegendFontSize(
  cellWidth: number,
  cellHeight: number,
  labelLength: number,
  pixelRatio: number
): number {
  const baseFontSize = Math.max(10, Math.min(cellWidth * 1.2, cellHeight * 1.2));
  const sizeMultiplier = labelLength <= 3 ? 1 : 0.7;
  const resolutionBoost = pixelRatio <= 1 ? 1.08 : 1;
  return snapToDevicePixel(baseFontSize * sizeMultiplier * resolutionBoost, pixelRatio);
}

/**
 * Get the canvas pixel ratio for HiDPI displays.
 */
function getCanvasPixelRatio(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 1;

  // Check if canvas has been scaled for HiDPI
  const transform = ctx.getTransform();
  return transform.a || window.devicePixelRatio || 1;
}

/**
 * Get pitch class (0-11) from a pitch row.
 */
function getPitchClassFromRow(row: PitchRowData): number {
  // If midi is available, use it
  if (typeof row.midi === 'number') {
    return row.midi % 12;
  }
  // If pitchClass is available, use it
  if (typeof row.pitchClass === 'number') {
    return row.pitchClass;
  }
  // Fall back to parsing the pitch name
  const noteMap: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };
  const baseNote = row.pitch.charAt(0).toUpperCase();
  let pc = noteMap[baseNote] ?? 0;
  if (row.pitch.includes('#') || row.pitch.includes('♯')) pc++;
  if (row.pitch.includes('b') || row.pitch.includes('♭')) pc--;
  return ((pc % 12) + 12) % 12;
}

/**
 * Normalize highlight input into a flat list.
 */
function normalizeHighlights(highlight?: LegendHighlightConfig): LegendHighlightEntry[] {
  if (!highlight) return [];
  return Array.isArray(highlight) ? highlight : [highlight];
}

/**
 * Determine if a row should be focused based on pitch class.
 */
function isRowFocused(
  row: PitchRowData,
  focusedPitchClasses: Set<number> | null
): boolean {
  if (!focusedPitchClasses || focusedPitchClasses.size === 0) {
    return true; // No focus filter = all rows focused
  }
  const pc = getPitchClassFromRow(row);
  return focusedPitchClasses.has(pc);
}

/**
 * Process a label based on accidental mode and display settings.
 */
function processLabel(
  row: PitchRowData,
  config: LegendRenderConfig
): string | null {
  const { showFrequencyLabels, showOctaveLabels, accidentalMode, focusColorsEnabled, focusedPitchClasses } = config;

  const finalizeLabel = (value: string): string =>
    showOctaveLabels ? value : stripOctaveSuffix(value);

  // Hz mode
  if (showFrequencyLabels) {
    // When focus is active, hide non-focused rows
    if (focusColorsEnabled && focusedPitchClasses && focusedPitchClasses.size > 0) {
      if (!isRowFocused(row, focusedPitchClasses)) {
        return null;
      }
    }
    return String(Math.round(row.frequency));
  }

  // Use direct field access for pitch names
  const { flatName, sharpName, isAccidental } = row;
  const { sharp, flat } = accidentalMode;

  // For natural notes, flatName === sharpName
  if (!isAccidental) {
    return finalizeLabel(flatName);
  }

  // Accidental handling
  if (sharp && flat) {
    return finalizeLabel(row.pitch); // Combined notation like 'Bb/A#7'
  } else if (sharp && !flat) {
    return finalizeLabel(sharpName);
  } else if (flat && !sharp) {
    return finalizeLabel(flatName);
  } else {
    // Both off - hide accidentals
    return null;
  }
}

// ============================================================================
// Main Rendering Functions
// ============================================================================

/**
 * Draw a single legend (left or right) to its own canvas.
 */
export function drawLegend(
  ctx: CanvasRenderingContext2D,
  config: LegendRenderConfig,
  options: LegendRenderOptions,
  columnsOrder: readonly ('A' | 'B')[]
): void {
  const { fullRowData, cellWidth, cellHeight, legendColumnWidth, colorMode, focusColorsEnabled, focusedPitchClasses, accidentalMode } = config;
  const { startRow, endRow, coords } = options;

  const pixelRatio = getCanvasPixelRatio(ctx.canvas);
  const snap = (value: number): number => snapToDevicePixel(value, pixelRatio);
  const highlightEntries = normalizeHighlights(config.highlight);

  // Each legend has two columns (A and B), split evenly
  const colWidth = legendColumnWidth;

  let cumulativeX = 0;

  for (const colLabel of columnsOrder) {
    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
      const row = fullRowData[rowIndex];
      if (!row || row.isBoundary) continue;

      // Only render rows that match this column
      if (row.column !== colLabel) continue;

      const y = coords.getRowY(rowIndex);
      const isFocused = isRowFocused(row, focusedPitchClasses);

      // Check if accidentals are hidden
      const isAccidentalHidden = !accidentalMode.sharp && !accidentalMode.flat;
      const shouldHideAccidental = row.isAccidental && isAccidentalHidden;

      // Get the label to draw
      const label = processLabel(row, config);
      if (label === null) continue;

      // Determine background color
      let bgColor = colorMode === 'bw' ? '#ffffff' : (row.hex || '#ffffff');
      if (focusColorsEnabled && !isFocused) {
        bgColor = '#ffffff';
      }

      // Determine text alpha
      let textAlpha = 'FF';
      if (shouldHideAccidental) {
        textAlpha = '00';
      } else if (focusColorsEnabled && !isFocused) {
        textAlpha = '55';
      }

      // Draw background
      ctx.fillStyle = shouldHideAccidental ? 'rgba(255,255,255,0)' : bgColor;
      ctx.fillRect(cumulativeX, y - cellHeight / 2, colWidth, cellHeight);

      // Optional highlight overlay
      if (highlightEntries.length > 0) {
        for (const highlight of highlightEntries) {
          if (highlight.opacity <= 0) continue;

          let shouldHighlight = false;
          if (typeof highlight.midi === 'number') {
            shouldHighlight = typeof row.midi === 'number' && row.midi === Math.round(highlight.midi);
          } else if (typeof highlight.pitchClass === 'number') {
            const rowPitchClass = getPitchClassFromRow(row);
            shouldHighlight = rowPitchClass === highlight.pitchClass;
          }

          if (shouldHighlight) {
            ctx.save();
            ctx.globalAlpha = Math.min(Math.max(highlight.opacity, 0), 1);
            ctx.fillStyle = highlight.color ?? '#ffff00';
            ctx.fillRect(cumulativeX, y - cellHeight / 2, colWidth, cellHeight);
            ctx.restore();
          }
        }
      }

      // Draw text
      const fontSize = getLegendFontSize(cellWidth, cellHeight, label.length, pixelRatio);

      ctx.font = `bold ${fontSize}px 'Atkinson Hyperlegible', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textX = snap(cumulativeX + colWidth / 2);
      const textY = snap(y);

      // Text stroke (outline)
      ctx.strokeStyle = `#212529${textAlpha}`;
      ctx.lineWidth = Math.max(1.2, 2.5 / pixelRatio);
      ctx.lineJoin = 'round';
      ctx.strokeText(label, textX, textY);

      // Text fill
      ctx.fillStyle = `#ffffff${textAlpha}`;
      ctx.fillText(label, textX, textY);
    }

    cumulativeX += colWidth;
  }
}

/**
 * Draw both left and right legends to separate canvases.
 */
export function drawLegendsToSeparateCanvases(
  leftCtx: CanvasRenderingContext2D | null,
  rightCtx: CanvasRenderingContext2D | null,
  config: LegendRenderConfig,
  options: LegendRenderOptions
): void {
  // Left legend: B column first, then A (reading from right to left towards grid)
  if (leftCtx) {
    // Clear the canvas
    leftCtx.clearRect(0, 0, leftCtx.canvas.width, leftCtx.canvas.height);
    drawLegend(leftCtx, config, options, ['B', 'A'] as const);
  }

  // Right legend: A column first, then B (reading from left to right away from grid)
  if (rightCtx) {
    rightCtx.clearRect(0, 0, rightCtx.canvas.width, rightCtx.canvas.height);
    drawLegend(rightCtx, config, options, ['A', 'B'] as const);
  }
}

/**
 * Calculate which pitch classes should be focused based on placed tonic signs.
 * This is a helper that can be used by the app to build the focusedPitchClasses set.
 */
export function calculateFocusedPitchClasses(
  tonicPitchClasses: number[],
  scaleIntervals: number[] = [0, 2, 4, 5, 7, 9, 11] // Major scale by default
): Set<number> {
  const focused = new Set<number>();

  for (const tonicPc of tonicPitchClasses) {
    for (const interval of scaleIntervals) {
      focused.add((tonicPc + interval) % 12);
    }
  }

  return focused;
}
