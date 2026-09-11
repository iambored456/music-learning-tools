import { getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { getSixteenthStampById } from '@/rhythm/sixteenthStamps.ts';
import { getSixteenthThreeStampById } from '@/rhythm/sixteenthThreeStamps.ts';
import { getTripletStampById, tripletCenterPercents } from '@/rhythm/tripletStamps.ts';
import { timeToCanvas } from '@services/columnMapService.ts';
import columnMapService from '@services/columnMapService.ts';
import store from '@state/initStore.ts';
import { calculateConvexHull, polygonIntersectsEllipse, polygonIntersectsRect } from '@utils/geometryUtils.ts';
import { distanceToLineSegment } from './annotationGeometry.ts';
import { getModulationMarkerCanvasX } from '@components/canvas/PitchGrid/renderers/modulationRenderer.ts';
import type {
  Annotation,
  AppState,
  GeometryPoint,
  LassoSelectedItem,
  LassoSelection,
  PlacedNote,
  SixteenthStampPlacement,
  SixteenthThreeStampPlacement,
  TripletStampPlacement,
  TonicSign,
} from '@mlt/types';
import type { RendererOptions } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';

type SelectedItem = LassoSelectedItem;
type LassoState = Pick<
  AppState,
  'placedNotes' | 'sixteenthStampPlacements' | 'sixteenthThreeStampPlacements' | 'tripletStampPlacements' | 'tempoModulationMarkers'
> & Partial<Pick<AppState, 'tonicSignGroups' | 'annotations'>>;

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
const ANNOTATION_HIT_PADDING = 8;

export function buildNoteSelectionId(note: PlacedNote): string {
  return `note-${note.row}-${note.startColumnIndex}-${note.color}-${note.shape}`;
}

export function buildSixteenthStampSelectionId(stamp: SixteenthStampPlacement): string {
  return `sixteenth-stamp-${stamp.id}`;
}

export function buildSixteenthThreeStampSelectionId(stamp: SixteenthThreeStampPlacement): string {
  return `sixteenth-three-stamp-${stamp.id}`;
}

export function buildTripletStampSelectionId(triplet: TripletStampPlacement, state: LassoState | AppState): string {
  const tripletStartCol = timeToCanvas(triplet.startTimeIndex, state as AppState);
  return `triplet-stamp-${triplet.row}-${tripletStartCol}-${triplet.tripletStampId}`;
}

function getNoteEllipse(note: PlacedNote, renderOptions: RendererOptions): Ellipse {
  const xStart = getColumnX(note.startColumnIndex, renderOptions);
  const actualCellWidth = getColumnX(note.startColumnIndex + (note.shape === 'diamond' ? 0.5 : 1), renderOptions) - xStart || renderOptions.cellWidth;
  return {
    centerX: note.shape === 'circle' ? xStart + actualCellWidth : xStart + actualCellWidth / 2,
    centerY: getRowY(note.globalRow ?? note.row, renderOptions),
    rx: note.shape === 'circle' ? actualCellWidth : actualCellWidth / 2,
    ry: renderOptions.cellHeight / 2
  };
}

function getNoteHullPoints(note: PlacedNote, renderOptions: RendererOptions): GeometryPoint[] {
  const ellipse = getNoteEllipse(note, renderOptions);
  const points = ellipseToPoints(ellipse);
  if (note.endColumnIndex > note.startColumnIndex + 1) {
    const endX = getColumnX(note.endColumnIndex + 1, renderOptions);
    points.push(...rectToPoints({
      x: Math.min(ellipse.centerX, endX),
      y: ellipse.centerY - ellipse.ry,
      width: Math.abs(endX - ellipse.centerX),
      height: ellipse.ry * 2
    }));
  }
  return points;
}

function isPointNearNote(x: number, y: number, note: PlacedNote, renderOptions: RendererOptions, threshold: number): boolean {
  const ellipse = getNoteEllipse(note, renderOptions);
  if (distanceToEllipse(x, y, ellipse) <= threshold) return true;
  if (note.endColumnIndex <= note.startColumnIndex + 1) return false;
  const endX = getColumnX(note.endColumnIndex + 1, renderOptions);
  return distanceToRect(x, y, {
    x: Math.min(ellipse.centerX, endX),
    y: ellipse.centerY - ellipse.ry,
    width: Math.abs(endX - ellipse.centerX),
    height: ellipse.ry * 2
  }) <= threshold;
}

function getTonicGeometry(sign: TonicSign, state: AppState, renderOptions: RendererOptions): Ellipse {
  let canvasColumn = sign.columnIndex;
  if (sign.uuid) {
    const entry = columnMapService.getColumnMap(state).entries.find(candidate =>
      candidate.type === 'tonic' && candidate.tonicSignUuid === sign.uuid
    );
    if (typeof entry?.canvasIndex === 'number') canvasColumn = entry.canvasIndex as typeof canvasColumn;
  }
  const x = getColumnX(canvasColumn, renderOptions);
  const width = (getColumnX(canvasColumn + 2, renderOptions) - x) || renderOptions.cellWidth * 2;
  return {
    centerX: x + width / 2,
    centerY: getRowY(sign.globalRow ?? sign.row, renderOptions),
    rx: Math.min(width, renderOptions.cellHeight) * 0.45,
    ry: Math.min(width, renderOptions.cellHeight) * 0.45
  };
}

function annotationPoints(annotation: Annotation, renderOptions: RendererOptions): GeometryPoint[] {
  if (annotation.type === 'arrow') {
    return [
      { x: getColumnX(annotation.startCol, renderOptions), y: getRowY(annotation.startRow, renderOptions) },
      { x: getColumnX(annotation.endCol, renderOptions), y: getRowY(annotation.endRow, renderOptions) }
    ];
  }
  if (annotation.type === 'text') {
    return rectToPoints({
      x: getColumnX(annotation.col, renderOptions),
      y: getRowY(annotation.row, renderOptions),
      width: getColumnX(annotation.col + annotation.widthCols, renderOptions) - getColumnX(annotation.col, renderOptions),
      height: annotation.heightRows * renderOptions.cellHeight / 2
    });
  }
  return annotation.path.map(point => ({
    x: getColumnX(point.col, renderOptions),
    y: getRowY(point.row, renderOptions)
  }));
}

function isPointNearAnnotation(x: number, y: number, annotation: Annotation, renderOptions: RendererOptions, threshold: number): boolean {
  const points = annotationPoints(annotation, renderOptions) as Array<{ x: number; y: number }>;
  const strokeThreshold = annotation.type === 'text'
    ? threshold
    : Math.max(threshold, (annotation.type === 'arrow' ? annotation.settings.strokeWeight ?? 0 : annotation.settings.size ?? 0) / 2);
  if (annotation.type === 'text' && points.length === 4) {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    return distanceToRect(x, y, { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }) <= threshold;
  }
  if (points.length === 1) return Math.hypot(x - points[0]!.x, y - points[0]!.y) <= strokeThreshold;
  return points.slice(1).some((point, index) =>
    distanceToLineSegment(x, y, points[index]!.x, points[index]!.y, point.x, point.y) <= strokeThreshold
  );
}

function annotationHullPoints(annotation: Annotation, renderOptions: RendererOptions): GeometryPoint[] {
  const points = annotationPoints(annotation, renderOptions) as Array<{ x: number; y: number }>;
  if (annotation.type === 'text' || points.length === 0) return points;
  const padding = Math.max(ANNOTATION_HIT_PADDING, (annotation.type === 'arrow' ? annotation.settings.strokeWeight ?? 0 : annotation.settings.size ?? 0) / 2);
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  return rectToPoints({
    x: Math.min(...xs) - padding,
    y: Math.min(...ys) - padding,
    width: Math.max(...xs) - Math.min(...xs) + padding * 2,
    height: Math.max(...ys) - Math.min(...ys) + padding * 2
  });
}

export function findSelectableItemAtPoint(params: {
  canvasX: number;
  canvasY: number;
  state: AppState;
  renderOptions: RendererOptions;
  thresholdPx?: number;
}): SelectedItem | null {
  const { canvasX, canvasY, state, renderOptions } = params;
  const threshold = params.thresholdPx ?? 6;

  for (let index = state.annotations.length - 1; index >= 0; index--) {
    const annotation = state.annotations[index]!;
    if (isPointNearAnnotation(canvasX, canvasY, annotation, renderOptions, Math.max(threshold, ANNOTATION_HIT_PADDING))) {
      return { type: 'annotation', id: `annotation-${index}`, data: annotation, index };
    }
  }
  for (let index = state.tempoModulationMarkers.length - 1; index >= 0; index--) {
    const marker = state.tempoModulationMarkers[index]!;
    if (marker.active && Math.abs(canvasX - getModulationMarkerCanvasX(marker, renderOptions as AppState & RendererOptions)) <= threshold) {
      return { type: 'modulationMarker', id: `modulation-${marker.id}`, data: marker, index };
    }
  }
  for (let index = state.tripletStampPlacements.length - 1; index >= 0; index--) {
    const stamp = state.tripletStampPlacements[index]!;
    if (isPointNearTripletStamp(canvasX, canvasY, stamp, state, renderOptions, threshold)) return { type: 'tripletStamp', id: buildTripletStampSelectionId(stamp, state), data: stamp, index };
  }
  for (let index = state.sixteenthThreeStampPlacements.length - 1; index >= 0; index--) {
    const stamp = state.sixteenthThreeStampPlacements[index]!;
    if (isPointNearSixteenthThreeStamp(canvasX, canvasY, stamp, state, renderOptions, threshold)) return { type: 'sixteenthThreeStamp', id: buildSixteenthThreeStampSelectionId(stamp), data: stamp, index };
  }
  for (let index = state.sixteenthStampPlacements.length - 1; index >= 0; index--) {
    const stamp = state.sixteenthStampPlacements[index]!;
    if (isPointNearSixteenthStamp(canvasX, canvasY, stamp, state, renderOptions, threshold)) return { type: 'sixteenthStamp', id: buildSixteenthStampSelectionId(stamp), data: stamp, index };
  }
  for (const [groupId, signs] of Object.entries(state.tonicSignGroups)) {
    const sign = signs.find(candidate => distanceToEllipse(canvasX, canvasY, getTonicGeometry(candidate, state, renderOptions)) <= threshold);
    if (sign) return { type: 'tonicSign', id: `tonic-${groupId}`, data: sign, groupId };
  }
  for (let index = state.placedNotes.length - 1; index >= 0; index--) {
    const note = state.placedNotes[index]!;
    if (!note.isDrum && isPointNearNote(canvasX, canvasY, note, renderOptions, threshold)) {
      return { type: 'note', id: buildNoteSelectionId(note), data: note, index };
    }
  }
  return null;
}

function getSixteenthStampBaseRect(
  stamp: SixteenthStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): Rect {
  const startCanvasCol = timeToCanvas(stamp.startTimeIndex, state as AppState);
  const endCanvasCol = startCanvasCol + 2;
  const x = getColumnX(startCanvasCol, renderOptions);
  const rawWidth = getColumnX(endCanvasCol, renderOptions) - x;
  const width = Number.isFinite(rawWidth) && rawWidth > 0
    ? rawWidth
    : renderOptions.cellWidth * 2;

  return {
    x,
    y: getRowY(stamp.row, renderOptions) - (renderOptions.cellHeight / 2),
    width,
    height: renderOptions.cellHeight
  };
}

function getSixteenthStampShapeGeometry(
  stamp: SixteenthStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): { rects: Rect[]; ellipses: Ellipse[] } {
  const stampDefinition = getSixteenthStampById(stamp.sixteenthStampId);
  if (!stampDefinition) {
    return { rects: [], ellipses: [] };
  }

  const baseRect = getSixteenthStampBaseRect(stamp, state, renderOptions);
  const { height: cellHeight, width: stampWidth, x: stampX } = baseRect;
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
  state: LassoState | AppState,
  renderOptions: RendererOptions
): boolean {
  const geometry = getSixteenthStampShapeGeometry(stamp, state, renderOptions);
  return geometry.rects.some(rect => polygonIntersectsRect(lassoPath, rect)) ||
    geometry.ellipses.some(ellipse => polygonIntersectsEllipse(lassoPath, ellipse));
}

function getSixteenthStampHullPoints(
  stamp: SixteenthStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions
): GeometryPoint[] {
  const geometry = getSixteenthStampShapeGeometry(stamp, state, renderOptions);
  return [
    ...geometry.rects.flatMap(rectToPoints),
    ...geometry.ellipses.flatMap(ellipseToPoints)
  ];
}

function isPointNearSixteenthStamp(
  canvasX: number,
  canvasY: number,
  stamp: SixteenthStampPlacement,
  state: LassoState | AppState,
  renderOptions: RendererOptions,
  threshold: number
): boolean {
  const geometry = getSixteenthStampShapeGeometry(stamp, state, renderOptions);
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

    const ellipse = getNoteEllipse(note, renderOptions);
    const tailPoints = getNoteHullPoints(note, renderOptions);
    const tailXs = tailPoints.map(point => point.x ?? 0);
    const tailYs = tailPoints.map(point => point.y ?? 0);
    const intersectsTail = polygonIntersectsRect(lassoPath, {
      x: Math.min(...tailXs), y: Math.min(...tailYs),
      width: Math.max(...tailXs) - Math.min(...tailXs), height: Math.max(...tailYs) - Math.min(...tailYs)
    });
    if (polygonIntersectsEllipse(lassoPath, ellipse) || intersectsTail) {
      const id = buildNoteSelectionId(note);
      if (!selectedItems.find(item => item.id === id)) {
        selectedItems.push({ type: 'note', id, data: note, index });
      }
    }
  });

  // Sixteenth stamps (rendered glyph intersection)
  state.sixteenthStampPlacements.forEach((stamp, index: number) => {
    if (lassoIntersectsSixteenthStamp(lassoPath, stamp, state, renderOptions)) {
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

  Object.entries(state.tonicSignGroups ?? {}).forEach(([groupId, signs]) => {
    const sign = signs.find(candidate => polygonIntersectsEllipse(lassoPath, getTonicGeometry(candidate, state as AppState, renderOptions)));
    const id = `tonic-${groupId}`;
    if (sign && !selectedItems.find(item => item.id === id)) selectedItems.push({ type: 'tonicSign', id, data: sign, groupId });
  });

  state.tempoModulationMarkers.forEach((marker, index) => {
    if (!marker.active) return;
    const x = getModulationMarkerCanvasX(marker, renderOptions as AppState & RendererOptions);
    const id = `modulation-${marker.id}`;
    const viewportHeight = (renderOptions as RendererOptions & { viewportHeight?: number }).viewportHeight ?? 10000;
    if (polygonIntersectsRect(lassoPath, { x: x - 4, y: 0, width: 8, height: viewportHeight }) && !selectedItems.find(item => item.id === id)) {
      selectedItems.push({ type: 'modulationMarker', id, data: marker, index });
    }
  });

  (state.annotations ?? []).forEach((annotation, index) => {
    const annotationCanvasPoints = annotationPoints(annotation, renderOptions) as Array<{ x: number; y: number }>;
    const sampledPoints = annotationCanvasPoints.flatMap((point, index) => {
      const next = annotationCanvasPoints[index + 1];
      return next ? [point, { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 }] : [point];
    });
    const intersects = annotation.type === 'text'
      ? polygonIntersectsRect(lassoPath, {
          x: Math.min(...annotationCanvasPoints.map(point => point.x)),
          y: Math.min(...annotationCanvasPoints.map(point => point.y)),
          width: Math.max(...annotationCanvasPoints.map(point => point.x)) - Math.min(...annotationCanvasPoints.map(point => point.x)),
          height: Math.max(...annotationCanvasPoints.map(point => point.y)) - Math.min(...annotationCanvasPoints.map(point => point.y))
        })
      : sampledPoints.some(point => polygonIntersectsEllipse(lassoPath, { centerX: point.x, centerY: point.y, rx: ANNOTATION_HIT_PADDING, ry: ANNOTATION_HIT_PADDING }));
    const id = `annotation-${index}`;
    if (intersects && !selectedItems.find(item => item.id === id)) selectedItems.push({ type: 'annotation', id, data: annotation, index });
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
      return getSixteenthStampHullPoints(item.data, canvasState, renderOptions);
    }
    if (item.type === 'sixteenthThreeStamp') {
      return getSixteenthThreeStampHullPoints(item.data, canvasState, renderOptions);
    }
    if (item.type === 'tripletStamp') {
      return getTripletStampHullPoints(item.data, canvasState, renderOptions);
    }
    if (item.type === 'note') return getNoteHullPoints(item.data, renderOptions);
    if (item.type === 'tonicSign') return ellipseToPoints(getTonicGeometry(item.data, canvasState, renderOptions));
    if (item.type === 'modulationMarker') {
      const x = getModulationMarkerCanvasX(item.data, renderOptions as AppState & RendererOptions);
      const viewportHeight = (renderOptions as RendererOptions & { viewportHeight?: number }).viewportHeight ?? 10000;
      return rectToPoints({ x: x - 4, y: 0, width: 8, height: viewportHeight });
    }
    if (item.type === 'annotation') return annotationHullPoints(item.data, renderOptions);

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
  let clickedItemId: string | null = findSelectableItemAtPoint({
    canvasX,
    canvasY,
    state,
    renderOptions,
    thresholdPx: threshold
  })?.id ?? null;

  if (!clickedItemId) state.placedNotes.forEach((note) => {
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
      if (isPointNearSixteenthStamp(canvasX, canvasY, stamp, state, renderOptions, threshold)) {
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




