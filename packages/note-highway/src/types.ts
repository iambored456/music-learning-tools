/**
 * @mlt/note-highway - Type Definitions
 *
 * Types for the note highway visualization system.
 */

import type { SessionTimeMs, TimedNote, TimedBeat, PitchSample } from '@mlt/rhythm-core';

// ============================================================================
// Viewport Types
// ============================================================================

/**
 * Configuration for the highway viewport.
 */
export interface HighwayViewport {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Minimum MIDI pitch visible */
  minMidi: number;
  /** Maximum MIDI pitch visible */
  maxMidi: number;
  /** Margin in semitones above/below data range */
  pitchMarginSemitones: number;
}

// ============================================================================
// Scroll Types
// ============================================================================

/**
 * Configuration for scrolling behavior.
 */
export interface ScrollConfig {
  /** Number of measures visible ahead of judgment line */
  measuresVisibleAhead: number;
  /** Milliseconds visible ahead (computed from measuresVisibleAhead) */
  msVisibleAhead: number;
  /** Milliseconds visible behind judgment line (past notes) */
  msVisibleBehind: number;
  /** Pixels per millisecond (derived from config) */
  pixelsPerMs: number;
  /** Duration of one measure in milliseconds (for conversion) */
  measureDurationMs: number;
}

// ============================================================================
// Judgment Line Types
// ============================================================================

/**
 * Configuration for the judgment line.
 */
export interface JudgmentLineConfig {
  /** X position as fraction of viewport width (default: 0.25 = left quarter) */
  xPositionFraction: number;
  /** Line color */
  color: string;
  /** Line width in pixels */
  lineWidth: number;
  /** Whether to show glow effect */
  showGlow: boolean;
  /** Glow color when pitch is in tolerance */
  glowColorSuccess: string;
  /** Glow color when pitch is out of tolerance */
  glowColorFailure: string;
  /** Glow blur radius in pixels */
  glowRadius: number;
}

// ============================================================================
// Input Cursor Types
// ============================================================================

/**
 * Configuration for the input cursor.
 */
export interface InputCursorConfig {
  /** Radius of cursor circle in pixels */
  radius: number;
  /** Whether to show pitch deviation indicator */
  showDeviationIndicator: boolean;
  /** Maximum deviation display in cents */
  maxDeviationCents: number;
  /** Color when in tolerance */
  colorInTolerance: string;
  /** Color when out of tolerance */
  colorOutOfTolerance: string;
  /** Color when not voiced */
  colorUnvoiced: string;
}

/**
 * Current state of the input cursor.
 */
export interface InputCursorState {
  /** Current detected MIDI pitch (fractional), null if not voiced */
  currentMidi: number | null;
  /** Current pitch deviation in cents from nearest target */
  deviationCents: number;
  /** Whether currently in tolerance */
  isInTolerance: boolean;
  /** Clarity/confidence of detection (0-1) */
  clarity: number;
  /** Whether voice is detected */
  isVoiced: boolean;
}

// ============================================================================
// Input Trail Types
// ============================================================================

/**
 * Configuration for the input trail.
 */
export interface InputTrailConfig {
  /** Time window for trail display (ms) */
  trailDurationMs: number;
  /** Point radius in pixels */
  pointRadius: number;
  /** Minimum clarity to display point */
  clarityThreshold: number;
  /** Whether to connect nearby points */
  showConnections: boolean;
  /** Maximum connection distance in pixels */
  connectionThreshold: number;
  /** Connection line width */
  connectionLineWidth: number;
  /** Connection line color */
  connectionColor: string;
  /** Maximum opacity for points */
  maxOpacity: number;
}

/**
 * A single point in the input trail.
 */
export interface InputTrailPoint {
  /** Session time when detected */
  timeMs: SessionTimeMs;
  /** Detected MIDI pitch (fractional) */
  midiPitch: number;
  /** Detection clarity (0-1) */
  clarity: number;
  /** Whether voice was detected */
  isVoiced: boolean;
  /** Color for this point (RGB tuple) */
  color?: [number, number, number];
}

// ============================================================================
// Note Rendering Types
// ============================================================================

/**
 * Style of note glyph to render.
 */
export type NoteGlyphStyle = 'stadium' | 'rectangle' | 'oval';

/**
 * Configuration for note rendering.
 */
export interface NoteRenderConfig {
  /** Default glyph style */
  glyphStyle: NoteGlyphStyle;
  /** Note height in pixels (fixed, based on pitch row height) */
  noteHeight: number;
  /** Border radius for stadium shape */
  stadiumRadius: number;
  /** Opacity for notes that have passed the judgment line */
  passedNoteOpacity: number;
  /** Opacity for upcoming notes */
  upcomingNoteOpacity: number;
  /** Opacity for active notes (at judgment line) */
  activeNoteOpacity: number;
  /** Whether to show note labels (pitch name) */
  showLabels: boolean;
  /** Border width for notes */
  borderWidth: number;
  /** Border color for notes */
  borderColor: string;
}

/**
 * A note prepared for rendering.
 */
export interface RenderableNote {
  /** Source note data */
  note: TimedNote;
  /** Left edge X position */
  x: number;
  /** Width in pixels */
  width: number;
  /** Y position (center of note) */
  y: number;
  /** Height in pixels */
  height: number;
  /** Whether note is currently active (judgment line intersects) */
  isActive: boolean;
  /** Whether note has been passed */
  isPassed: boolean;
  /** Accuracy result if completed (0-1) */
  accuracy?: number;
}

// ============================================================================
// Grid Rendering Types
// ============================================================================

/**
 * Configuration for grid line rendering.
 */
export interface GridRenderConfig {
  /** Color for microbeat lines */
  microbeatColor: string;
  /** Color for macrobeat lines */
  macrobeatColor: string;
  /** Color for measure lines */
  measureColor: string;
  /** Line width for microbeat */
  microbeatWidth: number;
  /** Line width for macrobeat */
  macrobeatWidth: number;
  /** Line width for measure */
  measureWidth: number;
  /** Whether to show microbeat lines */
  showMicrobeats: boolean;
  /** Whether to show macrobeat lines */
  showMacrobeats: boolean;
  /** Whether to show measure lines */
  showMeasures: boolean;
  /** Horizontal pitch row line color */
  pitchRowColor: string;
  /** Horizontal pitch row line width */
  pitchRowWidth: number;
  /** Whether to show pitch row lines */
  showPitchRows: boolean;
}

// ============================================================================
// Tonic Indicator Types
// ============================================================================

/**
 * Configuration for tonic indicators.
 */
export interface TonicIndicatorConfig {
  /** Whether to show tonic indicators */
  enabled: boolean;
  /** Highlight color for tonic pitch class rows */
  highlightColor: string;
  /** Opacity of the highlight */
  highlightOpacity: number;
}

// ============================================================================
// Main Highway Config
// ============================================================================

/**
 * Complete configuration for the highway renderer.
 */
export interface HighwayConfig {
  viewport: HighwayViewport;
  scroll: ScrollConfig;
  judgmentLine: JudgmentLineConfig;
  inputCursor: InputCursorConfig;
  inputTrail: InputTrailConfig;
  noteRender: NoteRenderConfig;
  gridRender: GridRenderConfig;
  tonicIndicator: TonicIndicatorConfig;
  /** Current tonic pitch class (0-11, C=0) */
  tonicPitchClass: number;
  /** Background color */
  backgroundColor: string;
}

// ============================================================================
// Renderer State
// ============================================================================

/**
 * State passed to the renderer each frame.
 */
export interface HighwayRenderState {
  /** Current session time */
  currentTimeMs: SessionTimeMs;
  /** Notes to render */
  notes: TimedNote[];
  /** Beats to render */
  beats: TimedBeat[];
  /** Input trail history */
  inputTrail: InputTrailPoint[];
  /** Current input cursor state */
  inputCursor: InputCursorState;
  /** Whether gate is active (lesson mode paused) */
  isGated: boolean;
  /** Judgment results for coloring passed notes (noteId -> accuracy) */
  judgments: Map<string, number>;
  /** IDs of currently active notes */
  activeNoteIds: Set<string>;
  /** IDs of passed notes */
  passedNoteIds: Set<string>;
}

// ============================================================================
// Coordinate Types
// ============================================================================

/**
 * A rectangle in canvas coordinates.
 */
export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A point in canvas coordinates.
 */
export interface CanvasPoint {
  x: number;
  y: number;
}
