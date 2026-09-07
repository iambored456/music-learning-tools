import { solfegeMidi, type SolfegeTuningMode } from './solfegeNotation.js';

const ASCENDING_MAJOR_OFFSETS: Readonly<Record<string, number>> = {
  Digit1: 0,
  Digit2: 2,
  Digit3: 4,
  Digit4: 5,
  Digit5: 7,
  Digit6: 9,
  Digit7: 11,
  Digit8: 12,
  Digit9: 14,
  Digit0: 16,
};

// Descend from the scale tone immediately below the speaking pitch.
const DESCENDING_MAJOR_OFFSETS: Readonly<Record<string, number>> = {
  KeyQ: -1,
  KeyW: -3,
  KeyE: -5,
  KeyR: -7,
  KeyT: -8,
  KeyY: -10,
  KeyU: -12,
  KeyI: -13,
  KeyO: -15,
  KeyP: -17,
};

const MAJOR_KEY_OFFSETS: Readonly<Record<string, number>> = {
  ...ASCENDING_MAJOR_OFFSETS,
  ...DESCENDING_MAJOR_OFFSETS,
};

export interface KeyboardDegreePitch {
  /** Integer equal-tempered row used by the grid and its tuning offsets. */
  rowMidi: number;
  /** Potentially fractional physical MIDI coordinate used by the synth. */
  playbackMidi: number;
}

export function getKeyboardMajorOffset(code: string): number | null {
  return MAJOR_KEY_OFFSETS[code] ?? null;
}

export function getKeyboardDegreePitch(
  code: string,
  speakingPitchMidi: number,
  tuning: SolfegeTuningMode,
): KeyboardDegreePitch | null {
  const offset = getKeyboardMajorOffset(code);
  if (offset === null || !Number.isFinite(speakingPitchMidi)) return null;

  const tonicMidi = Math.round(speakingPitchMidi);
  const rowMidi = tonicMidi + offset;
  if (rowMidi < 0 || rowMidi > 127) return null;

  return {
    rowMidi,
    playbackMidi: solfegeMidi(60 + offset, tonicMidi, tuning),
  };
}
