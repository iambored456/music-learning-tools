/**
 * Pitch Grid Renderer
 *
 * Pure rendering functions for the pitch grid canvas.
 * These are framework-agnostic and only take a canvas context and render options.
 *
 * TODO: Extract implementation from:
 * - apps/student-notation/src/components/canvas/PitchGrid/renderers/pitchGridRenderer.ts
 */

import type {
  PlacedNote,
  TonicSign,
  PitchRowData,
  MacrobeatGrouping,
  MacrobeatBoundaryStyle,
  ModulationMarker,
  DegreeDisplayMode,
  AccidentalMode,
} from '@mlt/types';

/**
 * Options for rendering the pitch grid
 */
export interface PitchGridRenderOptions {
  placedNotes: PlacedNote[];
  placedTonicSigns: TonicSign[];
  fullRowData: PitchRowData[];
  columnWidths: number[];
  cellWidth: number;
  cellHeight: number;
  rowHeight: number;
  macrobeatGroupings: MacrobeatGrouping[];
  macrobeatBoundaryStyles: MacrobeatBoundaryStyle[];
  accidentalMode: AccidentalMode;
  showFrequencyLabels: boolean;
  showOctaveLabels: boolean;
  colorMode: 'color' | 'bw';
  degreeDisplayMode: DegreeDisplayMode;
  zoomLevel: number;
  viewportHeight: number;
  modulationMarkers: ModulationMarker[];
}

/**
 * Render the pitch grid to a canvas context
 */
export function renderPitchGrid(
  _ctx: CanvasRenderingContext2D,
  _options: PitchGridRenderOptions
): void {
  throw new Error(
    'renderPitchGrid not yet implemented. Needs to be extracted from ' +
    'apps/student-notation/src/components/canvas/PitchGrid/renderers/pitchGridRenderer.ts'
  );
}
