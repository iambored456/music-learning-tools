export function renderArrowAnnotation(params: {
  ctx: CanvasRenderingContext2D;
  annotation: any;
  isTemp?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  getStrokeWidth: (strokeWeight: any) => number;
  getLineDash: (lineStyle: any) => number[];
}): void {
  const { ctx, annotation, isTemp = false, isSelected = false, isHovered = false, getStrokeWidth, getLineDash } = params;
  const { startX, startY, endX, endY, settings } = annotation;

  ctx.save();

  if (isSelected) {
    ctx.strokeStyle = '#4a90e2';
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
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = getStrokeWidth(settings.strokeWeight) + 4;
    ctx.globalAlpha = 0.15;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = isTemp ? 'rgba(0, 0, 0, 0.5)' : '#000000';
  ctx.lineWidth = getStrokeWidth(settings.strokeWeight);
  ctx.setLineDash(getLineDash(settings.lineStyle));

  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowheadSize = settings.arrowheadSize || 12;

  let adjustedStartX = startX;
  let adjustedStartY = startY;
  let adjustedEndX = endX;
  let adjustedEndY = endY;

  if (settings.startArrowhead !== 'none') {
    adjustedStartX = startX + Math.cos(angle) * arrowheadSize;
    adjustedStartY = startY + Math.sin(angle) * arrowheadSize;
  }

  if (settings.endArrowhead !== 'none') {
    adjustedEndX = endX - Math.cos(angle) * arrowheadSize;
    adjustedEndY = endY - Math.sin(angle) * arrowheadSize;
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

function renderArrowhead(params: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  angle: number;
  type: string;
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
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle as string;
      ctx.fill();
      break;
  }

  ctx.restore();
}

