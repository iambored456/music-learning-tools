import type {
  BoomwhackerNoteShape,
  BoomwhackerGridNote,
  DerivedBeatSpan,
  DerivedTimingModel,
} from './types.js';

function clampSlotIndex(timing: DerivedTimingModel, slotIndex: number): number {
  if (timing.totalSlotCount <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(timing.totalSlotCount - 1, slotIndex));
}

export function getBeatSpanAtSlotIndex(
  timing: DerivedTimingModel,
  slotIndex: number,
): DerivedBeatSpan | null {
  const resolvedSlotIndex = clampSlotIndex(timing, slotIndex);
  return timing.beatSpans.find(
    (span) => span.startSlotIndex <= resolvedSlotIndex && span.endSlotIndex >= resolvedSlotIndex,
  ) ?? null;
}

export function getMacrobeatSlotSpanAtSlotIndex(
  timing: DerivedTimingModel,
  slotIndex: number,
): number {
  const beatSpan = getBeatSpanAtSlotIndex(timing, slotIndex);
  if (!beatSpan) {
    return 1;
  }

  return Math.max(1, Math.floor(beatSpan.slotCount / 2));
}

export function getDefaultSlotRangeForShape(
  timing: DerivedTimingModel,
  slotIndex: number,
  shape: BoomwhackerNoteShape,
): {
  startSlotIndex: number;
  endSlotIndex: number;
} {
  const resolvedSlotIndex = clampSlotIndex(timing, slotIndex);
  const beatSpan = getBeatSpanAtSlotIndex(timing, resolvedSlotIndex);
  if (!beatSpan) {
    return {
      startSlotIndex: resolvedSlotIndex,
      endSlotIndex: resolvedSlotIndex,
    };
  }

  if (shape === 'circle') {
    return {
      startSlotIndex: beatSpan.startSlotIndex,
      endSlotIndex: beatSpan.endSlotIndex,
    };
  }

  if (shape === 'oval') {
    const macrobeatSlotSpan = getMacrobeatSlotSpanAtSlotIndex(timing, resolvedSlotIndex);
    const localOffset = resolvedSlotIndex - beatSpan.startSlotIndex;
    const snappedStartSlotIndex = (
      beatSpan.startSlotIndex
      + (Math.floor(localOffset / macrobeatSlotSpan) * macrobeatSlotSpan)
    );

    return {
      startSlotIndex: snappedStartSlotIndex,
      endSlotIndex: Math.min(beatSpan.endSlotIndex, snappedStartSlotIndex + macrobeatSlotSpan - 1),
    };
  }

  return {
    startSlotIndex: resolvedSlotIndex,
    endSlotIndex: resolvedSlotIndex,
  };
}

export function getMinimumSlotSpanForShape(
  shape: BoomwhackerNoteShape,
  timing?: DerivedTimingModel,
  startSlotIndex = 0,
): number {
  if (!timing) {
    return shape === 'circle' ? 2 : 1;
  }

  const beatSpan = getBeatSpanAtSlotIndex(timing, startSlotIndex);
  if (!beatSpan) {
    return shape === 'circle' ? 1 : 1;
  }

  if (shape === 'circle') {
    return beatSpan.slotCount;
  }

  if (shape === 'oval') {
    return getMacrobeatSlotSpanAtSlotIndex(timing, startSlotIndex);
  }

  return 1;
}

export function clampNoteEndSlotIndex(
  startSlotIndex: number,
  endSlotIndex: number,
  shape: BoomwhackerNoteShape,
  maxSlotIndex: number,
  timing?: DerivedTimingModel,
): number {
  const minimumEndSlotIndex = (
    startSlotIndex
    + getMinimumSlotSpanForShape(shape, timing, startSlotIndex)
    - 1
  );
  return Math.min(maxSlotIndex, Math.max(minimumEndSlotIndex, endSlotIndex));
}

export function getNoteSlotSpan(note: Pick<BoomwhackerGridNote, 'startSlotIndex' | 'endSlotIndex'>): number {
  return Math.max(1, note.endSlotIndex - note.startSlotIndex + 1);
}

export function notesOverlap(
  left: Pick<BoomwhackerGridNote, 'row' | 'startSlotIndex' | 'endSlotIndex'>,
  right: Pick<BoomwhackerGridNote, 'row' | 'startSlotIndex' | 'endSlotIndex'>,
): boolean {
  if (left.row !== right.row) {
    return false;
  }

  return left.startSlotIndex <= right.endSlotIndex && left.endSlotIndex >= right.startSlotIndex;
}

export function sortGridNotes(notes: BoomwhackerGridNote[]): BoomwhackerGridNote[] {
  return [...notes].sort((left, right) => {
    if (left.row !== right.row) {
      return left.row - right.row;
    }
    if (left.startSlotIndex !== right.startSlotIndex) {
      return left.startSlotIndex - right.startSlotIndex;
    }
    return left.endSlotIndex - right.endSlotIndex;
  });
}
