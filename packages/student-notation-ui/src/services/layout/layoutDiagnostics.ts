export function roundDebugValue(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

export function parseDatasetNumber(value: string | undefined): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getLogicalCanvasWidthOrNull(canvasElement: HTMLCanvasElement | null): number | null {
  if (!canvasElement) {
    return null;
  }
  const fromDataset = parseDatasetNumber(canvasElement.dataset['logicalWidth']);
  if (fromDataset !== null && fromDataset > 0) {
    return fromDataset;
  }
  const rectWidth = canvasElement.getBoundingClientRect().width;
  if (Number.isFinite(rectWidth) && rectWidth > 0) {
    return rectWidth;
  }
  return canvasElement.clientWidth > 0 ? canvasElement.clientWidth : null;
}
