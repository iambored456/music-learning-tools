const DRUM_ROW_HEIGHT_MULTIPLIER = 2;

export function getDrumRowHeightFromCellWidth(cellWidth: number): number {
  return getDrumShapeBoxHeightFromCellWidth(cellWidth) * DRUM_ROW_HEIGHT_MULTIPLIER;
}

export function getDrumShapeBoxHeightFromCellWidth(cellWidth: number): number {
  return Math.max(1, Math.round(cellWidth));
}
