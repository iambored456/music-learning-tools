import { getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { timeToCanvas } from '@services/columnMapService.ts';
import store from '@state/initStore.ts';
import { calculateConvexHull, polygonIntersectsEllipse, polygonIntersectsRect } from '@utils/geometryUtils.ts';
import type {
  AppState,
  GeometryPoint,
  LassoSelectedItem,
  LassoSelection,
  PlacedNote,
  SixteenthStampPlacement,
  SixteenthThreeStampPlacement,
  TripletStampPlacement,
} from '@mlt/types';
import type { RendererOptions } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';

type SelectedItem = LassoSelectedItem;
type LassoState = Pick<
  AppState,
  'placedNotes' | 'sixteenthStampPlacements' | 'sixteenthThreeStampPlacements' | 'tripletStampPlacements' | 'tempoModulationMarkers'
>;

interface SelectionComputationResult {
  selectedItems: SelectedItem[];
  convexHull: GeometryPoint[] | null;
  isActive: boolean;
}

function buildNoteSelectionId(note: PlacedNote): string {
  return `note-${note.row}-${note.startColumnIndex}-${note.color}-${note.shape}`;
}

function buildSixteenthStampSelectionId(stamp: SixteenthStampPlacement): string {
  return `sixteenth-stamp-${stamp.row}-${stamp.startColumn}-${stamp.sixteenthStampId}`;
}

function buildTripletStampSelectionId(triplet: TripletStampPlacement, state: LassoState | AppState): string {
  const tripletStartCol = timeToCanvas(triplet.startTimeIndex, state as AppState);
  return `triplet-stamp-${triplet.row}-${tripletStartCol}-${triplet.tripletStampId}`;
}

export function computeLassoSelection(params: {
  lassoPath: Array<{ x: number; y: number }>;
  state: LassoState;
  renderOptions: RendererOptions;
  isAdditive: boolean;
  existingSelectedItems?: SelectedItem[];
}): SelectionComputationResult {
  const { lassoPath, state, renderOptions, isAdditive, existingSelectedItems } = params;

  const selectedItems: SelectedItem[] = [];

  if (isAdditive && Array.isArray(existingSelectedItems)) {
    selectedItems.push(...existingSelectedItems);
  }

  // Notes (ellipse intersection, matching notes renderer semantics)
  state.placedNotes.forEach((note, index: number) => {
    if (note.isDrum) {
      return;
    }

    const colIndex = note.startColumnIndex;
    const xStart = getColumnX(colIndex, renderOptions);
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
      const id = buildNoteSelectionId(note);
      if (!selectedItems.find(item => item.id === id)) {
        selectedItems.push({ type: 'note', id, data: note, index });
      }
    }
  });

  // Sixteenth stamps (rectangle intersection)
  state.sixteenthStampPlacements.forEach((stamp, index: number) => {
    const { cellWidth, cellHeight } = renderOptions;

    const stampX = getColumnX(stamp.startColumn, renderOptions);
    const stampY = getRowY(stamp.row, renderOptions) - (cellHeight / 2);
    const stampWidth = cellWidth * 2;
    const stampHeight = cellHeight;

    if (polygonIntersectsRect(lassoPath, { x: stampX, y: stampY, width: stampWidth, height: stampHeight })) {
      const id = buildSixteenthStampSelectionId(stamp);
      if (!selectedItems.find(item => item.id === id)) {
        selectedItems.push({ type: 'sixteenthStamp', id, data: stamp, index });
      }
    }
  });

  // Triplet stamps (rectangle intersection)
  state.tripletStampPlacements.forEach((triplet, index: number) => {
    const { cellHeight } = renderOptions;

    const tripletStartCol = timeToCanvas(triplet.startTimeIndex, state as AppState);
    const tripletEndCol = tripletStartCol + (triplet.span * 2);
    const tripletX = getColumnX(tripletStartCol, renderOptions);
    const tripletWidth = getColumnX(tripletEndCol, renderOptions) - tripletX;
    const tripletY = getRowY(triplet.row, renderOptions) - (cellHeight / 2);
    const tripletHeight = cellHeight;

    if (polygonIntersectsRect(lassoPath, { x: tripletX, y: tripletY, width: tripletWidth, height: tripletHeight })) {
      const id = buildTripletStampSelectionId(triplet, state as AppState);
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
  renderOptions: RendererOptions;
  state?: LassoState | AppState;
}): GeometryPoint[] | null {
  const { selectedItems, renderOptions, state } = params;
  if (!selectedItems.length) {
    return null;
  }

  const canvasState = (state ?? store.state) as AppState;
  const points = selectedItems.map(item => {
    const colIndex =
      item.type === 'note'
        ? item.data.startColumnIndex
        : item.type === 'sixteenthStamp'
          ? item.data.startColumn
          : timeToCanvas(item.data.startTimeIndex, canvasState);
    const x = getColumnX(colIndex, renderOptions);
    const y = getRowY(item.data.row, renderOptions);
    return { x, y };
  });

  return calculateConvexHull(points);
}

export function removeFromLassoSelectionAtPoint(params: {
  canvasX: number;
  canvasY: number;
  state: AppState;
  renderOptions: RendererOptions;
  selection: LassoSelection | null | undefined;
  thresholdPx?: number;
}): { nextSelection: LassoSelection; changed: boolean } | null {
  const { canvasX, canvasY, state, renderOptions, selection } = params;
  if (!selection?.isActive) {
    return null;
  }

  const threshold = params.thresholdPx ?? 15;
  let clickedItemId: string | null = null;

  state.placedNotes.forEach((note) => {
    const colIndex = note.startColumnIndex;
    const centerX = getColumnX(colIndex, renderOptions);
    const centerY = getRowY(note.row, renderOptions);
    const dist = Math.hypot(canvasX - centerX, canvasY - centerY);

    if (dist <= threshold) {
      clickedItemId = buildNoteSelectionId(note);
    }
  });

  if (!clickedItemId) {
    state.sixteenthStampPlacements.forEach((stamp) => {
      const centerCol = stamp.startColumn + 1;
      const centerX = getColumnX(centerCol, renderOptions);
      const centerY = getRowY(stamp.row, renderOptions);
      const dist = Math.hypot(canvasX - centerX, canvasY - centerY);

      if (dist <= threshold) {
        clickedItemId = buildSixteenthStampSelectionId(stamp);
      }
    });
  }

  if (!clickedItemId) {
    state.tripletStampPlacements.forEach((triplet) => {
      const tripletStartCol = timeToCanvas(triplet.startTimeIndex, state);
      const centerCol = tripletStartCol + triplet.span;
      const centerX = getColumnX(centerCol, renderOptions);
      const centerY = getRowY(triplet.row, renderOptions);
      const dist = Math.hypot(canvasX - centerX, canvasY - centerY);

      if (dist <= threshold) {
        clickedItemId = buildTripletStampSelectionId(triplet, state);
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




