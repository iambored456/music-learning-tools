/**
 * Canvas Module
 *
 * Framework-agnostic canvas rendering functions for:
 * - Pitch grid (notes, grid lines, legends)
 * - Drum grid
 * - Playhead visualization
 *
 * All renderers use dependency injection for state access and services.
 */

// Coordinate utilities
export {
  createCoordinateUtils,
  type CoordinateUtils,
  type CoordinateOptions,
  type CoordinateCallbacks,
  type ViewportInfo
} from './coordinateUtils.js';

// Note rendering
export {
  createNoteRenderer,
  type NoteRenderer,
  type NoteRenderOptions,
  type NoteRenderCallbacks,
  type AnimationEffectsManager
} from './notes.js';

// Grid line rendering
export {
  createGridLineRenderer,
  type GridLineRenderer,
  type GridLineRenderOptions,
  type GridLineRenderCallbacks,
  type MacrobeatInfo
} from './gridLines.js';

// Main renderers (orchestrators)
export { renderPitchGrid, type PitchGridRenderOptions } from './pitchGridRenderer.js';
export { renderDrumGrid, type DrumGridRenderOptions } from './drumGridRenderer.js';
