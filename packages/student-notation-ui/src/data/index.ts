/**
 * Data Module
 *
 * Barrel export for static data definitions.
 */

export {
  // Types
  type HarmonyChordShapes,
  type IntervalShapes,

  // Chord shape definitions
  BASIC_CHORD_SHAPES,
  ADVANCED_CHORD_SHAPES,
  CHORD_SHAPES,
  INTERVAL_SHAPES,
  OCTAVE_EQUIVALENCE,

  // Utility functions
  normalizeInterval,
  getAllChordSymbols,
  getChordIntervals,
  isBasicChord,
  isAdvancedChord
} from './chordDefinitions.ts';
