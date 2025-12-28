/**
 * @mlt/pitch-utils
 *
 * Shared pitch mapping utilities for Music Learning Tools.
 * Provides conversion between:
 * - Frequency (Hz) ↔ MIDI ↔ Cents
 * - Continuous pitch (from microphone) ↔ Grid Y position
 * - Pitch boundaries and threshold logic
 *
 * Reference: A4 = 440 Hz = MIDI 69
 *
 * PITCH GRID GEOMETRY (per Student Notation spec):
 * - The center of a row is the exact pitch
 * - Moving upward within the row represents positive cents deviation
 * - The top of the row is +100 cents (the adjacent semitone above)
 * - Moving downward within the row represents negative cents deviation
 * - The bottom of the row is -100 cents (but this overlaps with the row below)
 *
 * In Student Notation, rows use "dual overlapping" behavior:
 * - 50 cents above center = one-quarter of row height above center
 * - Each row represents ±50 cents around its center pitch
 */
// ============================================================================
// Constants
// ============================================================================
/** Reference frequency for A4 in Hz */
export const A4_FREQUENCY = 440;
/** MIDI number for A4 */
export const A4_MIDI = 69;
/** Number of cents in a semitone */
export const CENTS_PER_SEMITONE = 100;
/** Number of semitones in an octave */
export const SEMITONES_PER_OCTAVE = 12;
/** Minimum valid MIDI note (A0 on piano) */
export const MIDI_MIN = 21;
/** Maximum valid MIDI note (C8 on piano) */
export const MIDI_MAX = 108;
// ============================================================================
// Basic Conversions
// ============================================================================
/**
 * Convert frequency (Hz) to MIDI note number (continuous, can be fractional).
 *
 * @param frequency Frequency in Hz
 * @returns MIDI note number (can be fractional for microtones)
 *
 * @example
 * frequencyToMidi(440) // 69 (A4)
 * frequencyToMidi(466.16) // ~70 (Bb4)
 * frequencyToMidi(453.08) // ~69.5 (between A4 and Bb4)
 */
export function frequencyToMidi(frequency) {
    if (frequency <= 0) {
        return NaN;
    }
    return A4_MIDI + SEMITONES_PER_OCTAVE * Math.log2(frequency / A4_FREQUENCY);
}
/**
 * Convert MIDI note number to frequency (Hz).
 *
 * @param midi MIDI note number (can be fractional)
 * @returns Frequency in Hz
 *
 * @example
 * midiToFrequency(69) // 440 (A4)
 * midiToFrequency(60) // ~261.63 (C4)
 * midiToFrequency(69.5) // ~452.89 (between A4 and Bb4)
 */
export function midiToFrequency(midi) {
    return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}
/**
 * Convert frequency to cents offset from a reference frequency.
 *
 * @param frequency The frequency to measure
 * @param reference The reference frequency
 * @returns Cents offset (positive = sharp, negative = flat)
 *
 * @example
 * frequencyToCents(440, 440) // 0
 * frequencyToCents(466.16, 440) // ~100 (one semitone up)
 * frequencyToCents(453.08, 440) // ~50 (50 cents sharp)
 */
export function frequencyToCents(frequency, reference) {
    if (frequency <= 0 || reference <= 0) {
        return NaN;
    }
    return 1200 * Math.log2(frequency / reference);
}
/**
 * Convert cents offset to frequency ratio.
 *
 * @param cents Cents offset
 * @returns Frequency ratio (multiply reference frequency by this)
 *
 * @example
 * centsToRatio(100) // ~1.0595 (one semitone up)
 * centsToRatio(-100) // ~0.9439 (one semitone down)
 */
export function centsToRatio(cents) {
    return Math.pow(2, cents / 1200);
}
/**
 * Get cents offset from the nearest semitone.
 *
 * @param midi Continuous MIDI number
 * @returns Cents offset from nearest integer MIDI (-50 to +50)
 *
 * @example
 * getCentsOffset(69.0) // 0
 * getCentsOffset(69.25) // 25
 * getCentsOffset(69.75) // -25 (closer to 70)
 */
export function getCentsOffset(midi) {
    const nearestMidi = Math.round(midi);
    const cents = (midi - nearestMidi) * CENTS_PER_SEMITONE;
    return cents;
}
/**
 * Get the nearest integer MIDI note.
 *
 * @param midi Continuous MIDI number
 * @returns Nearest integer MIDI note
 */
export function getNearestMidi(midi) {
    return Math.round(midi);
}
/**
 * Calculate the Y position in a pitch grid for a continuous MIDI value.
 *
 * The grid is laid out with higher pitches at the top (lower Y values).
 * Each semitone row has a height of: gridHeight / (topMidi - bottomMidi + 1)
 *
 * Within a row:
 * - Row center = exact pitch (0 cents offset)
 * - Top of row = +50 cents (halfway to next semitone)
 * - Bottom of row = -50 cents (halfway to previous semitone)
 *
 * @param midi Continuous MIDI value
 * @param config Grid configuration
 * @returns Y position in pixels (0 = top)
 */
export function midiToGridY(midi, config) {
    const { topMidi, bottomMidi, gridHeight } = config;
    const totalSemitones = topMidi - bottomMidi + 1;
    const rowHeight = gridHeight / totalSemitones;
    // Position relative to top (inverted because Y increases downward)
    // topMidi is at Y=0, bottomMidi is at Y=gridHeight
    const semitonesFromTop = topMidi - midi;
    // Y position: each semitone from top adds rowHeight
    // The row center is at (rowIndex + 0.5) * rowHeight
    // For continuous MIDI, we use the fractional part to position within row
    return semitonesFromTop * rowHeight;
}
/**
 * Calculate the continuous MIDI value from a Y position in the grid.
 *
 * @param y Y position in pixels
 * @param config Grid configuration
 * @returns Continuous MIDI value
 */
export function gridYToMidi(y, config) {
    const { topMidi, bottomMidi, gridHeight } = config;
    const totalSemitones = topMidi - bottomMidi + 1;
    const rowHeight = gridHeight / totalSemitones;
    const semitonesFromTop = y / rowHeight;
    return topMidi - semitonesFromTop;
}
/**
 * Get the Y position of a row center for a given MIDI note.
 *
 * @param midi Integer MIDI note
 * @param config Grid configuration
 * @returns Y position of row center in pixels
 */
export function getMidiRowCenterY(midi, config) {
    const { topMidi, bottomMidi, gridHeight } = config;
    const totalSemitones = topMidi - bottomMidi + 1;
    const rowHeight = gridHeight / totalSemitones;
    const rowIndex = topMidi - midi;
    return (rowIndex + 0.5) * rowHeight;
}
/**
 * Get the row height for the grid configuration.
 *
 * @param config Grid configuration
 * @returns Row height in pixels
 */
export function getRowHeight(config) {
    const { topMidi, bottomMidi, gridHeight } = config;
    return gridHeight / (topMidi - bottomMidi + 1);
}
// ============================================================================
// Pitch Accuracy and Thresholds
// ============================================================================
/**
 * Check if a sung pitch is within threshold of a target pitch.
 *
 * @param sungMidi The sung MIDI value (continuous)
 * @param targetMidi The target MIDI value (integer)
 * @param thresholdCents Acceptable deviation in cents
 * @returns True if within threshold
 *
 * @example
 * isPitchAccurate(69.1, 69, 25) // true (10 cents off, within 25)
 * isPitchAccurate(69.4, 69, 25) // false (40 cents off, outside 25)
 */
export function isPitchAccurate(sungMidi, targetMidi, thresholdCents) {
    const centsOff = Math.abs(sungMidi - targetMidi) * CENTS_PER_SEMITONE;
    return centsOff <= thresholdCents;
}
/**
 * Get a normalized accuracy score (0 to 1) for how close a sung pitch is to target.
 *
 * @param sungMidi The sung MIDI value
 * @param targetMidi The target MIDI value
 * @param maxDeviationCents Maximum deviation for score=0 (default: 100 = one semitone)
 * @returns Accuracy score (1 = perfect, 0 = at or beyond max deviation)
 */
export function getPitchAccuracyScore(sungMidi, targetMidi, maxDeviationCents = CENTS_PER_SEMITONE) {
    const centsOff = Math.abs(sungMidi - targetMidi) * CENTS_PER_SEMITONE;
    return Math.max(0, 1 - centsOff / maxDeviationCents);
}
/**
 * Get the signed cents deviation from a target pitch.
 *
 * @param sungMidi The sung MIDI value
 * @param targetMidi The target MIDI value
 * @returns Cents deviation (positive = sharp, negative = flat)
 */
export function getCentsDeviation(sungMidi, targetMidi) {
    return (sungMidi - targetMidi) * CENTS_PER_SEMITONE;
}
// ============================================================================
// Pitch Names
// ============================================================================
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/**
 * Get the note name from a MIDI number.
 *
 * @param midi MIDI note number
 * @param preferFlats Use flat names instead of sharp names
 * @returns Note name with octave (e.g., "C4", "Bb3")
 */
export function midiToNoteName(midi, preferFlats = false) {
    const intMidi = Math.round(midi);
    const noteIndex = ((intMidi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
    const octave = Math.floor(intMidi / SEMITONES_PER_OCTAVE) - 1;
    const names = preferFlats ? NOTE_NAMES_FLAT : NOTE_NAMES;
    return `${names[noteIndex]}${octave}`;
}
/**
 * Get the pitch class (0-11, C=0) from a MIDI number.
 *
 * @param midi MIDI note number
 * @returns Pitch class (0-11)
 */
export function midiToPitchClass(midi) {
    return ((Math.round(midi) % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
}
/**
 * Get the octave number from a MIDI number.
 *
 * @param midi MIDI note number
 * @returns Octave number
 */
export function midiToOctave(midi) {
    return Math.floor(Math.round(midi) / SEMITONES_PER_OCTAVE) - 1;
}
// ============================================================================
// Frequency from Microphone Helpers
// ============================================================================
/**
 * Process a raw frequency from microphone input.
 * Clamps to reasonable singing range and handles edge cases.
 *
 * @param frequency Raw frequency in Hz
 * @param minHz Minimum valid frequency (default: 60 Hz, ~B1)
 * @param maxHz Maximum valid frequency (default: 1600 Hz, ~G6)
 * @returns Processed frequency or null if invalid/out of range
 */
export function processRawFrequency(frequency, minHz = 60, maxHz = 1600) {
    if (!Number.isFinite(frequency) || frequency <= 0) {
        return null;
    }
    if (frequency < minHz || frequency > maxHz) {
        return null;
    }
    return frequency;
}
/**
 * Convert a frequency to full pitch information.
 *
 * @param frequency Frequency in Hz
 * @returns Pitch information object
 */
export function frequencyToPitchInfo(frequency) {
    const midi = frequencyToMidi(frequency);
    const nearestMidi = getNearestMidi(midi);
    const centsOffset = getCentsOffset(midi);
    return {
        frequency,
        midi,
        nearestMidi,
        centsOffset,
        noteName: midiToNoteName(nearestMidi),
        pitchClass: midiToPitchClass(nearestMidi),
        octave: midiToOctave(nearestMidi),
    };
}
