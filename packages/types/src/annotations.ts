/**
 * Annotation types for Music Learning Tools
 *
 * Annotations are user-drawn markings on the canvas
 * (e.g., freehand lines, highlights, text).
 */

// Currently using a flexible type until the annotation system is fully defined
export type Annotation = any;

/**
 * Base annotation interface (for future expansion)
 */
export interface BaseAnnotation {
  id: string;
  type: string;
  createdAt: number;
  color?: string;
}

/**
 * Freehand drawing annotation
 */
export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  points: Array<{ x: number; y: number }>;
  strokeWidth: number;
}

/**
 * Text annotation
 */
export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}
