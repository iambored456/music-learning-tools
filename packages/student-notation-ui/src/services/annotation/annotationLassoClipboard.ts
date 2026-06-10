import {
  buildNoteSelectionId,
  buildSixteenthStampSelectionId,
  buildSixteenthThreeStampSelectionId,
  buildTripletStampSelectionId,
  computeConvexHullForSelectedItems
} from './annotationLassoSelection.ts';
import { canvasToTime, timeToCanvas } from '@services/columnMapService.ts';
import type { RendererOptions } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import type {
  AppState,
  CanvasSpaceColumn,
  LassoSelectedItem,
  LassoSelection,
  PlacedNote,
  SixteenthStampPlacement,
  SixteenthThreeStampPlacement,
  TripletStampPlacement
} from '@mlt/types';

const DEFAULT_PASTE_COL_OFFSET = 1;
const DEFAULT_PASTE_ROW_OFFSET = 1;
const THREE_STAMP_TIME_SPAN = 1.5;

interface ClipboardSnapshot {
  items: LassoSelectedItem[];
  pasteCount: number;
}

interface SelectionBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

interface PasteOffsets {
  col: number;
  row: number;
}

interface PasteResult {
  selection: LassoSelection;
  pastedCount: number;
  changed: {
    notes: boolean;
    sixteenthStamps: boolean;
    sixteenthThreeStamps: boolean;
    tripletStamps: boolean;
  };
}

let clipboard: ClipboardSnapshot | null = null;
let idCounter = 0;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 11)}`;
}

function getRowLimit(state: AppState): number | null {
  const rowCount = state.fullRowData?.length ?? 0;
  return rowCount > 0 ? rowCount - 1 : null;
}

function getColumnLimit(state: AppState): number | null {
  const columnCount = state.columnWidths?.length ?? 0;
  return columnCount > 0 ? columnCount : null;
}

function getSourceRow(item: LassoSelectedItem): number {
  return typeof item.data.globalRow === 'number' ? item.data.globalRow : item.data.row;
}

function getItemRows(item: LassoSelectedItem): number[] {
  const baseRow = getSourceRow(item);
  const offsets = 'shapeOffsets' in item.data && item.data.shapeOffsets
    ? Object.values(item.data.shapeOffsets)
    : [];
  return [baseRow, ...offsets.map(offset => baseRow + offset)];
}

function getItemColumnBounds(item: LassoSelectedItem, state: AppState): { minCol: number; maxCol: number } {
  if (item.type === 'note') {
    return {
      minCol: item.data.startColumnIndex,
      maxCol: item.data.endColumnIndex
    };
  }

  if (item.type === 'sixteenthStamp') {
    const startCol = timeToCanvas(item.data.startTimeIndex, state);
    return {
      minCol: startCol,
      maxCol: startCol + 2
    };
  }

  if (item.type === 'sixteenthThreeStamp') {
    const startCol = timeToCanvas(item.data.startTimeIndex, state);
    return {
      minCol: startCol,
      maxCol: startCol + THREE_STAMP_TIME_SPAN
    };
  }

  const startCol = timeToCanvas(item.data.startTimeIndex, state);
  return {
    minCol: startCol,
    maxCol: startCol + (item.data.span * 2)
  };
}

function getSelectionBounds(items: LassoSelectedItem[], state: AppState): SelectionBounds {
  const initial: SelectionBounds = {
    minCol: Number.POSITIVE_INFINITY,
    maxCol: Number.NEGATIVE_INFINITY,
    minRow: Number.POSITIVE_INFINITY,
    maxRow: Number.NEGATIVE_INFINITY
  };

  return items.reduce((bounds, item) => {
    const cols = getItemColumnBounds(item, state);
    const rows = getItemRows(item);
    return {
      minCol: Math.min(bounds.minCol, cols.minCol),
      maxCol: Math.max(bounds.maxCol, cols.maxCol),
      minRow: Math.min(bounds.minRow, ...rows),
      maxRow: Math.max(bounds.maxRow, ...rows)
    };
  }, initial);
}

function constrainOffset(desiredOffset: number, minValue: number, maxValue: number, limit: number | null): number {
  if (limit === null) {
    return desiredOffset;
  }

  const minOffset = Math.ceil(-minValue);
  const maxOffset = Math.floor(limit - maxValue);

  if (desiredOffset >= minOffset && desiredOffset <= maxOffset) {
    return desiredOffset;
  }

  const oppositeOffset = -desiredOffset;
  if (oppositeOffset >= minOffset && oppositeOffset <= maxOffset) {
    return oppositeOffset;
  }

  return Math.max(minOffset, Math.min(desiredOffset, maxOffset));
}

function getPasteOffsets(items: LassoSelectedItem[], state: AppState, pasteCount: number): PasteOffsets {
  const bounds = getSelectionBounds(items, state);
  return {
    col: constrainOffset(DEFAULT_PASTE_COL_OFFSET * pasteCount, bounds.minCol, bounds.maxCol, getColumnLimit(state)),
    row: constrainOffset(DEFAULT_PASTE_ROW_OFFSET * pasteCount, bounds.minRow, bounds.maxRow, getRowLimit(state))
  };
}

function offsetRow(item: LassoSelectedItem, rowOffset: number, state: AppState): number {
  const nextRow = Math.round(getSourceRow(item) + rowOffset);
  const rowLimit = getRowLimit(state);
  if (rowLimit === null) {
    return nextRow;
  }

  return Math.max(0, Math.min(rowLimit, nextRow));
}

function resolvePlayableTimeIndex(canvasCol: number, state: AppState, direction: number): number | null {
  const columnCount = state.columnWidths?.length ?? 0;
  let col = canvasCol;

  while (col >= 0 && col < columnCount) {
    const timeIndex = canvasToTime(col, state);
    if (timeIndex !== null) {
      return timeIndex;
    }
    col += direction;
  }

  return null;
}

function offsetTimeIndex(startTimeIndex: number, colOffset: number, state: AppState): number | null {
  if (colOffset === 0) {
    return startTimeIndex;
  }

  const baseCanvasCol = timeToCanvas(startTimeIndex, state);
  const targetCanvasCol = baseCanvasCol + colOffset;
  const direction = Math.sign(colOffset) || 1;
  return resolvePlayableTimeIndex(targetCanvasCol, state, direction);
}

function copyNote(item: Extract<LassoSelectedItem, { type: 'note' }>, offsets: PasteOffsets, state: AppState): PlacedNote {
  const row = offsetRow(item, offsets.row, state);
  return {
    ...cloneJson(item.data),
    uuid: generateId('uuid'),
    row,
    globalRow: row,
    startColumnIndex: (item.data.startColumnIndex + offsets.col) as CanvasSpaceColumn,
    endColumnIndex: (item.data.endColumnIndex + offsets.col) as CanvasSpaceColumn
  };
}

function copySixteenthStamp(
  item: Extract<LassoSelectedItem, { type: 'sixteenthStamp' }>,
  offsets: PasteOffsets,
  state: AppState
): SixteenthStampPlacement | null {
  const startTimeIndex = offsetTimeIndex(item.data.startTimeIndex, offsets.col, state);
  if (startTimeIndex === null) {
    return null;
  }

  const row = offsetRow(item, offsets.row, state);
  return {
    ...cloneJson(item.data),
    id: generateId('sixteenth-stamp'),
    row,
    globalRow: row,
    startTimeIndex,
    timestamp: Date.now()
  };
}

function copySixteenthThreeStamp(
  item: Extract<LassoSelectedItem, { type: 'sixteenthThreeStamp' }>,
  offsets: PasteOffsets,
  state: AppState
): SixteenthThreeStampPlacement | null {
  const startTimeIndex = offsetTimeIndex(item.data.startTimeIndex, offsets.col, state);
  if (startTimeIndex === null) {
    return null;
  }

  const row = offsetRow(item, offsets.row, state);
  return {
    ...cloneJson(item.data),
    id: generateId('sixteenth-three-stamp'),
    row,
    globalRow: row,
    startTimeIndex,
    timestamp: Date.now()
  };
}

function copyTripletStamp(
  item: Extract<LassoSelectedItem, { type: 'tripletStamp' }>,
  offsets: PasteOffsets,
  state: AppState
): TripletStampPlacement | null {
  const startTimeIndex = offsetTimeIndex(item.data.startTimeIndex, offsets.col, state);
  if (startTimeIndex === null) {
    return null;
  }

  const row = offsetRow(item, offsets.row, state);
  return {
    ...cloneJson(item.data),
    id: generateId('triplet-stamp'),
    row,
    globalRow: row,
    startTimeIndex,
    timestamp: Date.now()
  };
}

export function copyLassoSelection(selection: LassoSelection | null | undefined): number {
  if (!selection?.isActive || selection.selectedItems.length === 0) {
    return 0;
  }

  clipboard = {
    items: cloneJson(selection.selectedItems),
    pasteCount: 0
  };

  return clipboard.items.length;
}

export function pasteLassoClipboard(state: AppState, renderOptions: RendererOptions): PasteResult | null {
  if (!clipboard || clipboard.items.length === 0) {
    return null;
  }

  clipboard.pasteCount += 1;
  const offsets = getPasteOffsets(clipboard.items, state, clipboard.pasteCount);
  const selectedItems: LassoSelectedItem[] = [];
  const changed = {
    notes: false,
    sixteenthStamps: false,
    sixteenthThreeStamps: false,
    tripletStamps: false
  };

  clipboard.items.forEach(item => {
    if (item.type === 'note') {
      const note = copyNote(item, offsets, state);
      state.placedNotes.push(note);
      selectedItems.push({ type: 'note', id: buildNoteSelectionId(note), data: note, index: state.placedNotes.length - 1 });
      changed.notes = true;
      return;
    }

    if (item.type === 'sixteenthStamp') {
      const stamp = copySixteenthStamp(item, offsets, state);
      if (!stamp) {
        return;
      }
      state.sixteenthStampPlacements.push(stamp);
      selectedItems.push({ type: 'sixteenthStamp', id: buildSixteenthStampSelectionId(stamp), data: stamp, index: state.sixteenthStampPlacements.length - 1 });
      changed.sixteenthStamps = true;
      return;
    }

    if (item.type === 'sixteenthThreeStamp') {
      const stamp = copySixteenthThreeStamp(item, offsets, state);
      if (!stamp) {
        return;
      }
      state.sixteenthThreeStampPlacements.push(stamp);
      selectedItems.push({ type: 'sixteenthThreeStamp', id: buildSixteenthThreeStampSelectionId(stamp), data: stamp, index: state.sixteenthThreeStampPlacements.length - 1 });
      changed.sixteenthThreeStamps = true;
      return;
    }

    const triplet = copyTripletStamp(item, offsets, state);
    if (!triplet) {
      return;
    }
    state.tripletStampPlacements.push(triplet);
    selectedItems.push({ type: 'tripletStamp', id: buildTripletStampSelectionId(triplet, state), data: triplet, index: state.tripletStampPlacements.length - 1 });
    changed.tripletStamps = true;
  });

  if (selectedItems.length === 0) {
    return null;
  }

  return {
    selection: {
      selectedItems,
      convexHull: computeConvexHullForSelectedItems({ selectedItems, renderOptions, state }),
      isActive: true
    },
    pastedCount: selectedItems.length,
    changed
  };
}

export function hasLassoClipboardContent(): boolean {
  return Boolean(clipboard?.items.length);
}

export function clearLassoClipboard(): void {
  clipboard = null;
}
