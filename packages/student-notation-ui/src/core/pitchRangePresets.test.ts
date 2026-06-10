import { describe, expect, it } from 'vitest';
import { fullRowData } from '../state/pitchData.ts';
import { getClefRangePresetRanges, getTrebleClefPresetRange } from './pitchRangePresets.ts';

function toneRange(topTone: string, bottomTone: string) {
  const topIndex = fullRowData.findIndex(row => row.toneNote === topTone);
  const bottomIndex = fullRowData.findIndex(row => row.toneNote === bottomTone);
  return {
    topIndex: Math.min(topIndex, bottomIndex),
    bottomIndex: Math.max(topIndex, bottomIndex)
  };
}

describe('pitchRangePresets', () => {
  it('resolves clef presets to their named endpoints without zoom-ladder snapping', () => {
    const presets = getClefRangePresetRanges(fullRowData);

    expect(presets.treble).toEqual(toneRange('G5', 'C4'));
    expect(presets.grandstaff).toEqual(toneRange('G5', 'F2'));
    expect(presets.alto).toEqual(toneRange('A4', 'D3'));
    expect(presets.bass).toEqual(toneRange('C4', 'F2'));
    expect(presets.voice1).toEqual(toneRange('A5', 'A3'));
    expect(presets.voice2).toEqual(toneRange('C5', 'C3'));
    expect(presets.voice3).toEqual(toneRange('E4', 'E2'));
  });

  it('keeps startup treble range aligned with the Treble preset button', () => {
    const presets = getClefRangePresetRanges(fullRowData);

    expect(getTrebleClefPresetRange(fullRowData)).toEqual(presets.treble);
  });
});
