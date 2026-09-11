import { computeConvexHullForSelectedItems } from './annotationLassoSelection.ts';
import { canvasToTime, timeToCanvas } from '@services/columnMapService.ts';
import store from '@state/initStore.ts';
import { getMacrobeatInfo } from '@state/selectors.ts';
import { getColumnX } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';

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

      if (movementNeeded.col !== 0) {
        const targetCanvasCol = item.data.startColumnIndex + movementNeeded.col;
        const direction = Math.sign(movementNeeded.col) || 1;
        const targetTimeIndex = resolvePlayableTimeIndex(targetCanvasCol, direction);
        if (targetTimeIndex !== null) {
          const playableCanvasCol = timeToCanvas(targetTimeIndex, store.state);
          const appliedDelta = playableCanvasCol - item.data.startColumnIndex;
          const nextEnd = item.data.endColumnIndex + appliedDelta;
          if (playableCanvasCol >= 0 && nextEnd < store.state.columnWidths.length) {
            item.data.startColumnIndex = playableCanvasCol as typeof item.data.startColumnIndex;
            item.data.endColumnIndex = nextEnd as typeof item.data.endColumnIndex;
          }
        }
      }
    } else if (item.type === 'sixteenthStamp') {
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
    } else if (item.type === 'sixteenthThreeStamp') {
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
    } else if (item.type === 'annotation') {
      if (item.data.type === 'arrow') {
        item.data.startCol += movementNeeded.col;
        item.data.endCol += movementNeeded.col;
        item.data.startRow += movementNeeded.row;
        item.data.endRow += movementNeeded.row;
      } else if (item.data.type === 'text') {
        item.data.col += movementNeeded.col;
        item.data.row += movementNeeded.row;
      } else {
        item.data.path.forEach((point: { col: number; row: number }) => {
          point.col += movementNeeded.col;
          point.row += movementNeeded.row;
        });
      }
      store.emit('annotationsChanged');
    } else if (item.type === 'modulationMarker' && movementNeeded.col !== 0) {
      const currentX = item.data.columnIndex !== null
        ? getColumnX(item.data.columnIndex + 1, renderOptions)
        : item.data.xPosition ?? 0;
      const targetX = getColumnX(Math.max(0, Math.round(currentPointerGrid.col)), renderOptions);
      const candidates = store.state.macrobeatGroupings.map((_, macrobeatIndex) => ({
        macrobeatIndex,
        column: getMacrobeatInfo(store.state, macrobeatIndex).startColumn
      })).filter(candidate => candidate.macrobeatIndex === 0 || store.state.macrobeatBoundaryStyles[candidate.macrobeatIndex - 1] === 'solid');
      const nearest = candidates.reduce<typeof candidates[number] | null>((best, candidate) => {
        if (!best) return candidate;
        return Math.abs(getColumnX(candidate.column, renderOptions) - targetX) < Math.abs(getColumnX(best.column, renderOptions) - targetX) ? candidate : best;
      }, null);
      if (nearest && Math.abs(currentX - getColumnX(nearest.column, renderOptions)) > 0.5) {
        item.data.measureIndex = nearest.macrobeatIndex;
        item.data.macrobeatIndex = nearest.macrobeatIndex - 1;
        item.data.columnIndex = null;
        item.data.xPosition = getColumnX(nearest.column, renderOptions);
        store.emit('tempoModulationMarkersChanged');
      }
    } else if (item.type === 'tonicSign') {
      const group = store.state.tonicSignGroups[item.groupId];
      if (!group?.length) return;

      if (movementNeeded.row !== 0) {
        group.forEach(sign => {
          const globalRow = (sign.globalRow ?? sign.row) + movementNeeded.row;
          sign.globalRow = globalRow;
          sign.row = globalRow;
        });
      }

      if (movementNeeded.col !== 0) {
        const targetColumn = Math.max(0, Math.round(currentPointerGrid.col));
        const candidates = store.state.macrobeatGroupings.map((_, macrobeatIndex) => ({
          macrobeatIndex,
          column: getMacrobeatInfo(store.state, macrobeatIndex).startColumn
        })).filter(candidate => candidate.macrobeatIndex === 0 || store.state.macrobeatBoundaryStyles[candidate.macrobeatIndex - 1] === 'solid');
        const nearest = candidates.reduce<typeof candidates[number] | null>((best, candidate) => {
          if (!best) return candidate;
          return Math.abs(candidate.column - targetColumn) < Math.abs(best.column - targetColumn) ? candidate : best;
        }, null);
        const nextPreMacrobeat = nearest ? nearest.macrobeatIndex - 1 : group[0]!.preMacrobeatIndex;
        const occupied = Object.entries(store.state.tonicSignGroups).some(([groupId, signs]) =>
          groupId !== item.groupId && signs.some(sign => sign.preMacrobeatIndex === nextPreMacrobeat)
        );
        if (nearest && !occupied && nextPreMacrobeat !== group[0]!.preMacrobeatIndex) {
          const movedGroup = group.map(sign => ({ ...sign, preMacrobeatIndex: nextPreMacrobeat, columnIndex: nearest.column as typeof sign.columnIndex }));
          const oldColumn = group[0]!.columnIndex;
          store.eraseTonicSignAt(oldColumn, false);
          const insertionColumn = getMacrobeatInfo(store.state, nearest.macrobeatIndex).startColumn;
          movedGroup.forEach(sign => { sign.columnIndex = insertionColumn as typeof sign.columnIndex; });
          store.addTonicSignGroup(movedGroup, false);
          const replacement = store.state.tonicSignGroups[item.groupId];
          if (replacement?.length) item.data = replacement.find(sign => sign.globalRow === item.data.globalRow) ?? replacement[0]!;
        }
      }
      store.emit('rhythmStructureChanged');
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
