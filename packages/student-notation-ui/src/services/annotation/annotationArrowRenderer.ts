import type { AnnotationArrowheadStyle, ArrowAnnotation } from '@mlt/types';

type RenderedArrowAnnotation = ArrowAnnotation & {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export function renderArrowAnnotation(params: {
  ctx: CanvasRenderingContext2D;
  annotation: RenderedArrowAnnotation;
  isTemp?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  getStrokeWidth: (strokeWeight: number) => number;
  getLineDash: (lineStyle: ArrowAnnotation['settings']['lineStyle']) => number[];
}): void {
  const { ctx, annotation, isTemp = false, isSelected = false, isHovered = false, getStrokeWidth, getLineDash } = params;
  const { startX, startY, endX, endY, settings } = annotation;

  ctx.save();

  if (isSelected) {
    ctx.strokeStyle = '#44bcef';
    ctx.lineWidth = getStrokeWidth(settings.strokeWeight) + 4;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (isHovered && !isSelected) {
    ctx.strokeStyle = '#44bcef';
    ctx.lineWidth = getStrokeWidth(settings.strokeWeight) + 4;
    ctx.globalAlpha = 0.15;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = settings.color ?? '#000000';
  ctx.globalAlpha = isTemp ? 0.5 : 1;
  ctx.lineCap = settings.roundedEnds ? 'round' : 'butt';
  ctx.lineJoin = settings.roundedEnds ? 'round' : 'miter';
  ctx.lineWidth = getStrokeWidth(settings.strokeWeight);
  ctx.setLineDash(getLineDash(settings.lineStyle));

  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowheadSize = settings.arrowheadSize || 12;

  let adjustedStartX = startX;
  let adjustedStartY = startY;
  let adjustedEndX = endX;
  let adjustedEndY = endY;

  if (settings.startArrowhead !== 'none') {
    adjustedStartX = startX + Math.cos(angle) * arrowheadInset(settings.startArrowhead, arrowheadSize);
    adjustedStartY = startY + Math.sin(angle) * arrowheadInset(settings.startArrowhead, arrowheadSize);
  }

  if (settings.endArrowhead !== 'none') {
    adjustedEndX = endX - Math.cos(angle) * arrowheadInset(settings.endArrowhead, arrowheadSize);
    adjustedEndY = endY - Math.sin(angle) * arrowheadInset(settings.endArrowhead, arrowheadSize);
  }

  ctx.beginPath();
  ctx.moveTo(adjustedStartX, adjustedStartY);
  ctx.lineTo(adjustedEndX, adjustedEndY);
  ctx.stroke();

  if (settings.startArrowhead !== 'none') {
    renderArrowhead({ ctx, x: startX, y: startY, angle: angle + Math.PI, type: settings.startArrowhead, size: arrowheadSize });
  }

  if (settings.endArrowhead !== 'none') {
    renderArrowhead({ ctx, x: endX, y: endY, angle, type: settings.endArrowhead, size: arrowheadSize });
  }

  ctx.restore();
}

function arrowheadInset(type: AnnotationArrowheadStyle, size: number): number {
  if (type === 'none' || type === 'bar' || type === 'open-arrow') {return 0;}
  if (type === 'circle' || type === 'open-circle' || type === 'square' || type === 'open-square') {return size / 3;}
  if (type === 'diamond' || type === 'open-diamond') {return size / 2;}
  return size;
}

function renderArrowhead(params: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  angle: number;
  type: AnnotationArrowheadStyle;
  size: number;
}): void {
  const { ctx, x, y, angle, type, size } = params;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.setLineDash([]);

  switch (type) {
    case 'filled':
    case 'filled-arrow':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size / 2);
      ctx.lineTo(-size, size / 2);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle as string;
      ctx.fill();
      break;
    case 'unfilled':
    case 'unfilled-arrow':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size / 2);
      ctx.lineTo(-size, size / 2);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'open-arrow':
      ctx.beginPath();
      ctx.moveTo(-size, -size / 2);
      ctx.lineTo(0, 0);
      ctx.lineTo(-size, size / 2);
      ctx.stroke();
      break;
    case 'bar':
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(0, size / 2);
      ctx.stroke();
      break;
    case 'square':
    case 'open-square':
    case 'diamond':
    case 'open-diamond':
      ctx.beginPath();
      if (type === 'square' || type === 'open-square') {
        ctx.rect(-size / 3, -size / 3, size * 2 / 3, size * 2 / 3);
      } else {
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(0, size / 2);
        ctx.lineTo(-size / 2, 0);
        ctx.lineTo(0, -size / 2);
        ctx.closePath();
      }
      if (type.startsWith('open-')) {ctx.stroke();} else {
        ctx.fillStyle = ctx.strokeStyle as string;
        ctx.fill();
      }
      break;
    case 'open-circle':
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
      if (type === 'open-circle') {ctx.stroke();} else {
        ctx.fillStyle = ctx.strokeStyle as string;
        ctx.fill();
      }
      break;
  }

  ctx.restore();
}
