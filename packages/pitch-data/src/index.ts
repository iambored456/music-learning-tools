/**
 * @mlt/pitch-data
 *
 * Full pitch gamut data for Music Learning Tools.
 * Provides the 88-key piano range (C8 to A0) with:
 * - Pitch names (flat, sharp, combined)
 * - Frequencies in Hz
 * - Colors for visualization
 * - Tone.js compatible note names
 */

export { fullRowData } from './pitchData.js';
export {
  // Lookup functions
  getPitchByToneNote,
  getPitchByIndex,
  getPitchIndex,
  getPitchByMidi,
  getMidiFromToneNote,
  // Range resolution
  resolvePitchRange,
  getRowDataForRange,
  generateRowDataForMidiRange,
  // MIDI range helpers
  getMidiRangeFromToneNotes,
  getToneNotesFromMidiRange,
  expandMidiRange,
  shiftMidiRange,
  getMidiRangeSpan,
  isMidiInRange,
  clampMidiToRange,
  getMidiRangeFromPreset,
  // Presets
  PITCH_RANGES,
} from './pitchUtils.js';

// Pitch trail color utilities
export {
  // Color palette
  PITCH_CLASS_COLORS,
  // Color conversion
  hexToRgb,
  rgbToHex,
  interpolateRgb,
  // Pitch color functions
  getPitchClassColor,
  getInterpolatedPitchColor,
  getInterpolatedPitchColorHex,
  getPitchColorWithClarity,
  // Tonic utilities
  NOTE_TO_PITCH_CLASS,
  getTonicPitchClass,
} from './pitchTrailColors.js';

// Re-export types
export type { PitchRowData } from '@mlt/types';
export type { MidiRange, PitchRangePreset } from './pitchUtils.js';
export type { RGB, PitchTrailColorConfig } from './pitchTrailColors.js';
