import { Note } from 'tonal';
import type { AppState } from '@mlt/types';
import type { ColumnMap } from '../services/columnMapService.ts';

export interface TonicLineSection {
  startColumn: number;
  endColumn: number;
  referencePitchClass: number;
}

/** Canvas-space sections. Each tonic takes effect at its left edge, in every mode. */
export function getTonicLineSections(state: Pick<AppState, 'fullRowData' | 'tonicSignGroups'>, map: ColumnMap): TonicLineSection[] {
  const mappedColumns = new Map(map.entries
    .filter(entry => entry.type === 'tonic' && entry.tonicSignUuid && entry.canvasIndex !== null)
    .map(entry => [entry.tonicSignUuid!, entry.canvasIndex!]));
  const references = new Map<number, number>([[0, 0]]);
  for (const signs of Object.values(state.tonicSignGroups)) {
    const sign = signs[0]; // Octave replicas share one reference and one column.
    if (!sign) continue;
    const row = state.fullRowData[sign.globalRow ?? sign.row];
    const pitchClass = row ? Note.chroma(row.toneNote) : undefined;
    const column = (sign.uuid ? mappedColumns.get(sign.uuid) : undefined) ?? sign.columnIndex;
    if (pitchClass === undefined || column < 0 || column >= map.totalCanvasColumns) continue;
    references.set(column, pitchClass);
  }
  const changes = [...references].sort(([a], [b]) => a - b);
  return changes.map(([startColumn, referencePitchClass], index) => ({
    startColumn,
    endColumn: changes[index + 1]?.[0] ?? map.totalCanvasColumns,
    referencePitchClass
  })).filter(section => section.endColumn > section.startColumn);
}

/** Transpose the existing C-based line/space pattern by semitone distance. */
export function getTonicLineKind(pitch: string, referencePitchClass: number): 'hidden' | 'tonic' | 'dashed' | 'fill' | 'solid' {
  const pitchClass = Note.chroma(pitch);
  if (pitchClass === undefined) return 'hidden';
  const interval = ((pitchClass - referencePitchClass) % 12 + 12) % 12;
  if ([1, 3, 5, 9, 11].includes(interval)) return 'hidden';
  if (interval === 0) return 'tonic';
  if (interval === 4) return 'dashed';
  if (interval === 7) return 'fill';
  return 'solid';
}
