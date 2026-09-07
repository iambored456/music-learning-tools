import { describe, expect, it } from 'vitest';
import { getKeyboardDegreePitch, getKeyboardMajorOffset } from './keyboardShortcuts.js';

const ASCENDING_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
const ASCENDING_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
const ASCENDING_JUST_RATIOS = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2, 9 / 4, 5 / 2];

const DESCENDING_CODES = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
const DESCENDING_OFFSETS = [-1, -3, -5, -7, -8, -10, -12, -13, -15, -17];
const DESCENDING_JUST_RATIOS = [15 / 16, 5 / 6, 3 / 4, 2 / 3, 5 / 8, 9 / 16, 1 / 2, 15 / 32, 5 / 12, 3 / 8];

describe('Singing Trainer keyboard degree mapping', () => {
  it('maps the number row from the tonic through the tenth', () => {
    expect(ASCENDING_CODES.map(getKeyboardMajorOffset)).toEqual(ASCENDING_OFFSETS);
  });

  it('maps Q through P down the major scale beginning on degree seven', () => {
    expect(DESCENDING_CODES.map(getKeyboardMajorOffset)).toEqual(DESCENDING_OFFSETS);
  });

  it('uses equal-tempered semitones for every ascending and descending shortcut', () => {
    [...ASCENDING_CODES, ...DESCENDING_CODES].forEach((code, index) => {
      const offset = [...ASCENDING_OFFSETS, ...DESCENDING_OFFSETS][index]!;
      expect(getKeyboardDegreePitch(code, 60, 'equal')).toEqual({
        rowMidi: 60 + offset,
        playbackMidi: 60 + offset,
      });
    });
  });

  it('uses pure major ratios for every ascending shortcut in Just mode', () => {
    ASCENDING_CODES.forEach((code, index) => {
      const pitch = getKeyboardDegreePitch(code, 57, 'just');
      expect(pitch?.rowMidi).toBe(57 + ASCENDING_OFFSETS[index]!);
      expect(2 ** (((pitch?.playbackMidi ?? 57) - 57) / 12))
        .toBeCloseTo(ASCENDING_JUST_RATIOS[index]!, 10);
    });
  });

  it('uses reciprocal pure major ratios for every descending shortcut in Just mode', () => {
    DESCENDING_CODES.forEach((code, index) => {
      const pitch = getKeyboardDegreePitch(code, 57, 'just');
      expect(pitch?.rowMidi).toBe(57 + DESCENDING_OFFSETS[index]!);
      expect(2 ** (((pitch?.playbackMidi ?? 57) - 57) / 12))
        .toBeCloseTo(DESCENDING_JUST_RATIOS[index]!, 10);
    });
  });

  it('rejects unrelated keys and pitches outside MIDI range', () => {
    expect(getKeyboardDegreePitch('Escape', 60, 'equal')).toBeNull();
    expect(getKeyboardDegreePitch('KeyP', 10, 'equal')).toBeNull();
    expect(getKeyboardDegreePitch('Digit0', 120, 'equal')).toBeNull();
  });
});
