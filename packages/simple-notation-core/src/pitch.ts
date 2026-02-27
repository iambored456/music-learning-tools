import * as Tone from 'tone';

import { KEY_CODES, NOTE_BANK_DIATONIC_DEGREES } from './constants.js';
import { DRONE_OCTAVES, TONIC_VALUES, type TonicValue } from './types.js';

export function isValidTonic(value: string): value is TonicValue {
  return TONIC_VALUES.includes(value as TonicValue);
}

export function isValidOctave(value: number): boolean {
  return DRONE_OCTAVES.includes(value as (typeof DRONE_OCTAVES)[number]);
}

export function isValidFullNoteString(note: string): boolean {
  if (typeof note !== 'string') return false;

  const noteRegex = /^[A-G](?:#|b)?[0-8]$/;
  if (!noteRegex.test(note.trim())) return false;

  try {
    Tone.Frequency(note.trim()).toMidi();
    return true;
  } catch {
    return false;
  }
}

export function getPitchNameForDisplay(fullRootNote: string, intervalFromRootPitchClass: number): string | null {
  if (!isValidFullNoteString(fullRootNote)) return null;

  try {
    const rootMidi = Tone.Frequency(fullRootNote).toMidi();
    const targetMidi = rootMidi + intervalFromRootPitchClass;
    return Tone.Frequency(targetMidi, 'midi').toNote();
  } catch {
    return null;
  }
}

export type KeyboardNoteDetail = {
  interval: number;
  originalId: string;
};

export function getDiatonicNoteDetailsFromKeyboard(code: string): KeyboardNoteDetail | null {
  switch (code) {
    case KEY_CODES.DIGIT_1:
      return { interval: 0, originalId: '1' };
    case KEY_CODES.DIGIT_2:
      return { interval: 2, originalId: '2' };
    case KEY_CODES.DIGIT_3:
      return { interval: 4, originalId: '3' };
    case KEY_CODES.DIGIT_4:
      return { interval: 5, originalId: '4' };
    case KEY_CODES.DIGIT_5:
      return { interval: 7, originalId: '5' };
    case KEY_CODES.DIGIT_6:
      return { interval: 9, originalId: '6' };
    case KEY_CODES.DIGIT_7:
      return { interval: 11, originalId: '7' };
    case KEY_CODES.DIGIT_8:
      return { interval: 12, originalId: 'oct' };
    case KEY_CODES.DIGIT_9:
      return { interval: 14, originalId: '2' };
    case KEY_CODES.DIGIT_0:
      return { interval: 16, originalId: '3' };
    case KEY_CODES.MINUS:
      return { interval: 17, originalId: '4' };
    case KEY_CODES.EQUAL:
      return { interval: 19, originalId: '5' };
    default:
      return null;
  }
}

export function findNoteDefinitionById(id: string) {
  return NOTE_BANK_DIATONIC_DEGREES.find((item) => item.id === id || item.aliasId === id) ?? null;
}
