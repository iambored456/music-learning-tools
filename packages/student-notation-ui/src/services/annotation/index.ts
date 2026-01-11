/**
 * Annotation Services
 *
 * Barrel export for all annotation-related functionality.
 */

// Types
export * from './types.ts';

// Geometry utilities
export { distanceToLineSegment } from './annotationGeometry.ts';

// Eraser functionality
export { eraseAnnotationsAtPoint } from './annotationEraser.ts';

// Lasso selection
export {
  computeConvexHullForSelectedItems,
  computeLassoSelection,
  removeFromLassoSelectionAtPoint
} from './annotationLassoSelection.ts';

// Selection dragging
export { applyLassoSelectionDrag } from './annotationSelectionDrag.ts';

// Arrow rendering
export { renderArrowAnnotation } from './annotationArrowRenderer.ts';

// Main service (default export)
import annotationService from '../annotationService.ts';
export default annotationService;
