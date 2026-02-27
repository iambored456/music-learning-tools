export type Point = { x: number; y: number };

const SIXTEENTH_HEX_EDGE_SLOPE = 0.5; // rise = run -> 45deg chamfer edges

/**
 * Build the six-point elongated hex used for sixteenth-note diamonds.
 * The top/bottom chamfer edges are 45deg (rise == run).
 * Coordinates are local to a slot with x in [0, width] and y centered on `centerY`.
 */
export function createSixteenthHexBase(width: number, totalHeight: number, centerY: number): Point[] {
  const triHeight = width * SIXTEENTH_HEX_EDGE_SLOPE;
  const bodyHeight = Math.max(1, totalHeight - (2 * triHeight));

  const yTop = centerY - ((bodyHeight / 2) + triHeight);
  const yUpper = yTop + triHeight;
  const yLower = yUpper + bodyHeight;
  const yBottom = yLower + triHeight;

  return [
    { x: width / 2, y: yTop },
    { x: 0, y: yUpper },
    { x: 0, y: yLower },
    { x: width / 2, y: yBottom },
    { x: width, y: yLower },
    { x: width, y: yUpper }
  ];
}

/**
 * Generate an SVG path string for the sixteenth-note elongated hex.
 */
export function createSixteenthHexPath(cx: number, cy: number, width: number, totalHeight: number): string {
  const triHeight = width * SIXTEENTH_HEX_EDGE_SLOPE;
  const bodyHeight = Math.max(1, totalHeight - (2 * triHeight));

  const yTop = cy - (bodyHeight / 2 + triHeight);
  const yUpper = yTop + triHeight;
  const yLower = yUpper + bodyHeight;
  const yBottom = yLower + triHeight;
  const xLeft = cx - width / 2;
  const xRight = cx + width / 2;

  return `M ${cx} ${yTop} L ${xLeft} ${yUpper} L ${xLeft} ${yLower} L ${cx} ${yBottom} L ${xRight} ${yLower} L ${xRight} ${yUpper} Z`;
}
