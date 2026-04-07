/**
 * Annotation types for Music Learning Tools.
 *
 * These model the persisted and transient annotation shapes used by Student Notation.
 */

export interface AnnotationGridPoint {
  col: number;
  row: number;
}

export interface AnnotationCanvasPoint {
  x: number;
  y: number;
}

export type AnnotationLineStyle = 'solid' | 'dashed-big' | 'dashed-small' | 'dotted';
export type AnnotationArrowheadStyle = 'filled' | 'filled-arrow' | 'unfilled' | 'unfilled-arrow' | 'circle' | 'none';
export type AnnotationPathTool = 'marker' | 'highlighter';
export type AnnotationType = 'arrow' | 'text' | AnnotationPathTool;

export interface ArrowAnnotationSettings {
  lineStyle: AnnotationLineStyle;
  strokeWeight: number;
  startArrowhead: AnnotationArrowheadStyle;
  endArrowhead: AnnotationArrowheadStyle;
  arrowheadSize: number;
}

export interface TextAnnotationSettings {
  color: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  background: boolean;
  superscript: boolean;
  subscript: boolean;
}

export interface PathAnnotationSettings {
  color: string;
  size: number;
}

export interface BaseAnnotation {
  type: AnnotationType;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
  settings: ArrowAnnotationSettings;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  col: number;
  row: number;
  widthCols: number;
  heightRows: number;
  text: string;
  settings: TextAnnotationSettings;
}

export interface PathAnnotation extends BaseAnnotation {
  type: AnnotationPathTool;
  path: AnnotationGridPoint[];
  settings: PathAnnotationSettings;
}

/**
 * Persisted annotations stored in application state.
 */
export type Annotation = ArrowAnnotation | TextAnnotation | PathAnnotation;

/**
 * Transient annotation preview used during in-progress drawing operations.
 */
export interface TextPreviewAnnotation {
  type: 'text';
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

/**
 * Transient lasso path used during in-progress selection.
 * This is not persisted in AppState.annotations.
 */
export interface LassoAnnotation {
  type: 'lasso';
  path: AnnotationCanvasPoint[];
}

export type TempAnnotation = Annotation | TextPreviewAnnotation | LassoAnnotation;
export type SelectableAnnotation = ArrowAnnotation | TextAnnotation;
