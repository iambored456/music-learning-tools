/** Musical-area coordinates only: the legend is outside this rectangle. */
export function snapLessonPlacement(
  x: number, y: number, width: number, height: number, columnCount: number, rowCount: number,
) {
  if (![x, y, width, height, columnCount, rowCount].every(Number.isFinite)
    || width <= 0 || height <= 0 || columnCount < 2 || rowCount < 1) return null;
  // Student Notation draws a two-column circle one column after its start.
  // Snap the pointer to that center, then recover the starting column.
  const column = Math.max(0, Math.min(columnCount - 2, Math.round(x / width * columnCount) - 1));
  const row = Math.max(0, Math.min(rowCount - 1, Math.round(y / height * (rowCount + 1) - 1)));
  return { column, row, leftPercent: (column + 1) / columnCount * 100 };
}
