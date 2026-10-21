export interface PrintLineRange {
  startX: number;
  endX: number;
}

/** Group whole measures using their mapped pixel boundaries, including any tonic columns. */
export function getPrintLineRanges(
  measureEnds: number[],
  musicalWidth: number,
  barsPerLine = 0
): PrintLineRange[] {
  const singleLine = [{ startX: 0, endX: musicalWidth }];
  if (!Number.isInteger(barsPerLine) || barsPerLine <= 0 || barsPerLine >= measureEnds.length) {
    return singleLine;
  }

  const ranges: PrintLineRange[] = [];
  let startX = 0;
  for (let index = barsPerLine - 1; index < measureEnds.length - 1; index += barsPerLine) {
    const endX = measureEnds[index];
    if (endX === undefined || !Number.isFinite(endX) || endX <= startX || endX >= musicalWidth) {
      return singleLine;
    }
    ranges.push({ startX, endX });
    startX = endX;
  }
  // Preserve all trailing content, including a final partial bar or tonic sign.
  ranges.push({ startX, endX: musicalWidth });
  return ranges;
}
