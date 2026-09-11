import { getNoteEndColumn, type AppState } from '@mlt/types';
import { canvasToTime } from '@services/columnMapService.ts';
import { getSixteenthStampById } from './sixteenthStamps.ts';
import { getSixteenthThreeStampById } from './sixteenthThreeStamps.ts';
import { getTripletStampById } from './tripletStamps.ts';

const overlaps = (a: number, b: number, c: number, d: number) => a < d - 1e-9 && b > c + 1e-9;

/** Test actual sounding stamp notes, including their per-shape pitch offsets. */
export function overlapsStampNote(state: AppState, start: number, end: number, row: number, color: string): boolean {
  const hits = (placement: { startTimeIndex: number; row: number; globalRow?: number; color: string; shapeOffsets?: Record<string, number> },
    slots: number[], key: string, step: number, duration: number) =>
    placement.color === color && slots.some(slot => {
      const pitchRow = (placement.globalRow ?? placement.row) + (placement.shapeOffsets?.[`${key}_${slot}`] ?? 0);
      const onset = placement.startTimeIndex + slot * step;
      return row === pitchRow && overlaps(start, end, onset, onset + duration);
    });

  return (state.sixteenthStampPlacements ?? []).some(placement => {
    const stamp = getSixteenthStampById(placement.sixteenthStampId);
    return stamp && (hits(placement, stamp.diamonds, 'diamond', 0.5, 0.5) || hits(placement, stamp.ovals, 'oval', 0.5, 1));
  }) || (state.sixteenthThreeStampPlacements ?? []).some(placement => {
    const stamp = getSixteenthThreeStampById(placement.sixteenthThreeStampId);
    return stamp && hits(placement, stamp.diamonds, 'diamond', 0.5, 0.5);
  }) || (state.tripletStampPlacements ?? []).some(placement => {
    const stamp = getTripletStampById(placement.tripletStampId);
    const step = stamp?.span === 'quarter' ? 4 / 3 : 2 / 3;
    return stamp && hits(placement, stamp.hits, 'triplet', step, step);
  });
}

export function canPlaceIndividualSixteenth(state: AppState, column: number, row: number, color: string, ignoreId?: string): boolean {
  const columns = state.musicalColumnWidths?.length ? state.musicalColumnWidths : state.columnWidths;
  if (!Number.isFinite(column) || column < 0 || column + 0.5 > columns.length || !Number.isInteger(column * 2) ||
      !Number.isInteger(row) || row < 0 || row >= state.fullRowData.length) return false;
  const time = canvasToTime(column, state);
  if (time === null) return false;
  const occupied = state.placedNotes.some(note => !note.isDrum && note.uuid !== ignoreId && note.color === color &&
    (note.globalRow ?? note.row) === row && overlaps(column, column + 0.5, note.startColumnIndex, getNoteEndColumn(note)));
  return !occupied && !overlapsStampNote(state, time, time + 0.5, row, color);
}

/** A new stamp must not cover an individual note in the same voice and pitch. */
export function canPlaceStampAlongsideIndividuals(
  state: AppState, kind: 'sixteenthStamp' | 'sixteenthThreeStamp' | 'tripletStamp',
  stampId: number, startTimeIndex: number, row: number, color: string
): boolean {
  const base = { id: 'candidate', startTimeIndex, row, globalRow: row, color, timestamp: 0 };
  const probe = { ...state, sixteenthStampPlacements: [], sixteenthThreeStampPlacements: [], tripletStampPlacements: [] } as AppState;
  if (kind === 'sixteenthStamp') probe.sixteenthStampPlacements = [{ ...base, sixteenthStampId: stampId }];
  else if (kind === 'sixteenthThreeStamp') probe.sixteenthThreeStampPlacements = [{ ...base, sixteenthThreeStampId: stampId }];
  else probe.tripletStampPlacements = [{ ...base, tripletStampId: stampId, span: getTripletStampById(stampId)?.span === 'quarter' ? 2 : 1 }];
  return !state.placedNotes.some(note => {
    if (note.isDrum || note.shape !== 'diamond') return false;
    const start = canvasToTime(note.startColumnIndex, state);
    return start !== null && overlapsStampNote(probe, start, start + 0.5, note.globalRow ?? note.row, note.color);
  });
}
