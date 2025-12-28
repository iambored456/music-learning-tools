/**
 * Pitch Data Utilities
 *
 * Helper functions for working with the full pitch gamut.
 */
import type { PitchRowData } from '@mlt/types';
import { fullRowData } from './pitchData.js';

// Pre-build lookup maps for O(1) access
const toneNoteToIndex = new Map<string, number>();
const midiToIndex = new Map<number, number>();

fullRowData.forEach((row, index) => {
  toneNoteToIndex.set(row.toneNote, index);
  if (row.midi !== undefined) {
    midiToIndex.set(row.midi, index);
  }
});

/**
 * Get pitch row data by Tone.js note name (e.g., 'C4', 'Bb5')
 */
export function getPitchByToneNote(toneNote: string): PitchRowData | undefined {
  const index = toneNoteToIndex.get(toneNote);
  return index !== undefined ? fullRowData[index] : undefined;
}

/**
 * Get pitch row data by index in fullRowData (0 = C8, 87 = A0)
 */
export function getPitchByIndex(index: number): PitchRowData | undefined {
  return fullRowData[index];
}

/**
 * Get the index of a pitch by its Tone.js note name
 */
export function getPitchIndex(toneNote: string): number {
  return toneNoteToIndex.get(toneNote) ?? -1;
}

/**
 * Get pitch row data by MIDI note number (21-108)
 */
export function getPitchByMidi(midi: number): PitchRowData | undefined {
  const index = midiToIndex.get(midi);
  return index !== undefined ? fullRowData[index] : undefined;
}

/**
 * Get MIDI note number from Tone.js note name
 */
export function getMidiFromToneNote(toneNote: string): number | undefined {
  const pitch = getPitchByToneNote(toneNote);
  return pitch?.midi;
}

/**
 * Resolve pitch range from Tone.js note names
 * Returns start/end indices in fullRowData (topIndex < bottomIndex since C8 is index 0)
 */
export function resolvePitchRange(
  topToneNote: string,
  bottomToneNote: string
): { topIndex: number; bottomIndex: number } | null {
  const topIndex = getPitchIndex(topToneNote);
  const bottomIndex = getPitchIndex(bottomToneNote);

  if (topIndex === -1 || bottomIndex === -1) {
    return null;
  }

  return {
    topIndex: Math.min(topIndex, bottomIndex),
    bottomIndex: Math.max(topIndex, bottomIndex),
  };
}

/**
 * Get a slice of row data for a specific pitch range
 * @param topToneNote - Highest pitch (e.g., 'C6')
 * @param bottomToneNote - Lowest pitch (e.g., 'C3')
 */
export function getRowDataForRange(
  topToneNote: string,
  bottomToneNote: string
): PitchRowData[] {
  const range = resolvePitchRange(topToneNote, bottomToneNote);
  if (!range) return [];
  return fullRowData.slice(range.topIndex, range.bottomIndex + 1);
}

/**
 * Generate row data for a MIDI range (useful for singing trainer)
 * @param minMidi - Lowest MIDI note (e.g., 48 for C3)
 * @param maxMidi - Highest MIDI note (e.g., 84 for C6)
 */
export function generateRowDataForMidiRange(
  minMidi: number,
  maxMidi: number
): PitchRowData[] {
  const rows: PitchRowData[] = [];

  // Iterate from high to low (fullRowData order is C8 to A0)
  for (let midi = maxMidi; midi >= minMidi; midi--) {
    const pitch = getPitchByMidi(midi);
    if (pitch) {
      rows.push(pitch);
    }
  }

  return rows;
}

// ============================================================================
// MIDI Range Helpers
// ============================================================================

/**
 * A MIDI range representing a span of pitches.
 */
export interface MidiRange {
  /** Lowest MIDI note number */
  minMidi: number;
  /** Highest MIDI note number */
  maxMidi: number;
}

/**
 * Get MIDI range from Tone.js note names.
 * @param lowNote - Lower pitch (e.g., 'C3')
 * @param highNote - Higher pitch (e.g., 'C5')
 * @returns MidiRange or null if notes are invalid
 *
 * @example
 * getMidiRangeFromToneNotes('C3', 'C5') // { minMidi: 48, maxMidi: 72 }
 * getMidiRangeFromToneNotes('A2', 'A4') // { minMidi: 45, maxMidi: 69 }
 */
export function getMidiRangeFromToneNotes(
  lowNote: string,
  highNote: string
): MidiRange | null {
  const lowMidi = getMidiFromToneNote(lowNote);
  const highMidi = getMidiFromToneNote(highNote);

  if (lowMidi === undefined || highMidi === undefined) {
    return null;
  }

  return {
    minMidi: Math.min(lowMidi, highMidi),
    maxMidi: Math.max(lowMidi, highMidi),
  };
}

/**
 * Get Tone.js note names from a MIDI range.
 * @param range - MIDI range object
 * @returns Object with lowNote and highNote, or null if invalid
 *
 * @example
 * getToneNotesFromMidiRange({ minMidi: 48, maxMidi: 72 }) // { lowNote: 'C3', highNote: 'C5' }
 */
export function getToneNotesFromMidiRange(
  range: MidiRange
): { lowNote: string; highNote: string } | null {
  const lowPitch = getPitchByMidi(range.minMidi);
  const highPitch = getPitchByMidi(range.maxMidi);

  if (!lowPitch || !highPitch) {
    return null;
  }

  return {
    lowNote: lowPitch.toneNote,
    highNote: highPitch.toneNote,
  };
}

/**
 * Expand a MIDI range by a number of semitones in each direction.
 * Clamps to valid piano range (21-108).
 *
 * @example
 * expandMidiRange({ minMidi: 48, maxMidi: 72 }, 12) // { minMidi: 36, maxMidi: 84 }
 */
export function expandMidiRange(range: MidiRange, semitones: number): MidiRange {
  return {
    minMidi: Math.max(21, range.minMidi - semitones),
    maxMidi: Math.min(108, range.maxMidi + semitones),
  };
}

/**
 * Shift a MIDI range up or down by a number of semitones.
 * Clamps to valid piano range (21-108).
 *
 * @example
 * shiftMidiRange({ minMidi: 48, maxMidi: 72 }, 12)  // { minMidi: 60, maxMidi: 84 }
 * shiftMidiRange({ minMidi: 48, maxMidi: 72 }, -12) // { minMidi: 36, maxMidi: 60 }
 */
export function shiftMidiRange(range: MidiRange, semitones: number): MidiRange {
  const newMin = range.minMidi + semitones;
  const newMax = range.maxMidi + semitones;

  // Clamp to valid range while maintaining the span
  if (newMin < 21) {
    const adjustment = 21 - newMin;
    return { minMidi: 21, maxMidi: newMax + adjustment };
  }
  if (newMax > 108) {
    const adjustment = newMax - 108;
    return { minMidi: newMin - adjustment, maxMidi: 108 };
  }

  return { minMidi: newMin, maxMidi: newMax };
}

/**
 * Get the number of semitones (pitches) in a MIDI range.
 *
 * @example
 * getMidiRangeSpan({ minMidi: 48, maxMidi: 72 }) // 25 (includes both endpoints)
 */
export function getMidiRangeSpan(range: MidiRange): number {
  return range.maxMidi - range.minMidi + 1;
}

/**
 * Check if a MIDI note is within a range.
 *
 * @example
 * isMidiInRange(60, { minMidi: 48, maxMidi: 72 }) // true
 * isMidiInRange(36, { minMidi: 48, maxMidi: 72 }) // false
 */
export function isMidiInRange(midi: number, range: MidiRange): boolean {
  return midi >= range.minMidi && midi <= range.maxMidi;
}

/**
 * Clamp a MIDI note to be within a range.
 *
 * @example
 * clampMidiToRange(36, { minMidi: 48, maxMidi: 72 }) // 48
 * clampMidiToRange(60, { minMidi: 48, maxMidi: 72 }) // 60
 * clampMidiToRange(84, { minMidi: 48, maxMidi: 72 }) // 72
 */
export function clampMidiToRange(midi: number, range: MidiRange): number {
  return Math.max(range.minMidi, Math.min(range.maxMidi, midi));
}

// ============================================================================
// Preset Pitch Ranges
// ============================================================================

/**
 * Common pitch ranges for different voice types and instruments.
 * Each range includes MIDI numbers and Tone.js note names.
 */
export const PITCH_RANGES = {
  /** Full 88-key piano range */
  PIANO: { minMidi: 21, maxMidi: 108, lowNote: 'A0', highNote: 'C8' },
  /** Typical soprano voice range */
  SOPRANO: { minMidi: 60, maxMidi: 84, lowNote: 'C4', highNote: 'C6' },
  /** Typical alto voice range */
  ALTO: { minMidi: 53, maxMidi: 77, lowNote: 'F3', highNote: 'F5' },
  /** Typical tenor voice range */
  TENOR: { minMidi: 48, maxMidi: 72, lowNote: 'C3', highNote: 'C5' },
  /** Typical bass voice range */
  BASS: { minMidi: 40, maxMidi: 64, lowNote: 'E2', highNote: 'E4' },
  /** General singing range (covers most voices) */
  SINGING: { minMidi: 48, maxMidi: 84, lowNote: 'C3', highNote: 'C6' },
  /** Comfortable speaking range */
  SPEAKING: { minMidi: 55, maxMidi: 70, lowNote: 'G3', highNote: 'Bb4' },
  /** Extended vocal range (trained singers) */
  EXTENDED_VOCAL: { minMidi: 36, maxMidi: 96, lowNote: 'C2', highNote: 'C7' },
} as const;

/** Type for preset range keys */
export type PitchRangePreset = keyof typeof PITCH_RANGES;

/**
 * Get a MidiRange from a preset name.
 *
 * @example
 * getMidiRangeFromPreset('TENOR') // { minMidi: 48, maxMidi: 72 }
 */
export function getMidiRangeFromPreset(preset: PitchRangePreset): MidiRange {
  const range = PITCH_RANGES[preset];
  return { minMidi: range.minMidi, maxMidi: range.maxMidi };
}
