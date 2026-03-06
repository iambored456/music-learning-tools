import { midiToFrequency, midiToNoteName } from '@mlt/pitch-utils';
import { PITCH_CLASS_COLORS } from '@mlt/pitch-data';

export const MIN_MIDI = -48; // C-5, ~0.51 Hz
export const MAX_MIDI = 136; // E10, ~21,096 Hz

export const RHYTHM_MAX_HZ  = 20;
export const TIMBRE_MIN_HZ  = 4000;
export const HEARING_MAX_HZ = 20000;

export type Region = 'rhythm' | 'pitch' | 'timbre';

export interface ExtendedPitch {
  midi: number;
  frequency: number;
  /** Flat-preferred note name, e.g. "Bb4", "C-5", "E10" */
  noteName: string;
  /** Two-column pitch parity used by Student Notation legends. */
  column: 'A' | 'B';
  pitchClass: number;   // 0–11 (C = 0)
  isAccidental: boolean;
  octave: number;
  /** Hex color from PITCH_CLASS_COLORS */
  color: string;
  /** Dominant perceptual region */
  region: Region;
  /** CSS "r, g, b" string for the 6px region indicator strip */
  stripRgb: string;
}

/** S-curve interpolation — no discontinuities at edges */
function smoothstep(lo: number, hi: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

/** Region reference colors (RGB):
 *  Rhythm  → warm amber   rgb(210,  80, 40)
 *  Pitch   → green        rgb( 60, 180, 100)
 *  Timbre  → blue         rgb( 40, 140, 220)
 */
function stripRgbFor(frequency: number): string {
  // rhythmBlend: 1 at very low Hz, fades to 0 between 10–40 Hz
  const rhythmBlend = 1 - smoothstep(10, 40, frequency);
  // timbreBlend: 0 in mid range, rises to 1 between 2 kHz–8 kHz
  const timbreBlend = smoothstep(2000, 8000, frequency);
  const pitchBlend  = Math.max(0, 1 - rhythmBlend - timbreBlend);

  const r = Math.round(210 * rhythmBlend +  60 * pitchBlend +  40 * timbreBlend);
  const g = Math.round( 80 * rhythmBlend + 180 * pitchBlend + 140 * timbreBlend);
  const b = Math.round( 40 * rhythmBlend + 100 * pitchBlend + 220 * timbreBlend);
  return `${r}, ${g}, ${b}`;
}

function regionFor(frequency: number): Region {
  if (frequency < RHYTHM_MAX_HZ)  return 'rhythm';
  if (frequency < TIMBRE_MIN_HZ)  return 'pitch';
  return 'timbre';
}

const ACCIDENTAL_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

function getOffsetColumn(midi: number): 'A' | 'B' {
  const parity = ((midi % 2) + 2) % 2;
  return parity === 0 ? 'A' : 'B';
}

/** 185 pitches from E10 (MIDI 136) down to C-5 (MIDI -48), sorted high→low. */
export const extendedPitches: ExtendedPitch[] = (() => {
  const result: ExtendedPitch[] = [];
  for (let midi = MAX_MIDI; midi >= MIN_MIDI; midi--) {
    const frequency = midiToFrequency(midi);
    const pitchClass = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const noteName = midiToNoteName(midi, true); // flat-preferred
    const isAccidental = ACCIDENTAL_PITCH_CLASSES.has(pitchClass);
    const color = PITCH_CLASS_COLORS[pitchClass];

    result.push({
      midi,
      frequency,
      noteName,
      column: getOffsetColumn(midi),
      pitchClass,
      isAccidental,
      octave,
      color,
      region: regionFor(frequency),
      stripRgb: stripRgbFor(frequency),
    });
  }
  return result;
})();
