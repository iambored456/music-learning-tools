import logger from '@utils/logger.ts';
import type { PitchRange } from '@mlt/types';

interface TonePreset {
  top: string | null;
  bottom: string | null;
}

const TREBLE_CLEF_PRESET_TONES: TonePreset = {
  top: 'G5',
  bottom: 'C4'
};

export function getTrebleClefPresetRange(
  rows: Array<{ toneNote?: string }>
): PitchRange | null {
  const topTone = TREBLE_CLEF_PRESET_TONES.top;
  const bottomTone = TREBLE_CLEF_PRESET_TONES.bottom;

  if (!topTone || !bottomTone) {
    return null;
  }

  const topIndex = rows.findIndex(row => row.toneNote === topTone);
  const bottomIndex = rows.findIndex(row => row.toneNote === bottomTone);

  if (topIndex === -1 || bottomIndex === -1) {
    logger.warn('Main', 'Failed to resolve preset range from tone notes', TREBLE_CLEF_PRESET_TONES);
    return null;
  }

  return {
    topIndex: Math.min(topIndex, bottomIndex),
    bottomIndex: Math.max(topIndex, bottomIndex)
  };
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
