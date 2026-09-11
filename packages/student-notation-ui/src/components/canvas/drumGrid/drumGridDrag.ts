export interface DrumGridCell {
  column: number;
  row: number;
}

/** Returns every grid cell crossed by a straight pointer segment, including both endpoints. */
export function getDrumGridCellsBetween(from: DrumGridCell, to: DrumGridCell): DrumGridCell[] {
  const cells: DrumGridCell[] = [];
  let column = from.column;
  let row = from.row;
  const columnDistance = Math.abs(to.column - column);
  const rowDistance = Math.abs(to.row - row);
  const columnStep = column < to.column ? 1 : -1;
  const rowStep = row < to.row ? 1 : -1;
  let error = columnDistance - rowDistance;

  while (true) {
    cells.push({ column, row });
    if (column === to.column && row === to.row) break;
    const doubledError = error * 2;
    if (doubledError > -rowDistance) {
      error -= rowDistance;
      column += columnStep;
    }
    if (doubledError < columnDistance) {
      error += columnDistance;
      row += rowStep;
    }
  }

  return cells;
}
