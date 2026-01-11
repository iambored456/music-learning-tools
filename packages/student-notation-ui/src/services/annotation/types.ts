/**
 * Annotation Types
 *
 * Shared type definitions for annotation services.
 */

/**
 * Point in canvas pixel coordinates.
 */
export interface CanvasPoint {
  x: number;
  y: number;
}

/**
 * Point in grid coordinates (column/row).
 */
export interface GridPoint {
  col: number;
  row: number;
}

/**
 * Point that can be in either coordinate system.
 */
export interface FlexiblePoint {
  x?: number;
  y?: number;
  col?: number;
  row?: number;
}

/**
 * Base annotation properties shared by all annotation types.
 */
export interface BaseAnnotation {
  id?: string;
  type: 'arrow' | 'text' | 'marker' | 'highlighter' | 'lasso';
  settings?: Record<string, unknown>;
}

/**
 * Arrow annotation spanning from start to end point.
 */
export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
  settings: {
    color?: string;
    weight?: string;
    style?: string;
    lineStyle?: string;
    headStyle?: string;
  };
}

/**
 * Text box annotation with position and dimensions.
 */
export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  col: number;
  row: number;
  widthCols: number;
  heightRows: number;
  content: string;
  settings: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    fontSize?: string;
    fontFamily?: string;
    textAlign?: string;
    verticalAlign?: string;
    borderStyle?: string;
    borderWidth?: string;
  };
}

/**
 * Path-based annotation (marker or highlighter).
 */
export interface PathAnnotation extends BaseAnnotation {
  type: 'marker' | 'highlighter';
  path: GridPoint[];
  settings: {
    color?: string;
    size?: string;
    style?: string;
  };
}

/**
 * Lasso selection annotation.
 */
export interface LassoAnnotation extends BaseAnnotation {
  type: 'lasso';
  path: CanvasPoint[];
}

/**
 * Union of all annotation types.
 */
export type Annotation = ArrowAnnotation | TextAnnotation | PathAnnotation | LassoAnnotation;

/**
 * Resize handle position identifiers.
 */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * Lasso selection state stored in the application state.
 */
export interface LassoSelectionState {
  isActive: boolean;
  selectedNoteIds?: string[];
  selectedAnnotationIds?: string[];
  convexHull?: CanvasPoint[];
  boundingBox?: {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
  };
}

/**
 * Options for rendering annotations.
 */
export interface AnnotationRenderOptions {
  cellWidth: number;
  cellHeight: number;
  startRank: number;
  endRank: number;
  scrollOffset: number;
}

/**
 * Drag offset for moving annotations.
 */
export interface DragOffset {
  col?: number;
  row?: number;
  startCol?: number;
  startRow?: number;
  endCol?: number;
  endRow?: number;
}

/**
 * Resize start bounds for text annotation resizing.
 */
export interface ResizeStartBounds {
  col: number;
  row: number;
  widthCols: number;
  heightRows: number;
  mouseCol: number;
  mouseRow: number;
}
