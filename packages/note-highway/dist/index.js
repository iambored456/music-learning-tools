/**
 * @mlt/note-highway
 *
 * Note highway renderer for rhythm-game-style visualization.
 *
 * Core components:
 * - HighwayRenderer: Main orchestrator
 * - ViewportModel: MIDI ↔ Y coordinate mapping
 * - ScrollModel: Time ↔ X coordinate mapping
 * - CoordinateMapper: Combined coordinate utility
 * - Individual renderers: Grid, Notes, JudgmentLine, InputCursor, InputTrail
 */
// ============================================================================
// Main Renderer (Primary API)
// ============================================================================
export { createHighwayRenderer } from './render/HighwayRenderer.js';
// ============================================================================
// Viewport / Scroll Models
// ============================================================================
export { createViewportModel } from './viewport/ViewportModel.js';
export { createScrollModel } from './viewport/ScrollModel.js';
// ============================================================================
// Coordinate Mapping
// ============================================================================
export { createCoordinateMapper, } from './coordinate/CoordinateMapper.js';
// ============================================================================
// Individual Renderers (Advanced Use)
// ============================================================================
export { createGridRenderer } from './render/GridRenderer.js';
export { createNoteRenderer } from './render/NoteRenderer.js';
export { createJudgmentLineRenderer } from './render/JudgmentLineRenderer.js';
export { createInputCursorRenderer } from './render/InputCursorRenderer.js';
export { createInputTrailRenderer } from './render/InputTrailRenderer.js';
// ============================================================================
// Constants
// ============================================================================
export { DEFAULT_VIEWPORT, DEFAULT_SCROLL_CONFIG, DEFAULT_JUDGMENT_LINE_CONFIG, DEFAULT_INPUT_CURSOR_CONFIG, DEFAULT_INPUT_TRAIL_CONFIG, DEFAULT_NOTE_RENDER_CONFIG, DEFAULT_GRID_RENDER_CONFIG, DEFAULT_TONIC_INDICATOR_CONFIG, DEFAULT_HIGHWAY_CONFIG, calculateScrollConfig, calculateMidiRange, } from './constants.js';
