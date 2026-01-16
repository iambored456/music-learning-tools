import { getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { timeToCanvas } from '@services/columnMapService.ts';
import store from '@state/initStore.ts';
import { calculateConvexHull, polygonIntersectsEllipse, polygonIntersectsRect } from '@utils/geometryUtils.ts';

type SelectedItem =
  | { type: 'note'; id: string; data: any; index?: number }
  | { type: 'sixteenthStamp'; id: string; data: any; index?: number }
  | { type: 'tripletStamp'; id: string; data: any; index?: number };

export function computeLassoSelection(params: {
  lassoPath: Array<{ x: number; y: number }>;
  state: any;
  renderOptions: any;
  isAdditive: boolean;
  existingSelectedItems?: SelectedItem[];
}): { selectedItems: SelectedItem[]; convexHull: any; isActive: boolean } {
  const { lassoPath, state, renderOptions, isAdditive, existingSelectedItems } = params;

  const selectedItems: SelectedItem[] = [];

  if (isAdditive && Array.isArray(existingSelectedItems)) {
    selectedItems.push(...existingSelectedItems);
  }

  // Notes (ellipse intersection, matching notes renderer semantics)
  state.placedNotes.forEach((note: any, index: number) => {
    if (note.isDrum) {
      return;
    }

    const colIndex = note.startColumnIndex;
    const xStart = getColumnX(colIndex as any, renderOptions);
    const baseY = getRowY(note.row, renderOptions);

    const { cellWidth, cellHeight } = renderOptions;
    let actualCellWidth = cellWidth;
    if (renderOptions.tempoModulationMarkers && renderOptions.tempoModulationMarkers.length > 0) {
      const nextX = getColumnX(colIndex + 1, renderOptions);
      actualCellWidth = nextX - xStart;
    }

    const centerX = note.shape === 'oval' ? xStart + actualCellWidth : xStart + (actualCellWidth / 2);
    const centerY = baseY;
    const rx = note.shape === 'oval' ? actualCellWidth : actualCellWidth / 2;
    const ry = cellHeight / 2;

    if (polygonIntersectsEllipse(lassoPath, { centerX, centerY, rx, ry })) {
      const id = `note-${note.row}-${colIndex}-${note.color}-${note.shape}`;
      if (!selectedItems.find(item => item.id === id)) {
        selectedItems.push({ type: 'note', id, data: note, index });
      }
    }
  });

  // Sixteenth stamps (rectangle intersection)
  state.sixteenthStampPlacements.forEach((stamp: any, index: number) => {
    const { cellWidth, cellHeight } = renderOptions;

    const stampX = getColumnX(stamp.startColumn as any, renderOptions);
    const stampY = getRowY(stamp.row, renderOptions) - (cellHeight / 2);
    const stampWidth = cellWidth * 2;
    const stampHeight = cellHeight;

    if (polygonIntersectsRect(lassoPath, { x: stampX, y: stampY, width: stampWidth, height: stampHeight })) {
      const id = `sixteenth-stamp-${stamp.row}-${stamp.startColumn}-${stamp.sixteenthStampId}`;
      if (!selectedItems.find(item => item.id === id)) {
        selectedItems.push({ type: 'sixteenthStamp', id, data: stamp, index });
      }
    }
  });

  // Triplet stamps (rectangle intersection)
  state.tripletStampPlacements.forEach((triplet: any, index: number) => {
    const { cellHeight } = renderOptions;

    const tripletStartCol = timeToCanvas(triplet.startTimeIndex, state);
    const tripletEndCol = tripletStartCol + (triplet.span * 2);
    const tripletX = getColumnX(tripletStartCol, renderOptions);
    const tripletWidth = getColumnX(tripletEndCol, renderOptions) - tripletX;
    const tripletY = getRowY(triplet.row, renderOptions) - (cellHeight / 2);
    const tripletHeight = cellHeight;

    if (polygonIntersectsRect(lassoPath, { x: tripletX, y: tripletY, width: tripletWidth, height: tripletHeight })) {
      const id = `triplet-stamp-${triplet.row}-${tripletStartCol}-${triplet.tripletStampId}`;
      if (!selectedItems.find(item => item.id === id)) {
        selectedItems.push({ type: 'tripletStamp', id, data: triplet, index });
      }
    }
  });

  const convexHull = computeConvexHullForSelectedItems({ selectedItems, renderOptions, state });
  return { selectedItems, convexHull, isActive: selectedItems.length > 0 };
}

export function computeConvexHullForSelectedItems(params: {
  selectedItems: SelectedItem[];
  renderOptions: any;
  state?: any;
}): any {
  const { selectedItems, renderOptions, state } = params;
  if (!selectedItems.length) {
    return null;
  }

  const canvasState = state ?? store.state;
  const points = selectedItems.map(item => {
    const colIndex =
      item.type === 'note'
        ? item.data.startColumnIndex
        : item.type === 'sixteenthStamp'
          ? item.data.startColumn
          : timeToCanvas(item.data.startTimeIndex, canvasState);
    const x = getColumnX(colIndex as any, renderOptions);
    const y = getRowY(item.data.row, renderOptions);
    return { x, y };
  });

  return calculateConvexHull(points);
}

export function removeFromLassoSelectionAtPoint(params: {
  canvasX: number;
  canvasY: number;
  state: any;
  renderOptions: any;
  selection: { selectedItems: SelectedItem[]; convexHull: any; isActive: boolean } | null | undefined;
  thresholdPx?: number;
}): { nextSelection: { selectedItems: SelectedItem[]; convexHull: any; isActive: boolean }; changed: boolean } | null {
  const { canvasX, canvasY, state, renderOptions, selection } = params;
  if (!selection?.isActive) {
    return null;
  }

  const threshold = params.thresholdPx ?? 15;
  let clickedItemId: string | null = null;

  state.placedNotes.forEach((note: any) => {
    const colIndex = note.startColumnIndex;
    const centerX = getColumnX(colIndex as any, renderOptions);
    const centerY = getRowY(note.row, renderOptions);
    const dist = Math.hypot(canvasX - centerX, canvasY - centerY);

    if (dist <= threshold) {
      clickedItemId = `note-${note.row}-${colIndex}-${note.color}-${note.shape}`;
    }
  });

  if (!clickedItemId) {
    state.sixteenthStampPlacements.forEach((stamp: any) => {
      const centerCol = (stamp.startColumn as any) + 1;
      const centerX = getColumnX(centerCol, renderOptions);
      const centerY = getRowY(stamp.row, renderOptions);
      const dist = Math.hypot(canvasX - centerX, canvasY - centerY);

      if (dist <= threshold) {
        clickedItemId = `sixteenth-stamp-${stamp.row}-${stamp.startColumn}-${stamp.sixteenthStampId}`;
      }
    });
  }

  if (!clickedItemId) {
    state.tripletStampPlacements.forEach((triplet: any) => {
      const tripletStartCol = timeToCanvas(triplet.startTimeIndex, state);
      const centerCol = tripletStartCol + triplet.span;
      const centerX = getColumnX(centerCol, renderOptions);
      const centerY = getRowY(triplet.row, renderOptions);
      const dist = Math.hypot(canvasX - centerX, canvasY - centerY);

      if (dist <= threshold) {
        clickedItemId = `triplet-stamp-${triplet.row}-${tripletStartCol}-${triplet.tripletStampId}`;
      }
    });
  }

  if (!clickedItemId) {
    return null;
  }

  const selectedItems = selection.selectedItems.filter(item => item.id !== clickedItemId);
  const convexHull = computeConvexHullForSelectedItems({ selectedItems, renderOptions });
  return { nextSelection: { selectedItems, convexHull, isActive: selectedItems.length > 0 }, changed: true };
}




