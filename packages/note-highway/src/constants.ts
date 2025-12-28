/**
 * @mlt/note-highway - Default Configuration Constants
 */

import type {
  HighwayViewport,
  ScrollConfig,
  JudgmentLineConfig,
  InputCursorConfig,
  InputTrailConfig,
  NoteRenderConfig,
  GridRenderConfig,
  TonicIndicatorConfig,
  HighwayConfig,
} from './types.js';

// ============================================================================
// Viewport Defaults
// ============================================================================

export const DEFAULT_VIEWPORT: HighwayViewport = {
  width: 800,
  height: 400,
  minMidi: 48, // C3
  maxMidi: 72, // C5
  pitchMarginSemitones: 3,
};

// ============================================================================
// Scroll Defaults
// ============================================================================

export const DEFAULT_SCROLL_CONFIG: ScrollConfig = {
  measuresVisibleAhead: 2,
  msVisibleAhead: 4000,  // Will be calculated from measures
  msVisibleBehind: 1000, // 1 second of past notes visible
  pixelsPerMs: 0.2,      // Will be calculated
  measureDurationMs: 2000, // Will be set from chart
};

// ============================================================================
// Judgment Line Defaults
// ============================================================================

export const DEFAULT_JUDGMENT_LINE_CONFIG: JudgmentLineConfig = {
  xPositionFraction: 0.25, // Left quarter of viewport
  color: '#ffffff',
  lineWidth: 3,
  showGlow: true,
  glowColorSuccess: '#4ade80', // Green
  glowColorFailure: '#f87171', // Red
  glowRadius: 15,
};

// ============================================================================
// Input Cursor Defaults
// ============================================================================

export const DEFAULT_INPUT_CURSOR_CONFIG: InputCursorConfig = {
  radius: 12,
  showDeviationIndicator: true,
  maxDeviationCents: 100,
  colorInTolerance: '#4ade80',  // Green
  colorOutOfTolerance: '#f87171', // Red
  colorUnvoiced: '#6b7280', // Gray
};

// ============================================================================
// Input Trail Defaults
// ============================================================================

export const DEFAULT_INPUT_TRAIL_CONFIG: InputTrailConfig = {
  trailDurationMs: 4000,
  pointRadius: 8,
  clarityThreshold: 0.5,
  showConnections: true,
  connectionThreshold: 50, // Max pixels between connected points
  connectionLineWidth: 2,
  connectionColor: 'rgba(255, 255, 255, 0.3)',
  maxOpacity: 0.9,
};

// ============================================================================
// Note Render Defaults
// ============================================================================

export const DEFAULT_NOTE_RENDER_CONFIG: NoteRenderConfig = {
  glyphStyle: 'stadium',
  noteHeight: 20,
  stadiumRadius: 10,
  passedNoteOpacity: 0.4,
  upcomingNoteOpacity: 0.9,
  activeNoteOpacity: 1.0,
  showLabels: false,
  borderWidth: 2,
  borderColor: 'rgba(0, 0, 0, 0.3)',
};

// ============================================================================
// Grid Render Defaults
// ============================================================================

export const DEFAULT_GRID_RENDER_CONFIG: GridRenderConfig = {
  microbeatColor: 'rgba(255, 255, 255, 0.1)',
  macrobeatColor: 'rgba(255, 255, 255, 0.25)',
  measureColor: 'rgba(255, 255, 255, 0.5)',
  microbeatWidth: 1,
  macrobeatWidth: 1,
  measureWidth: 2,
  showMicrobeats: false, // Usually too dense
  showMacrobeats: true,
  showMeasures: true,
  pitchRowColor: 'rgba(255, 255, 255, 0.05)',
  pitchRowWidth: 1,
  showPitchRows: true,
};

// ============================================================================
// Tonic Indicator Defaults
// ============================================================================

export const DEFAULT_TONIC_INDICATOR_CONFIG: TonicIndicatorConfig = {
  enabled: true,
  highlightColor: '#fbbf24', // Amber
  highlightOpacity: 0.15,
};

// ============================================================================
// Combined Highway Defaults
// ============================================================================

export const DEFAULT_HIGHWAY_CONFIG: HighwayConfig = {
  viewport: { ...DEFAULT_VIEWPORT },
  scroll: { ...DEFAULT_SCROLL_CONFIG },
  judgmentLine: { ...DEFAULT_JUDGMENT_LINE_CONFIG },
  inputCursor: { ...DEFAULT_INPUT_CURSOR_CONFIG },
  inputTrail: { ...DEFAULT_INPUT_TRAIL_CONFIG },
  noteRender: { ...DEFAULT_NOTE_RENDER_CONFIG },
  gridRender: { ...DEFAULT_GRID_RENDER_CONFIG },
  tonicIndicator: { ...DEFAULT_TONIC_INDICATOR_CONFIG },
  tonicPitchClass: 0, // C
  backgroundColor: '#1f2937', // Dark gray
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate scroll config values from measures and tempo.
 *
 * @param measuresAhead - Number of measures visible ahead
 * @param measureDurationMs - Duration of one measure in ms
 * @param viewportWidth - Viewport width in pixels
 * @param judgmentLineFraction - Where the judgment line is (0-1)
 * @param msVisibleBehind - Milliseconds visible behind judgment line
 */
export function calculateScrollConfig(
  measuresAhead: number,
  measureDurationMs: number,
  viewportWidth: number,
  judgmentLineFraction: number,
  msVisibleBehind: number
): ScrollConfig {
  const msVisibleAhead = measuresAhead * measureDurationMs;

  // Calculate pixels per ms
  // The area ahead of judgment line shows msVisibleAhead
  const aheadWidth = viewportWidth * (1 - judgmentLineFraction);
  const pixelsPerMs = aheadWidth / msVisibleAhead;

  return {
    measuresVisibleAhead: measuresAhead,
    msVisibleAhead,
    msVisibleBehind,
    pixelsPerMs,
    measureDurationMs,
  };
}

/**
 * Calculate viewport MIDI range from notes.
 *
 * @param notes - Array of notes
 * @param margin - Semitones to add above/below
 * @returns Min and max MIDI values
 */
export function calculateMidiRange(
  notes: Array<{ midiPitch: number }>,
  margin: number = 3
): { minMidi: number; maxMidi: number } {
  if (notes.length === 0) {
    return { minMidi: 48, maxMidi: 72 }; // Default C3 to C5
  }

  let minMidi = 127;
  let maxMidi = 0;

  for (const note of notes) {
    minMidi = Math.min(minMidi, note.midiPitch);
    maxMidi = Math.max(maxMidi, note.midiPitch);
  }

  return {
    minMidi: minMidi - margin,
    maxMidi: maxMidi + margin,
  };
}
