/**
 * Chord Definitions
 *
 * Static data for chord shapes, intervals, and octave equivalence mappings.
 * These definitions are used by the tool selector and harmony components.
 */

export type HarmonyChordShapes = Record<string, string[]>;
export type OptionalChordIntervals = Record<string, string[]>;
export type IntervalShapes = Record<string, string[]>;

/**
 * Basic chord shapes with intervals.
 * Keys are chord symbols, values are arrays of interval names.
 */
export const BASIC_CHORD_SHAPES: HarmonyChordShapes = {
  'X':       ['1P', '3M', '5P'],           // Major triad
  'x':       ['1P', '3m', '5P'],           // Minor triad
  'xo':      ['1P', '3m', '5d'],           // Diminished triad
  'X+':      ['1P', '3M', '5A'],           // Augmented triad
  'X7':      ['1P', '3M', '5P', '7m'],     // Dominant 7
  'x7':      ['1P', '3m', '5P', '7m'],     // Minor 7
  'Xmaj7':   ['1P', '3M', '5P', '7M'],     // Major 7
  'x∅7':     ['1P', '3m', '5d', '7m'],     // Half-diminished 7
  'xo7':     ['1P', '3m', '5d', '6M'],     // Fully diminished 7
  'X6':      ['1P', '3M', '5P', '6M'],     // Major 6 (add 6)
  'Xsus2':   ['1P', '2M', '5P'],           // Suspended 2
  'Xsus4':   ['1P', '4P', '5P']            // Suspended 4
};

/**
 * Advanced chord shapes with intervals.
 * Extended harmony including 9ths, 11ths, 13ths, and altered chords.
 */
export const ADVANCED_CHORD_SHAPES: HarmonyChordShapes = {
  'xmaj7':     ['1P', '3m', '5P', '7M'],           // Minor-major 7
  'Xadd9':     ['1P', '3M', '5P', '9M'],           // Major add 9 (9th up an octave)
  'xadd9':     ['1P', '3m', '5P', '9M'],           // Minor add 9 (9th up an octave)
  'X6/9':      ['1P', '3M', '5P', '6M', '9M'],     // Major 6/9 (9th up an octave)
  'X9':        ['1P', '3M', '5P', '7m', '9M'],     // Dominant 9 (9th up an octave)
  'X11':       ['1P', '3M', '5P', '7m', '9M', '11P'], // Dominant 11 (9th and 11th up an octave)
  'X13':       ['1P', '3M', '5P', '7m', '9M', '11P', '13M'], // Dominant 13
  'Xmaj9':     ['1P', '3M', '5P', '7M', '9M'],     // Major 9 (9th up an octave)
  'x9':        ['1P', '3m', '5P', '7m', '9M'],     // Minor 9 (9th up an octave)
  'x6':        ['1P', '3m', '5P', '6M'],           // Minor 6
  'x11':       ['1P', '3m', '5P', '7m', '9M', '11P'], // Minor 11 (9th and 11th up an octave)
  'Xmaj7♯11':  ['1P', '3M', '5P', '7M', '9M', '11A'], // Major 7 sharp 11
  'X7♯5':      ['1P', '3M', '5A', '7m'],               // Dominant 7 sharp 5
  'Xmaj7♯5':   ['1P', '3M', '5A', '7M'],               // Major 7 sharp 5
  'X7♯9':      ['1P', '3M', '5P', '7m', '9A'],         // Dominant 7 sharp 9
  'Xmaj13':    ['1P', '3M', '5P', '7M', '9M', '11P', '13M'], // Major 13
  'Xmaj13♯11': ['1P', '3M', '5P', '7M', '9M', '11A', '13M'], // Major 13 sharp 11
  'x13':       ['1P', '3m', '5P', '7m', '9M', '11P', '13M'], // Minor 13
  'X13♭9':     ['1P', '3M', '5P', '7m', '9m', '13M'], // Dominant 13 flat 9
  'X7♭9':      ['1P', '3M', '5P', '7m', '9m']        // Dominant 7 flat 9
};

/**
 * Combined chord shapes used by the harmony UI.
 */
export const CHORD_SHAPES: HarmonyChordShapes = {
  ...BASIC_CHORD_SHAPES,
  ...ADVANCED_CHORD_SHAPES
};

/**
 * Intervals that sound by default but may be omitted without changing the
 * chord's essential identity. Keys match CHORD_SHAPES chord symbols.
 */
export const CHORD_OPTIONAL_INTERVALS: OptionalChordIntervals = {
  'X7': ['5P'],
  'x7': ['5P'],
  'Xmaj7': ['5P'],
  'xmaj7': ['5P'],
  'X6': ['5P'],
  'x6': ['5P'],
  'X9': ['5P'],
  'x9': ['5P'],
  'X6/9': ['5P'],
  'Xmaj9': ['5P'],
  'Xadd9': ['5P'],
  'xadd9': ['5P'],
  'X11': ['5P'],
  'x11': ['5P'],
  'X13': ['5P', '9M', '11P'],
  'Xmaj7♯11': ['5P', '9M'],
  'X7♯9': ['5P'],
  'Xmaj13': ['5P', '9M', '11P'],
  'Xmaj13♯11': ['5P'],
  'x13': ['5P', '9M'],
  'X13♭9': ['5P'],
  'X7♭9': ['5P']
};

/**
 * Interval mappings for the 4x4 interval grid.
 * Keys are interval abbreviations, values are interval name arrays.
 */
export const INTERVAL_SHAPES: IntervalShapes = {
  'M6':  ['6M'],       // Major 6th
  'A6':  ['6A'],       // Augmented 6th
  'm7':  ['7m'],       // Minor 7th
  'M7':  ['7M'],       // Major 7th
  'd5':  ['5d'],       // Diminished 5th (Tritone)
  'P5':  ['5P'],       // Perfect 5th
  'A5':  ['5A'],       // Augmented 5th
  'm6':  ['6m'],       // Minor 6th
  'm3':  ['3m'],       // Minor 3rd
  'M3':  ['3M'],       // Major 3rd
  'P4':  ['4P'],       // Perfect 4th
  'A4':  ['4A'],       // Augmented 4th (Tritone)
  'U':   ['1P'],       // Unison (Perfect 1st)
  'm2':  ['2m'],       // Minor 2nd
  'M2':  ['2M'],       // Major 2nd
  'A2':  ['2A']        // Augmented 2nd
};

/**
 * Octave equivalence mapping.
 * Maps extended intervals (9th, 11th, 13th) to their simple equivalents (2nd, 4th, 6th).
 */
export const OCTAVE_EQUIVALENCE: Record<string, string> = {
  '9m': '2m',   // Minor 9th → Minor 2nd
  '9M': '2M',   // Major 9th → Major 2nd
  '9A': '2A',   // Augmented 9th → Augmented 2nd
  '11P': '4P',  // Perfect 11th → Perfect 4th
  '11A': '4A',  // Augmented 11th → Augmented 4th
  '13m': '6m',  // Minor 13th → Minor 6th
  '13M': '6M',  // Major 13th → Major 6th
  '13A': '6A'   // Augmented 13th → Augmented 6th
};

/**
 * Normalizes an interval to its octave-simple form.
 * @param interval - Interval like "9M", "11P", "3M"
 * @returns Normalized interval like "2M", "4P", "3M"
 */
export function normalizeInterval(interval: string): string {
  return OCTAVE_EQUIVALENCE[interval] ?? interval;
}

/**
 * Get all chord symbols (names) from both basic and advanced shapes.
 */
export function getAllChordSymbols(): string[] {
  return Object.keys(CHORD_SHAPES);
}

/**
 * Get the intervals for a chord by symbol.
 * @param symbol - Chord symbol like "X", "x⁷", "Xmaj7"
 * @returns Array of intervals or undefined if not found
 */
export function getChordIntervals(symbol: string): string[] | undefined {
  return CHORD_SHAPES[symbol];
}

/**
 * Check if a chord symbol is a basic chord.
 */
export function isBasicChord(symbol: string): boolean {
  return symbol in BASIC_CHORD_SHAPES;
}

/**
 * Check if a chord symbol is an advanced chord.
 */
export function isAdvancedChord(symbol: string): boolean {
  return symbol in ADVANCED_CHORD_SHAPES;
}
