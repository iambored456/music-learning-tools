import { SIDE_COLUMN_WIDTH } from '@/core/constants.ts';

export const LOW_ZOOM_LEGEND_CELL_HEIGHT_THRESHOLD = 18;
export const LOW_ZOOM_LEGEND_COLUMN_WIDTH_UNITS = 3.5;

export function getLegendColumnWidthUnits(): number {
  return getLegendColumnWidthUnitsForCellHeight();
}

export function getLegendColumnWidthUnitsForCellHeight(cellHeight?: number): number {
  if (Number.isFinite(cellHeight ?? NaN) && (cellHeight ?? 0) > 0 && (cellHeight as number) < LOW_ZOOM_LEGEND_CELL_HEIGHT_THRESHOLD) {
    return LOW_ZOOM_LEGEND_COLUMN_WIDTH_UNITS;
  }

  return SIDE_COLUMN_WIDTH;
}

export function getLegendTotalWidthPx(cellWidth: number, cellHeight?: number): number {
  return getLegendColumnWidthUnitsForCellHeight(cellHeight) * 2 * cellWidth;
}
