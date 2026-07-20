export const DRUM_TO_PITCH_ROW_HEIGHT_RATIO = 0.618;

export function getDrumRowHeightFromCellHeight(cellHeight: number): number {
  return Math.max(1, Math.round(cellHeight * DRUM_TO_PITCH_ROW_HEIGHT_RATIO));
}

export function getDrumShapeBoxHeightFromCellWidth(cellWidth: number): number {
  return Math.max(1, Math.round(cellWidth));
}
