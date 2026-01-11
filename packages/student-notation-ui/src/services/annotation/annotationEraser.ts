import { getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { distanceToLineSegment } from './annotationGeometry.ts';

export function eraseAnnotationsAtPoint(params: {
  x: number;
  y: number;
  annotations: any[];
  getRenderOptions: () => any;
}): { nextAnnotations: any[]; changed: boolean } {
  const { x, y, annotations, getRenderOptions } = params;
  const eraseRadius = 10;
  let changed = false;

  const options = getRenderOptions();

  const nextAnnotations = annotations.filter(annotation => {
    let shouldKeep = true;

    if (annotation.type === 'arrow') {
      const startX = getColumnX(annotation.startCol, options);
      const startY = getRowY(annotation.startRow, options);
      const endX = getColumnX(annotation.endCol, options);
      const endY = getRowY(annotation.endRow, options);

      const dist = distanceToLineSegment(x, y, startX, startY, endX, endY);
      if (dist < eraseRadius) {
        shouldKeep = false;
        changed = true;
      }
    } else if (annotation.type === 'text') {
      const textX = getColumnX(annotation.col, options);
      const textY = getRowY(annotation.row, options);
      const textEndX = getColumnX(annotation.col + annotation.widthCols, options);
      const textEndY = getRowY(annotation.row + annotation.heightRows, options);

      if (x >= textX && x <= textEndX && y >= textY && y <= textEndY) {
        shouldKeep = false;
        changed = true;
      }
    } else if (annotation.type === 'marker' || annotation.type === 'highlighter') {
      for (let i = 0; i < annotation.path.length; i++) {
        const pathX = getColumnX(annotation.path[i].col, options);
        const pathY = getRowY(annotation.path[i].row, options);
        const dx = x - pathX;
        const dy = y - pathY;
        if (Math.sqrt(dx * dx + dy * dy) < eraseRadius) {
          shouldKeep = false;
          changed = true;
          break;
        }
      }
    }

    return shouldKeep;
  });

  return { nextAnnotations, changed };
}

