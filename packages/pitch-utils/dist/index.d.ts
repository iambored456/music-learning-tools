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
/** Reference frequency for A4 in Hz */
export declare const A4_FREQUENCY = 440;
/** MIDI number for A4 */
export declare const A4_MIDI = 69;
/** Number of cents in a semitone */
export declare const CENTS_PER_SEMITONE = 100;
/** Number of semitones in an octave */
export declare const SEMITONES_PER_OCTAVE = 12;
/** Minimum valid MIDI note (A0 on piano) */
export declare const MIDI_MIN = 21;
/** Maximum valid MIDI note (C8 on piano) */
export declare const MIDI_MAX = 108;
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
export declare function frequencyToMidi(frequency: number): number;
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
export declare function midiToFrequency(midi: number): number;
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
export declare function frequencyToCents(frequency: number, reference: number): number;
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
export declare function centsToRatio(cents: number): number;
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
export declare function getCentsOffset(midi: number): number;
/**
 * Get the nearest integer MIDI note.
 *
 * @param midi Continuous MIDI number
 * @returns Nearest integer MIDI note
 */
export declare function getNearestMidi(midi: number): number;
/**
 * Configuration for pitch grid mapping.
 */
export interface PitchGridConfig {
    /** MIDI number at the top of the visible grid */
    topMidi: number;
    /** MIDI number at the bottom of the visible grid */
    bottomMidi: number;
    /** Total height of the grid in pixels */
    gridHeight: number;
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
export declare function midiToGridY(midi: number, config: PitchGridConfig): number;
/**
 * Calculate the continuous MIDI value from a Y position in the grid.
 *
 * @param y Y position in pixels
 * @param config Grid configuration
 * @returns Continuous MIDI value
 */
export declare function gridYToMidi(y: number, config: PitchGridConfig): number;
/**
 * Get the Y position of a row center for a given MIDI note.
 *
 * @param midi Integer MIDI note
 * @param config Grid configuration
 * @returns Y position of row center in pixels
 */
export declare function getMidiRowCenterY(midi: number, config: PitchGridConfig): number;
/**
 * Get the row height for the grid configuration.
 *
 * @param config Grid configuration
 * @returns Row height in pixels
 */
export declare function getRowHeight(config: PitchGridConfig): number;
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
export declare function isPitchAccurate(sungMidi: number, targetMidi: number, thresholdCents: number): boolean;
/**
 * Get a normalized accuracy score (0 to 1) for how close a sung pitch is to target.
 *
 * @param sungMidi The sung MIDI value
 * @param targetMidi The target MIDI value
 * @param maxDeviationCents Maximum deviation for score=0 (default: 100 = one semitone)
 * @returns Accuracy score (1 = perfect, 0 = at or beyond max deviation)
 */
export declare function getPitchAccuracyScore(sungMidi: number, targetMidi: number, maxDeviationCents?: number): number;
/**
 * Get the signed cents deviation from a target pitch.
 *
 * @param sungMidi The sung MIDI value
 * @param targetMidi The target MIDI value
 * @returns Cents deviation (positive = sharp, negative = flat)
 */
export declare function getCentsDeviation(sungMidi: number, targetMidi: number): number;
/**
 * Get the note name from a MIDI number.
 *
 * @param midi MIDI note number
 * @param preferFlats Use flat names instead of sharp names
 * @returns Note name with octave (e.g., "C4", "Bb3")
 */
export declare function midiToNoteName(midi: number, preferFlats?: boolean): string;
/**
 * Get the pitch class (0-11, C=0) from a MIDI number.
 *
 * @param midi MIDI note number
 * @returns Pitch class (0-11)
 */
export declare function midiToPitchClass(midi: number): number;
/**
 * Get the octave number from a MIDI number.
 *
 * @param midi MIDI note number
 * @returns Octave number
 */
export declare function midiToOctave(midi: number): number;
/**
 * Process a raw frequency from microphone input.
 * Clamps to reasonable singing range and handles edge cases.
 *
 * @param frequency Raw frequency in Hz
 * @param minHz Minimum valid frequency (default: 60 Hz, ~B1)
 * @param maxHz Maximum valid frequency (default: 1600 Hz, ~G6)
 * @returns Processed frequency or null if invalid/out of range
 */
export declare function processRawFrequency(frequency: number, minHz?: number, maxHz?: number): number | null;
/**
 * Convert a frequency to full pitch information.
 *
 * @param frequency Frequency in Hz
 * @returns Pitch information object
 */
export declare function frequencyToPitchInfo(frequency: number): {
    frequency: number;
    midi: number;
    nearestMidi: number;
    centsOffset: number;
    noteName: string;
    pitchClass: number;
    octave: number;
};
//# sourceMappingURL=index.d.ts.map