/**
 * Services Module
 *
 * Framework-agnostic services for the notation engine.
 */

export {
  createColumnMapService,
  type ColumnMapService,
  type ColumnMapCallbacks,
  type ColumnMapState,
  type ColumnMap,
  type ColumnEntry,
  type MacrobeatBoundary,
  // Conversion helpers
  visualToCanvas,
  visualToTime,
  canvasToVisual,
  canvasToTime,
  timeToCanvas,
  timeToVisual,
  getTimeBoundaryAfterMacrobeat,
  // Metadata queries
  getColumnEntry,
  getColumnEntryByCanvas,
  isPlayableColumn,
  getColumnType,
  getMacrobeatBoundary,
  // Width helpers
  getCanvasColumnWidths,
  getTotalCanvasWidth
} from './columnMapService.js';
