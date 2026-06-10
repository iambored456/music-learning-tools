import logger from '@utils/logger.ts';
import type { PitchRange } from '@mlt/types';

interface TonePreset {
  top: string | null;
  bottom: string | null;
}

export type ClefRangePresetId =
  | 'full'
  | 'treble'
  | 'grandstaff'
  | 'alto'
  | 'bass'
  | 'voice1'
  | 'voice2'
  | 'voice3';

export type ClefRangePresetMap = Record<ClefRangePresetId, PitchRange | null>;

const CLEF_RANGE_PRESET_TONES: Record<Exclude<ClefRangePresetId, 'full'>, TonePreset> = {
  treble: { top: 'G5', bottom: 'C4' },
  grandstaff: { top: 'G5', bottom: 'F2' },
  alto: { top: 'A4', bottom: 'D3' },
  bass: { top: 'C4', bottom: 'F2' },
  voice1: { top: 'A5', bottom: 'A3' },
  voice2: { top: 'C5', bottom: 'C3' },
  voice3: { top: 'E4', bottom: 'E2' }
};

function resolvePresetRangeFromToneNotes(
  rows: Array<{ toneNote?: string }>,
  tones: TonePreset
): PitchRange | null {
  if (!tones.top || !tones.bottom) {
    return null;
  }

  const topIndex = rows.findIndex(row => row.toneNote === tones.top);
  const bottomIndex = rows.findIndex(row => row.toneNote === tones.bottom);

  if (topIndex === -1 || bottomIndex === -1) {
    logger.warn('Main', 'Failed to resolve preset range from tone notes', tones);
    return null;
  }

  return {
    topIndex: Math.min(topIndex, bottomIndex),
    bottomIndex: Math.max(topIndex, bottomIndex)
  };
}

export function getClefRangePresetRanges(
  rows: Array<{ toneNote?: string }>
): ClefRangePresetMap {
  return {
    full: { topIndex: 0, bottomIndex: Math.max(0, rows.length - 1) },
    treble: resolvePresetRangeFromToneNotes(rows, CLEF_RANGE_PRESET_TONES.treble),
    grandstaff: resolvePresetRangeFromToneNotes(rows, CLEF_RANGE_PRESET_TONES.grandstaff),
    alto: resolvePresetRangeFromToneNotes(rows, CLEF_RANGE_PRESET_TONES.alto),
    bass: resolvePresetRangeFromToneNotes(rows, CLEF_RANGE_PRESET_TONES.bass),
    voice1: resolvePresetRangeFromToneNotes(rows, CLEF_RANGE_PRESET_TONES.voice1),
    voice2: resolvePresetRangeFromToneNotes(rows, CLEF_RANGE_PRESET_TONES.voice2),
    voice3: resolvePresetRangeFromToneNotes(rows, CLEF_RANGE_PRESET_TONES.voice3)
  };
}

export function getTrebleClefPresetRange(
  rows: Array<{ toneNote?: string }>
): PitchRange | null {
  return getClefRangePresetRanges(rows).treble;
}

export function isFullGamutRange(
  range: { topIndex?: number; bottomIndex?: number } | null | undefined,
  rowCount: number
): boolean {
  if (!range) {
    return true;
  }

  const maxIndex = Math.max(0, rowCount - 1);
  const topIndex = typeof range.topIndex === 'number' ? range.topIndex : 0;
  const bottomIndex = typeof range.bottomIndex === 'number' ? range.bottomIndex : maxIndex;

  return topIndex <= 0 && bottomIndex >= maxIndex;
}
