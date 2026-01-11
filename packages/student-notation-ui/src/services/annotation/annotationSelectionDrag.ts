import { computeConvexHullForSelectedItems } from './annotationLassoSelection.ts';
import { canvasToTime, timeToCanvas } from '@services/columnMapService.ts';
import store from '@state/initStore.ts';

export type SelectionDragTotals = { col: number; row: number };
export type SelectionDragStart = { col: number; row: number };

export function applyLassoSelectionDrag(params: {
  selection: { selectedItems: any[]; convexHull: any; isActive: boolean };
  selectionDragStart: SelectionDragStart;
  selectionDragTotal: SelectionDragTotals;
  currentPointerGrid: { col: number; row: number };
  initialDragStartRank: number | null;
  currentStartRank: number;
  renderOptions: any;
}): { moved: boolean; nextSelectionDragTotal: SelectionDragTotals; nextConvexHull: any } {
  const {
    selection,
    selectionDragStart,
    selectionDragTotal,
    currentPointerGrid,
    initialDragStartRank,
    currentStartRank,
    renderOptions
  } = params;

  const rankShift = initialDragStartRank !== null ? currentStartRank - initialDragStartRank : 0;
  const compensatedRow = currentPointerGrid.row - rankShift;

  const dCol = Math.round(currentPointerGrid.col - selectionDragStart.col);
  const dRow = Math.round(compensatedRow - selectionDragStart.row);

  const movementNeeded = {
    col: dCol - selectionDragTotal.col,
    row: dRow - selectionDragTotal.row
  };

  if (movementNeeded.col === 0 && movementNeeded.row === 0) {
    return { moved: false, nextSelectionDragTotal: selectionDragTotal, nextConvexHull: selection.convexHull };
  }

  const resolveGlobalRow = (row: number, existingGlobal?: number): number =>
    typeof existingGlobal === 'number' ? existingGlobal : row;

  const resolvePlayableTimeIndex = (canvasCol: number, direction: number): number | null => {
    const columnCount = store.state.columnWidths?.length ?? 0;
    let col = canvasCol;

    while (col >= 0 && col < columnCount) {
      const timeIndex = canvasToTime(col, store.state);
      if (timeIndex !== null) {
        return timeIndex;
      }
      col += direction;
    }

    return null;
  };

  selection.selectedItems.forEach(item => {
    if (item.type === 'note') {
      const baseGlobal = resolveGlobalRow(item.data.row, item.data.globalRow);
      const newGlobal = baseGlobal + movementNeeded.row;

      item.data.globalRow = newGlobal;
      item.data.row = newGlobal;

      item.data.startColumnIndex = (item.data.startColumnIndex + movementNeeded.col) as any;
      item.data.endColumnIndex = (item.data.endColumnIndex + movementNeeded.col) as any;
    } else if (item.type === 'sixteenthStamp') {
      const baseGlobal = resolveGlobalRow(item.data.row, item.data.globalRow);
      const newGlobal = baseGlobal + movementNeeded.row;

      item.data.globalRow = newGlobal;
      item.data.row = newGlobal;

      item.data.startColumn = (item.data.startColumn + movementNeeded.col) as any;
      item.data.endColumn = (item.data.endColumn + movementNeeded.col) as any;
    } else if (item.type === 'tripletStamp') {
      const baseGlobal = resolveGlobalRow(item.data.row, item.data.globalRow);
      const newGlobal = baseGlobal + movementNeeded.row;

      item.data.globalRow = newGlobal;
      item.data.row = newGlobal;

      if (movementNeeded.col !== 0) {
        const baseCanvasCol = timeToCanvas(item.data.startTimeIndex, store.state);
        const targetCanvasCol = baseCanvasCol + movementNeeded.col;
        const direction = Math.sign(movementNeeded.col) || 1;
        const targetTimeIndex = resolvePlayableTimeIndex(targetCanvasCol, direction);
        if (targetTimeIndex !== null) {
          item.data.startTimeIndex = targetTimeIndex;
        }
      }
    }
  });

  const nextSelectionDragTotal = { col: dCol, row: dRow };
  const nextConvexHull = computeConvexHullForSelectedItems({
    selectedItems: selection.selectedItems,
    renderOptions,
    state: store.state
  });

  selection.convexHull = nextConvexHull;

  return { moved: true, nextSelectionDragTotal, nextConvexHull };
}

