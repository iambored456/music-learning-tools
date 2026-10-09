/** Measure the outer frame, never a shell whose size depends on its own contents. */
export function calculateLessonGridLayout(options: {
  width: number;
  height: number;
  columns: number;
  rows: number;
  legendColumns?: number;
  layoutRows?: number;
  fallbackCellSize?: number;
  sizing?: 'fit' | 'stretch';
}) {
  const { width, height, columns, rows, legendColumns = 0,
    layoutRows = rows, fallbackCellSize = 18, sizing = 'fit' } = options;
  const totalColumns = columns + legendColumns;
  const cellWidth = width > 0 && height > 0
    ? Math.max(1, Math.min(height / (layoutRows + 1), width / totalColumns))
    : fallbackCellSize;
  return {
    width: sizing === 'stretch' && width > 0 ? width : cellWidth * totalColumns,
    height: sizing === 'stretch' && height > 0 ? height : cellWidth * (rows + 1),
    cellWidth,
    // Round notes span two time columns; hit areas must not enlarge the glyph.
    noteDiameter: cellWidth * 2,
    // Pitch rows are half a cell apart; use one scale for both axes when fitting.
    cellHeight: sizing === 'stretch' && height > 0 ? height * 2 / (rows + 1) : cellWidth * 2,
  };
}

/** Common lesson grid appearance; other PitchGrid consumers retain their defaults. */
export const lessonGridAppearance = {
  horizontalGridStyle: 'student-notation',
  horizontalGridReferencePitchClass: 0,
  showColumnGrid: true,
} as const;
