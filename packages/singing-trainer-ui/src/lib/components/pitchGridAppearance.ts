/** Shared geometry for the trainer canvas and its solfege rows. */
export const SINGING_GRID = {
  cellWidth: 20,
  preferredCellHeight: 40,
  minCellHeight: 20,
  legendColumnWidthUnits: 3.236,
  rightLegendBreakpoint: 720,
  judgmentLineColor: '#adb5bd',
  referenceLineColor: 'rgba(255, 0, 0, 0.9)',
} as const;

export function singingLegendWidth(): number {
  return SINGING_GRID.cellWidth * SINGING_GRID.legendColumnWidthUnits * 2;
}

export function singingPitchSizes(cellHeight: number, trailScale: number) {
  return {
    circleRadius: cellHeight * 0.61803 / 2 * trailScale,
    indicatorRadius: cellHeight / 2,
  };
}

export function singingJudgmentLineWidth(cellHeight: number): number {
  return Math.max(1.25, Math.min(7, cellHeight / 40 * 3));
}

/** Student Notation uses two half-height columns per quarter-note circle. */
export function squareGridViewDurationMs(width: number, cellHeight: number, tempoBpm: number): number {
  return width * 60_000 / (Math.max(1, cellHeight) * Math.max(20, tempoBpm));
}
