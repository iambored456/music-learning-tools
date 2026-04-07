import type { AnnotationCanvasPoint as CanvasPoint, AnnotationGridPoint as GridPoint } from '@mlt/types';

export type { CanvasPoint, GridPoint };

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
 * Resize handle position identifiers.
 */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
