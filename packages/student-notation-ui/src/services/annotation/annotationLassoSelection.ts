import { getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { getSixteenthStampById } from '@/rhythm/sixteenthStamps.ts';
import { getSixteenthThreeStampById } from '@/rhythm/sixteenthThreeStamps.ts';
import { getTripletStampById, tripletCenterPercents } from '@/rhythm/tripletStamps.ts';
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

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Ellipse {
  centerX: number;
  centerY: number;
  rx: number;
  ry: number;
}

const THREE_STAMP_TIME_SPAN = 1.5;

export function buildNoteSelectionId(note: PlacedNote): string {
  return `note-${note.row}-${note.startColumnIndex}-${note.color}-${note.shape}`;
}

export function buildSixteenthStampSelectionId(stamp: SixteenthStampPlacement): string {
  return `sixteenth-stamp-${stamp.row}-${stamp.startColumn}-${stamp.sixteenthStampId}`;
}

export function buildSixteenthThreeStampSelectionId(stamp: SixteenthThreeStampPlacement): string {
  return `sixteenth-three-stamp-${stamp.id}`;
}

export function buildTripletStampSelectionId(triplet: TripletStampPlacement, state: LassoState | AppState): string {
  const tripletStartCol = timeToCanvas(triplet.startTimeIndex, state as AppState);
  return `triplet-stamp-${triplet.row}-${tripletStartCol}-${triplet.tripletStampId}`;
}

function getSixteenthStampWidth(stamp: SixteenthStampPlacement, renderOptions: RendererOptions): number {
  const startX = getColumnX(stamp.startColumn, renderOptions);
  const endColumn = typeof stamp.endColumn === 'number' ? stamp.endColumn : stamp.startColumn + 2;
  const endX = getColumnX(endColumn, renderOptions);
  const width = endX - startX;
  return Number.isFinite(width) && width > 0 ? width : renderOptions.cellWidth * 2;
}

function getSixteenthStampShapeGeometry(
  stamp: SixteenthStampPlacement,
  renderOptions: RendererOptions
): { rects: Rect[]; ellipses: Ellipse[] } {
  const stampDefinition = getSixteenthStampById(stamp.sixteenthStampId);
  if (!stampDefinition) {
    return { rects: [], ellipses: [] };
  }

  const { cellHeight } = renderOptions;
  const stampX = getColumnX(stamp.startColumn, renderOptions);
  const stampWidth = getSixteenthStampWidth(stamp, renderOptions);
  const scaleX = (stampWidth / 100) * 0.8;
  const scaleY = (cellHeight / 100) * 0.8;
  const diamondW = 30 * scaleX;
  const diamondH = 120 * scaleY;
  const ovalRx = 30 * scaleX;
  const ovalRy = 60 * scaleY;
  const slotCenters = [0.125, 0.375, 0.625, 0.875].map(ratio => stampX + ratio * stampWidth);

  const rects: Rect[] = [];
  const ellipses: Ellipse[] = [];

  stampDefinition.ovals.forEach(ovalStart => {
    const shapeKey = `oval_${ovalStart}`;
    const rowOffset = stamp.shapeOffsets?.[shapeKey] ?? 0;
    const shapeRow = stamp.row + rowOffset;
    const centerY = getRowY(shapeRow, renderOptions);
    const centerX = ovalStart === 0
      ? stampX + 0.25 * stampWidth
      : stampX + 0.75 * stampWidth;

    ellipses.push({
      centerX,
      centerY,
      rx: ovalRx,
      ry: ovalRy
    });
  });

  stampDefinition.diamonds.forEach(slot => {
    const centerX = slotCenters[slot];
    if (centerX === undefined) {
      return;
    }

    const shapeKey = `diamond_${slot}`;
    const rowOffset = stamp.shapeOffsets?.[shapeKey] ?? 0;
    const shapeRow = stamp.row + rowOffset;
    const centerY = getRowY(shapeRow, renderOptions);

    rects.push({
      x: centerX - (diamondW / 2),
      y: centerY - (diamondH / 2),
      width: diamondW,
      height: diamondH
    });
  });

  return { rects, ellipses };
}

function rectToPoints(rect: Rect): GeometryPoint[] {
  const { x, y, width, height } = rect;
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
}

function ellipseToPoints(ellipse: Ellipse): GeometryPoint[] {
  const { centerX, centerY, rx, ry } = ellipse;
  return [
    { x: centerX - rx, y: centerY },
    { x: centerX, y: centerY - ry },
    { x: centerX + rx, y: centerY },
    { x: centerX, y: centerY + ry }
  ];
}

function pointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function distanceToRect(x: number, y: number, rect: Rect): number {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  return Math.hypot(x - closestX, y - closestY);
}

function distanceToEllipse(x: number, y: number, ellipse: Ellipse): number {
  const normalizedDx = (x - ellipse.centerX) / Math.max(ellipse.rx, 1);
  const normalizedDy = (y - ellipse.centerY) / Math.max(ellipse.ry, 1);
  const normalizedDistance = Math.hypot(normalizedDx, normalizedDy);
  if (normalizedDistance <= 1) {
    return 0;
  }

  return (normalizedDistance - 1) * Math.max(ellipse.rx, ellipse.ry);
}

function lassoIntersectsSixteenthStamp(
  lassoPath: Array<{ x: number; y: number }>,
  stamp: SixteenthStampPlacement,
  renderOptions: RendererOptions
): boolean {
  const geometry = getSixteenthStampShapeGeometry(stamp, renderOptions);
  return geometry.rects.some(rect => polygonIntersectsRect(lassoPath, rect)) ||
    geometry.ellipses.some(ellipse => polygonIntersectsEllipse(lassoPath, ellipse));
}

function getSixteenthStampHullPoints(stamp: SixteenthStampPlacement, renderOptions: RendererOptions): GeometryPoint[] {
  const geometry = getSixteenthStampShapeGeometry(stamp, renderOptions);
  return [
    ...geometry.rects.flatMap(rectToPoints),
    ...geometry.ellipses.flatMap(ellipseToPoints)
  ];
}

function isPointNearSixteenthStamp(
  canvasX: number,
  canvasY: number,
  stamp: SixteenthStampPlacement,
  renderOptions: RendererOptions,
  threshold: number
): boolean {
  const geometry = getSixteenthStampShapeGeometry(stamp, renderOptions);
  return geometry.rects.some(rect => pointInRect(canvasX, canvasY, rect) || distanceToRect(canvasX, canvasY, rect) <= threshold) ||
    geometry.ellipses.some(ellipse => distanceToEllipse(canvasX, canvasY, ellipse) <= threshold);
}

function getSixteenthThreeStampBaseRect(
  stamp: SixteenthThreeStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): Rect {
  const { cellHeight } = renderOptions;
  const startCanvasCol = timeToCanvas(stamp.startTimeIndex, state as AppState);
  const endCanvasCol = startCanvasCol + THREE_STAMP_TIME_SPAN;
  const stampX = getColumnX(startCanvasCol, renderOptions);
  const rawWidth = getColumnX(endCanvasCol, renderOptions) - stampX;
  const stampWidth = Number.isFinite(rawWidth) && rawWidth > 0
    ? rawWidth
    : renderOptions.cellWidth * THREE_STAMP_TIME_SPAN;
  const stampY = getRowY(stamp.row, renderOptions) - (cellHeight / 2);

  return {
    x: stampX,
    y: stampY,
    width: stampWidth,
    height: cellHeight
  };
}

function getSixteenthThreeStampShapeGeometry(
  stamp: SixteenthThreeStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): { rects: Rect[]; ellipses: Ellipse[] } {
  const baseRect = getSixteenthThreeStampBaseRect(stamp, state, renderOptions);
  const stampDefinition = getSixteenthThreeStampById(stamp.sixteenthThreeStampId);
  if (!stampDefinition) {
    return { rects: [], ellipses: [] };
  }

  const scaleX = (baseRect.width / 100) * 0.8;
  const scaleY = (baseRect.height / 100) * 0.8;
  const diamondW = 40 * scaleX;
  const diamondH = 120 * scaleY;
  const slotCenters = [1 / 6, 3 / 6, 5 / 6].map(ratio => baseRect.x + ratio * baseRect.width);
  const rects: Rect[] = [];

  stampDefinition.diamonds.forEach(slot => {
    const centerX = slotCenters[slot];
    if (centerX === undefined) {
      return;
    }

    const shapeKey = `diamond_${slot}`;
    const rowOffset = stamp.shapeOffsets?.[shapeKey] ?? 0;
    const shapeRow = stamp.row + rowOffset;
    const centerY = getRowY(shapeRow, renderOptions);

    rects.push({
      x: centerX - (diamondW / 2),
      y: centerY - (diamondH / 2),
      width: diamondW,
      height: diamondH
    });
  });

  return { rects, ellipses: [] };
}

function lassoIntersectsSixteenthThreeStamp(
  lassoPath: Array<{ x: number; y: number }>,
  stamp: SixteenthThreeStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): boolean {
  const geometry = getSixteenthThreeStampShapeGeometry(stamp, state, renderOptions);
  return geometry.rects.some(rect => polygonIntersectsRect(lassoPath, rect));
}

function getSixteenthThreeStampHullPoints(
  stamp: SixteenthThreeStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): GeometryPoint[] {
  const geometry = getSixteenthThreeStampShapeGeometry(stamp, state, renderOptions);
  return geometry.rects.flatMap(rectToPoints);
}

function isPointNearSixteenthThreeStamp(
  canvasX: number,
  canvasY: number,
  stamp: SixteenthThreeStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions,
  threshold: number
): boolean {
  const geometry = getSixteenthThreeStampShapeGeometry(stamp, state, renderOptions);
  return geometry.rects.some(rect => pointInRect(canvasX, canvasY, rect) || distanceToRect(canvasX, canvasY, rect) <= threshold);
}

function getTripletStampBaseRect(
  triplet: TripletStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): Rect {
  const { cellHeight } = renderOptions;
  const tripletStartCol = timeToCanvas(triplet.startTimeIndex, state as AppState);
  const tripletEndCol = tripletStartCol + (triplet.span * 2);
  const tripletX = getColumnX(tripletStartCol, renderOptions);
  const tripletWidth = getColumnX(tripletEndCol, renderOptions) - tripletX;
  const tripletY = getRowY(triplet.row, renderOptions) - (cellHeight / 2);

  return {
    x: tripletX,
    y: tripletY,
    width: tripletWidth,
    height: cellHeight
  };
}

function getTripletStampShapeGeometry(
  triplet: TripletStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): { rects: Rect[]; ellipses: Ellipse[] } {
  const baseRect = getTripletStampBaseRect(triplet, state, renderOptions);
  const stampDefinition = getTripletStampById(triplet.tripletStampId);
  if (!stampDefinition) {
    return { rects: [], ellipses: [] };
  }

  const scaleX = (baseRect.width / 100) * 0.8;
  const scaleY = (baseRect.height / 100) * 0.8;
  const rx = 20 * scaleX;
  const ry = 60 * scaleY;
  const ellipses: Ellipse[] = [];

  stampDefinition.hits.forEach(slot => {
    const centerPercent = tripletCenterPercents[slot];
    if (centerPercent === undefined) {
      return;
    }

    const shapeKey = `triplet_${slot}`;
    const rowOffset = triplet.shapeOffsets?.[shapeKey] ?? 0;
    const shapeRow = triplet.row + rowOffset;

    ellipses.push({
      centerX: baseRect.x + (baseRect.width * centerPercent / 100),
      centerY: getRowY(shapeRow, renderOptions),
      rx,
      ry
    });
  });

  return { rects: [], ellipses };
}

function lassoIntersectsTripletStamp(
  lassoPath: Array<{ x: number; y: number }>,
  triplet: TripletStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): boolean {
  const geometry = getTripletStampShapeGeometry(triplet, state, renderOptions);
  return geometry.rects.some(rect => polygonIntersectsRect(lassoPath, rect)) ||
    geometry.ellipses.some(ellipse => polygonIntersectsEllipse(lassoPath, ellipse));
}

function getTripletStampHullPoints(
  triplet: TripletStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): GeometryPoint[] {
  const geometry = getTripletStampShapeGeometry(triplet, state, renderOptions);
  return [
    ...geometry.rects.flatMap(rectToPoints),
    ...geometry.ellipses.flatMap(ellipseToPoints)
  ];
}

function isPointNearTripletStamp(
  canvasX: number,
  canvasY: number,
  triplet: TripletStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions,
  threshold: number
): boolean {
  const geometry = getTripletStampShapeGeometry(triplet, state, renderOptions);
  return geometry.rects.some(rect => pointInRect(canvasX, canvasY, rect) || distanceToRect(canvasX, canvasY, rect) <= threshold) ||
    geometry.ellipses.some(ellipse => distanceToEllipse(canvasX, canvasY, ellipse) <= threshold);
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

  // Sixteenth stamps (rendered glyph intersection)
  state.sixteenthStampPlacements.forEach((stamp, index: number) => {
    if (lassoIntersectsSixteenthStamp(lassoPath, stamp, renderOptions)) {
      const id = buildSixteenthStampSelectionId(stamp);
      if (!selectedItems.find(item => item.id === id)) {
        selectedItems.push({ type: 'sixteenthStamp', id, data: stamp, index });
      }
    }
  });

  // Three-sixteenth stamps (rendered glyph intersection)
  state.sixteenthThreeStampPlacements.forEach((stamp, index: number) => {
    if (lassoIntersectsSixteenthThreeStamp(lassoPath, stamp, state, renderOptions)) {
      const id = buildSixteenthThreeStampSelectionId(stamp);
      if (!selectedItems.find(item => item.id === id)) {
        selectedItems.push({ type: 'sixteenthThreeStamp', id, data: stamp, index });
      }
    }
  });

  // Triplet stamps (rendered glyph intersection)
  state.tripletStampPlacements.forEach((triplet, index: number) => {
    if (lassoIntersectsTripletStamp(lassoPath, triplet, state, renderOptions)) {
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
  const points = selectedItems.flatMap(item => {
    if (item.type === 'sixteenthStamp') {
      return getSixteenthStampHullPoints(item.data, renderOptions);
    }
    if (item.type === 'sixteenthThreeStamp') {
      return getSixteenthThreeStampHullPoints(item.data, canvasState, renderOptions);
    }
    if (item.type === 'tripletStamp') {
      return getTripletStampHullPoints(item.data, canvasState, renderOptions);
    }
    if (item.type === 'note') {
      const x = getColumnX(item.data.startColumnIndex, renderOptions);
      const y = getRowY(item.data.row, renderOptions);
      return [{ x, y }];
    }

    return [];
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
      if (isPointNearSixteenthStamp(canvasX, canvasY, stamp, renderOptions, threshold)) {
        clickedItemId = buildSixteenthStampSelectionId(stamp);
      }
    });
  }

  if (!clickedItemId) {
    state.sixteenthThreeStampPlacements.forEach((stamp) => {
      if (isPointNearSixteenthThreeStamp(canvasX, canvasY, stamp, state, renderOptions, threshold)) {
        clickedItemId = buildSixteenthThreeStampSelectionId(stamp);
      }
    });
  }

  if (!clickedItemId) {
    state.tripletStampPlacements.forEach((triplet) => {
      if (isPointNearTripletStamp(canvasX, canvasY, triplet, state, renderOptions, threshold)) {
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




