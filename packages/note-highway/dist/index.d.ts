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
export { createHighwayRenderer, type IHighwayRenderer } from './render/HighwayRenderer.js';
export { createViewportModel, type IViewportModel } from './viewport/ViewportModel.js';
export { createScrollModel, type IScrollModel } from './viewport/ScrollModel.js';
export { createCoordinateMapper, type ICoordinateMapper, type CoordinateMapperConfig, } from './coordinate/CoordinateMapper.js';
export { createGridRenderer, type IGridRenderer } from './render/GridRenderer.js';
export { createNoteRenderer, type INoteRenderer } from './render/NoteRenderer.js';
export { createJudgmentLineRenderer, type IJudgmentLineRenderer } from './render/JudgmentLineRenderer.js';
export { createInputCursorRenderer, type IInputCursorRenderer } from './render/InputCursorRenderer.js';
export { createInputTrailRenderer, type IInputTrailRenderer } from './render/InputTrailRenderer.js';
export type { HighwayViewport, ScrollConfig, JudgmentLineConfig, InputCursorConfig, InputCursorState, InputTrailConfig, InputTrailPoint, NoteGlyphStyle, NoteRenderConfig, RenderableNote, GridRenderConfig, TonicIndicatorConfig, HighwayConfig, HighwayRenderState, CanvasRect, CanvasPoint, } from './types.js';
export { DEFAULT_VIEWPORT, DEFAULT_SCROLL_CONFIG, DEFAULT_JUDGMENT_LINE_CONFIG, DEFAULT_INPUT_CURSOR_CONFIG, DEFAULT_INPUT_TRAIL_CONFIG, DEFAULT_NOTE_RENDER_CONFIG, DEFAULT_GRID_RENDER_CONFIG, DEFAULT_TONIC_INDICATOR_CONFIG, DEFAULT_HIGHWAY_CONFIG, calculateScrollConfig, calculateMidiRange, } from './constants.js';
//# sourceMappingURL=index.d.ts.map