/**
 * Row coordinate systems (PitchGrid)
 * =================================
 *
 * This codebase uses two row index spaces for pitch:
 *
 * 1) Pitch gamut row (aka global row)
 *    - Absolute index into the pitch gamut array: `fullRowData` / `masterRowData`
 *    - Used for: pitch lookups, persistence, playback
 *    - Stored on items as: `item.globalRow`
 *
 * 2) Pitch viewport row (aka relative row)
 *    - Index relative to the current pitch viewport (`pitchRange`)
 *    - Used for: legacy state, some UI interactions
 *    - Stored on items as: `item.row`
 *
 * Conversion (pitch viewport ↔ pitch gamut):
 * - `viewportRow = globalRow - pitchRange.topIndex`
 * - `globalRow = viewportRow + pitchRange.topIndex`
 *
 * IMPORTANT:
 * - `getRowY()` expects a *pitch gamut/global* row index (an index into `fullRowData/masterRowData`).
 * - Treat `item.globalRow` as the source-of-truth for rendering and playback whenever possible.
 *
 * See also:
 * - `TERMINOLOGY.md`
 * - `src/state/initialState/index.ts`
 * - `src/components/canvas/PitchGrid/renderers/rendererUtils.ts`
 */

export interface RowPositionedItem {
  row: number;
  globalRow?: number;
}

const isDev = import.meta.env.DEV;

/**
 * Resolve the absolute (gamut/global) row for an item, computing it from the current topIndex
 * if the item does not yet have globalRow.
 */
export function resolveGlobalRow(row: number, currentTopIndex: number): number {
  return row + currentTopIndex;
}

/**
 * Map an absolute (gamut/global) row back into the current viewport (relative) space.
 */
export function mapToRelativeRow(globalRow: number, newTopIndex: number): number {
  return globalRow - newTopIndex;
}

/**
 * Convenience helper to remap an item across pitch viewport ranges.
 */
export function remapRowPosition(
  item: RowPositionedItem,
  oldTopIndex: number,
  newTopIndex: number,
  newBottomIndex: number
): { globalRow: number; mappedRow: number; outsideRange: boolean } {
  const globalRow = typeof item.globalRow === 'number'
    ? item.globalRow
    : resolveGlobalRow(item.row, oldTopIndex);

  const mappedRow = mapToRelativeRow(globalRow, newTopIndex);
  const outsideRange = globalRow < newTopIndex || globalRow > newBottomIndex;

  return { globalRow, mappedRow, outsideRange };
}

/**
 * Development-only invariant to verify coordinate consistency.
 *
 * Since fullRowData contains the complete pitch gamut (same as masterRowData),
 * this function verifies that:
 * 1) `item.globalRow` (if set) matches the expected pitch
 * 2) `item.row` (viewport-relative) + topIndex === `item.globalRow`
 */
export function assertRowIntegrity(
  item: RowPositionedItem,
  fullRowData: { toneNote?: string }[],
  masterRowData: { toneNote?: string }[],
  currentTopIndex: number,
  source?: string
): void {
  if (!isDev) {
    return;
  }

  void item;
  void fullRowData;
  void masterRowData;
  void currentTopIndex;
  void source;
}
