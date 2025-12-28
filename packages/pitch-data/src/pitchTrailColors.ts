/**
 * Pitch Trail Color Utilities
 *
 * Color interpolation system for real-time pitch visualization.
 * Extracted from amateur-singing-trainer for use across apps.
 *
 * Features:
 * - 12-color palette mapped to pitch classes (C through B)
 * - Continuous color interpolation based on fractional MIDI values
 * - Tonic-aware coloring (colors rotate based on selected key)
 */

// ============================================================================
// Types
// ============================================================================

export type RGB = [number, number, number];

export interface PitchTrailColorConfig {
  /** Current tonic pitch class (0-11, where C=0) */
  tonicPitchClass: number;
}

// ============================================================================
// Color Palette
// ============================================================================

/**
 * 12-color palette for pitch classes.
 * Maps to C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B
 *
 * These colors are designed to:
 * - Be visually distinct from each other
 * - Create smooth gradients when interpolated
 * - Work well on both light and dark backgrounds
 */
export const PITCH_CLASS_COLORS: readonly string[] = [
  '#ef8aab', // C  - Pink
  '#f48e7d', // C# - Coral
  '#e89955', // D  - Orange
  '#cdaa42', // D# - Gold
  '#a4ba57', // E  - Lime
  '#6ec482', // F  - Green
  '#2dc8b1', // F# - Teal
  '#16c3da', // G  - Cyan
  '#58b8f6', // G# - Sky Blue
  '#8fa9ff', // A  - Blue
  '#ba9bf2', // A# - Purple
  '#db8fd4', // B  - Magenta
] as const;

// ============================================================================
// Color Conversion Utilities
// ============================================================================

/**
 * Convert hex color string to RGB array.
 */
export function hexToRgb(hex: string): RGB {
  const bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/**
 * Convert RGB array to hex color string.
 */
export function rgbToHex(rgb: RGB): string {
  return (
    '#' +
    rgb
      .map((v) => {
        const clamped = Math.max(0, Math.min(255, Math.round(v)));
        return clamped.toString(16).padStart(2, '0');
      })
      .join('')
  );
}

/**
 * Interpolate between two RGB colors.
 *
 * @param c1 - Start color
 * @param c2 - End color
 * @param factor - Interpolation factor (0 = c1, 1 = c2)
 */
export function interpolateRgb(c1: RGB, c2: RGB, factor: number): RGB {
  const clampedFactor = Math.max(0, Math.min(1, factor));
  return c1.map((v, i) => Math.round(v + clampedFactor * (c2[i] - v))) as RGB;
}

// ============================================================================
// Pitch Color Functions
// ============================================================================

/**
 * Get the base color for a pitch class (0-11).
 *
 * @param pitchClass - Pitch class (0-11, where C=0)
 * @param tonicPitchClass - Optional tonic for relative coloring (default: 0 = C)
 * @returns Hex color string
 */
export function getPitchClassColor(pitchClass: number, tonicPitchClass = 0): string {
  const relativePitchClass = ((pitchClass - tonicPitchClass) % 12 + 12) % 12;
  return PITCH_CLASS_COLORS[relativePitchClass];
}

/**
 * Get an interpolated color for a continuous MIDI value.
 * This provides smooth color transitions between semitones.
 *
 * @param midiValue - MIDI note number (can be fractional for microtonal accuracy)
 * @param tonicPitchClass - Optional tonic for relative coloring (default: 0 = C)
 * @returns RGB color array
 */
export function getInterpolatedPitchColor(midiValue: number, tonicPitchClass = 0): RGB {
  const midiFloor = Math.floor(midiValue);
  const fraction = midiValue - midiFloor;

  // Calculate relative pitch classes (adjusted for tonic)
  const pitchClass = ((midiFloor % 12) - tonicPitchClass + 12) % 12;
  const nextPitchClass = (pitchClass + 1) % 12;

  // Get colors for current and next semitone
  const baseColor = hexToRgb(PITCH_CLASS_COLORS[pitchClass]);
  const nextColor = hexToRgb(PITCH_CLASS_COLORS[nextPitchClass]);

  // Interpolate based on the fractional part
  return interpolateRgb(baseColor, nextColor, fraction);
}

/**
 * Get an interpolated color as a hex string.
 *
 * @param midiValue - MIDI note number (can be fractional)
 * @param tonicPitchClass - Optional tonic for relative coloring (default: 0 = C)
 * @returns Hex color string
 */
export function getInterpolatedPitchColorHex(midiValue: number, tonicPitchClass = 0): string {
  return rgbToHex(getInterpolatedPitchColor(midiValue, tonicPitchClass));
}

/**
 * Get an RGBA color string for a pitch with opacity based on clarity.
 *
 * @param midiValue - MIDI note number (can be fractional)
 * @param clarity - Detection confidence (0-1)
 * @param tonicPitchClass - Optional tonic for relative coloring (default: 0 = C)
 * @param maxOpacity - Maximum opacity (default: 0.9)
 * @returns RGBA color string
 */
export function getPitchColorWithClarity(
  midiValue: number,
  clarity: number,
  tonicPitchClass = 0,
  maxOpacity = 0.9
): string {
  const rgb = getInterpolatedPitchColor(midiValue, tonicPitchClass);
  const opacity = Math.min(clarity * maxOpacity, 1);
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
}

// ============================================================================
// Tonic Utilities
// ============================================================================

/**
 * Map of note names to pitch classes.
 */
export const NOTE_TO_PITCH_CLASS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/**
 * Get pitch class from a note name string.
 *
 * @param noteName - Note name (e.g., "C", "F#", "Bb")
 * @returns Pitch class (0-11), or 0 if not recognized
 */
export function getTonicPitchClass(noteName: string): number {
  // Remove octave number if present
  const cleanName = noteName.replace(/\d+$/, '');
  return NOTE_TO_PITCH_CLASS[cleanName] ?? 0;
}
