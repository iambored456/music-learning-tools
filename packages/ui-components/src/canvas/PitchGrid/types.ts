/**
 * PitchGrid Component Types
 *
 * These types define the props API for the shared PitchGrid component.
 * The component accepts all configuration via props - no global store dependencies.
 */

import type {
  PitchRowData,
  PlacedNote,
  TonicSign,
  MacrobeatGrouping,
  MacrobeatBoundaryStyle,
  ModulationMarker,
  AccidentalMode,
  DegreeDisplayMode,
  SixteenthStampPlacement,
  TripletStampPlacement,
  LongNoteStyle,
} from '@mlt/types';

// ============================================================================
// PitchGrid Modes
// ============================================================================

/**
 * Operating mode for the PitchGrid component.
 *
 * - 'notation': Full editing capabilities with mouse/touch interactors (Student Notation)
 * - 'playback': Read-only display during playback (Student Notation)
 * - 'singing': Real-time pitch visualization with scrolling trace (Singing Trainer - stationary)
 * - 'highway': Guitar Hero-style note highway with flowing targets (Singing Trainer)
 */
export type PitchGridMode = 'notation' | 'playback' | 'singing' | 'highway';

// ============================================================================
// Viewport & Coordinate Types
// ============================================================================

/**
 * Viewport information for the pitch grid.
 * Defines what portion of the pitch gamut is currently visible.
 */
export interface PitchGridViewport {
  /** Index of the first visible row in fullRowData (top of viewport) */
  startRow: number;
  /** Index of the last visible row in fullRowData (bottom of viewport) */
  endRow: number;
  /** Current zoom level (1.0 = default) */
  zoomLevel: number;
  /** Viewport height in pixels */
  containerHeight: number;
  /** Viewport width in pixels */
  containerWidth: number;
}

/**
 * Coordinate utilities for converting between pitch/time and canvas coordinates.
 * These are computed from the config and can be passed to renderers.
 */
export interface CoordinateUtils {
  /** Convert row index to Y position on canvas */
  getRowY(rowIndex: number): number;
  /** Convert Y position to row index (may be fractional) */
  getRowFromY(canvasY: number): number;
  /** Convert canvas-space column index to X position */
  getColumnX(columnIndex: number): number;
  /** Convert X position to canvas-space column index */
  getColumnFromX(canvasX: number): number;
  /** Convert time (ms) to X position (for singing/highway modes) */
  getTimeX?(timeMs: number): number;
  /** Convert X position to time (ms) (for singing/highway modes) */
  getTimeFromX?(canvasX: number): number;
}

// ============================================================================
// Singing/Highway Mode Types
// ============================================================================

/**
 * A point in the user's detected pitch history.
 */
export interface PitchHistoryPoint {
  /** Detected frequency in Hz (0 if no pitch detected) */
  frequency: number;
  /** MIDI note number (may be fractional for pitch accuracy) */
  midi: number;
  /** Timestamp from performance.now() */
  time: number;
  /** Detection confidence (0-1) */
  clarity: number;
}

/**
 * Current detected pitch from microphone.
 */
export interface CurrentPitch {
  /** Detected frequency in Hz */
  frequency: number;
  /** MIDI note number (may be fractional) */
  midi: number;
  /** Detection confidence (0-1) */
  clarity: number;
  /** Pitch class (0-11, C=0) */
  pitchClass: number;
}

/**
 * Highlight overlay configuration for legend labels.
 */
export interface LegendHighlightEntry {
  /** Pitch class to highlight (0-11, C=0). Null disables highlight. */
  pitchClass: number | null;
  /** Specific MIDI note to highlight (e.g., 60 = C4). When set, overrides pitchClass matching. */
  midi?: number | null;
  /** Opacity of the highlight (0-1). */
  opacity: number;
  /** Highlight color (default: yellow). */
  color?: string;
}

/**
 * Single highlight or list of highlights for legend labels.
 */
export type LegendHighlightConfig = LegendHighlightEntry | LegendHighlightEntry[];

/**
 * Highlight overlay configuration for one pitch row on the grid.
 */
export interface PitchRowHighlightEntry {
  /** Specific MIDI note to highlight (e.g., 60 = C4). */
  midi?: number;
  /** Explicit row index in fullRowData. Overrides midi when provided. */
  rowIndex?: number;
  /** Highlight color (defaults to the row's pitch color). */
  color?: string;
  /** Base fill opacity (0-1). */
  opacity?: number;
  /** Glow intensity multiplier (0-1). */
  glow?: number;
  /** Whether to pulse the highlight over time. */
  pulse?: boolean;
  /** Vertical scale factor for highlight height (0-1). 1 = full cell height, 0.5 = half. Default: 1. */
  heightScale?: number;
}

/**
 * Single row highlight or list of row highlights.
 */
export type PitchRowHighlightConfig = PitchRowHighlightEntry | PitchRowHighlightEntry[];

/**
 * A target note to display on the note highway.
 */
export type TargetNoteKind = 'fixedPitch' | 'windowAnyPitch' | 'windowBand' | 'slideWindow';
export type TargetNoteStyle = 'stadium' | 'gradient';

export type SlideDirection = 'up' | 'down';

/**
 * A target note/window to display on the note highway.
 */
export interface TargetNote {
  /** Unique identifier */
  id: string;
  /** Target kind (defaults to fixedPitch) */
  targetKind?: TargetNoteKind;
  /** MIDI note number of the target pitch (fixedPitch) */
  midi?: number;
  /** Optional lower MIDI bound (windowBand) */
  minMidi?: number;
  /** Optional upper MIDI bound (windowBand) */
  maxMidi?: number;
  /** Optional slide direction (slideWindow) */
  slideDirection?: SlideDirection;
  /** Start time in milliseconds from exercise start */
  startTimeMs: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Optional color override (defaults to pitch color from fullRowData) */
  color?: string;
  /** Optional label (e.g., scale degree, lyric syllable) */
  label?: string;
  /** Whether this is a golden note (worth double points in karaoke) */
  isGolden?: boolean;
  /** Whether this is a rap note (rhythm only, no pitch judgment) */
  isRap?: boolean;
}

/**
 * Configuration for target note label sizing.
 */
export interface TargetNoteLabelConfig {
  /** Sizing mode for labels */
  mode?: 'auto' | 'fixed';
  /** Scale factor applied to auto sizing (default: 1) */
  scale?: number;
  /** Fixed pixel size when mode is 'fixed' */
  fixedPx?: number;
  /** Optional minimum pixel size clamp */
  minPx?: number;
  /** Optional maximum pixel size clamp */
  maxPx?: number;
}

/**
 * Configuration for pitch trail visual style.
 */
export interface PitchTrailConfig {
  /** Time window for pitch history display in ms (default: 4000) */
  timeWindowMs?: number;
  /** Whether trail can render points ahead of the current time cursor (default: false) */
  includeFuturePoints?: boolean;
  /** Optional fixed RGB color override for trail and indicator points */
  fixedColorRgb?: [number, number, number] | null;
  /** Scroll speed in pixels per second (default: 200) */
  pixelsPerSecond?: number;
  /** Circle radius for trail points in pixels (default: 9.5) */
  circleRadius?: number;
  /** Circle radius for the live indicator at the judgment line (default: row-height based when <= 0) */
  indicatorRadius?: number;
  /** Maximum distance in pixels to draw connector lines (default: 35) */
  proximityThreshold?: number;
  /** Maximum connections per point (default: 3) */
  maxConnections?: number;
  /** Connector line width in pixels (default: 2.5) */
  connectorLineWidth?: number;
  /** Connector line color (default: 'rgba(0,0,0,0.4)') */
  connectorColor?: string;
  /** Whether to use tonic-relative colors (default: true) */
  useTonicRelativeColors?: boolean;
  /** Current tonic pitch class for color calculation (0-11, default: 0 = C) */
  tonicPitchClass?: number;
  /** Minimum clarity threshold to display point (default: 0.5) */
  clarityThreshold?: number;
  /** Maximum opacity for trail points (default: 0.9) */
  maxOpacity?: number;
}

/**
 * Configuration for singing/highway mode rendering.
 */
export interface SingingModeConfig {
  /** Current user pitch from microphone (null if not detected). Optional — can be passed as separate prop to PitchGrid. */
  userPitch?: CurrentPitch | null;
  /** History of recent pitch detections */
  pitchHistory: PitchHistoryPoint[];
  /** Target notes to display (for exercises) */
  targetNotes?: TargetNote[];
  /** Time window for pitch history display in ms (default: 4000) */
  timeWindowMs?: number;
  /** Scroll speed in pixels per second (default: 200) */
  pixelsPerSecond?: number;
  /** Pitch trail visual configuration */
  trailConfig?: PitchTrailConfig;
  /** Optional label sizing configuration for target notes */
  labelConfig?: TargetNoteLabelConfig;
}

/**
 * Scrolling grid data for Student Notation highway mode.
 * Contains the notation content that will scroll past the judgment line.
 */
export interface ScrollingGridData {
  /** Notes to display on the scrolling grid */
  placedNotes: PlacedNote[];
  /** Width multipliers for each canvas-space column */
  columnWidths: number[];
  /** Macrobeat groupings (2 or 3 per group) */
  macrobeatGroupings: MacrobeatGrouping[];
  /** Boundary line styles at each macrobeat */
  macrobeatBoundaryStyles: MacrobeatBoundaryStyle[];
  /** Modulation markers for tempo/key changes */
  tempoModulationMarkers?: ModulationMarker[];
  /** Drum notes for drum grid */
  drumNotes?: PlacedNote[];
  /** Tonic signs for grid */
  tonicSigns?: TonicSign[];
}

/**
 * Configuration specific to highway (Guitar Hero) mode.
 */
export interface HighwayModeConfig extends SingingModeConfig {
  /** X position of the "now line" where user should match pitch */
  nowLineX: number;
  /** Current time in the exercise/lesson (ms from start) */
  currentTimeMs: number;
  /** Current scroll offset in pixels (for scrolling grids) */
  scrollOffset?: number;
  /** Scrolling grid data from Student Notation (optional, for scrolling mode) */
  scrollingGridData?: ScrollingGridData;
  /** Whether to show onramp countdown */
  showOnrampCountdown?: boolean;
  /** Beats remaining in onramp (if in onramp phase) */
  onrampBeatsRemaining?: number;
}

// ============================================================================
// Notation Mode Types
// ============================================================================

/**
 * Currently active tool in notation mode.
 */
export type NotationTool =
  | 'note'
  | 'chord'
  | 'eraser'
  | 'modulation'
  | 'sixteenthStamp'
  | 'tripletStamp'
  | 'tonicization';

/**
 * Callbacks for notation mode interactivity.
 */
export interface NotationCallbacks {
  /** Called when a note is placed */
  onNotePlaced?: (note: PlacedNote) => void;
  /** Called when a note is removed */
  onNoteRemoved?: (noteId: string) => void;
  /** Called when notes are updated (e.g., moved, resized) */
  onNotesUpdated?: (notes: PlacedNote[]) => void;
  /** Called when a tonic sign is placed */
  onTonicSignPlaced?: (sign: TonicSign) => void;
  /** Called when a tonic sign is removed */
  onTonicSignRemoved?: (signId: string) => void;
  /** Called when selection changes */
  onSelectionChanged?: (selectedIds: string[]) => void;
}

// ============================================================================
// Main PitchGrid Props
// ============================================================================

/**
 * Base props shared by all PitchGrid modes.
 */
export interface PitchGridBaseProps {
  // === Mode ===
  /** Operating mode for the grid */
  mode: PitchGridMode;

  // === Pitch Data ===
  /** Complete pitch gamut data (C8 to A0) */
  fullRowData: PitchRowData[];

  // === Viewport ===
  /** Current viewport configuration */
  viewport: PitchGridViewport;

  // === Grid Dimensions ===
  /** Base cell width in pixels (before zoom) */
  cellWidth: number;
  /** Base cell height in pixels (before zoom) */
  cellHeight: number;

  // === Visual Options ===
  /** Color mode for rendering */
  colorMode: 'color' | 'bw';
  /** How to display scale degrees on notes */
  degreeDisplayMode: DegreeDisplayMode;
  /** Which accidentals to display */
  accidentalMode: AccidentalMode;
  /** Whether to show frequency labels on legend */
  showFrequencyLabels?: boolean;
  /** Whether to show octave labels on legend */
  showOctaveLabels?: boolean;
  /** Optional highlight overlay for legend labels */
  legendHighlight?: LegendHighlightConfig;
  /** Whether to render horizontal pitch grid lines */
  showHorizontalGridLines?: boolean;
  /**
   * Optional tonic/reference pitch class for horizontal grid line styling.
   * 0 preserves legacy C-referenced pattern; other values rotate the full pattern.
   */
  horizontalGridReferencePitchClass?: number | null;
  /** Visual style for singing/highway target notes. */
  targetNoteStyle?: TargetNoteStyle;
}

/**
 * Props for notation/playback modes (Student Notation).
 */
export interface PitchGridNotationProps extends PitchGridBaseProps {
  mode: 'notation' | 'playback';

  // === Content ===
  /** Notes to display on the grid */
  placedNotes: PlacedNote[];
  /** Tonic signs to display */
  placedTonicSigns: TonicSign[];
  /** Sixteenth stamp placements */
  sixteenthStamps?: SixteenthStampPlacement[];
  /** Triplet stamp placements */
  tripletStamps?: TripletStampPlacement[];

  // === Column Layout ===
  /** Width multipliers for each canvas-space column */
  columnWidths: number[];
  /** Macrobeat groupings (2 or 3 per group) */
  macrobeatGroupings: MacrobeatGrouping[];
  /** Boundary line styles at each macrobeat */
  macrobeatBoundaryStyles: MacrobeatBoundaryStyle[];
  /** Modulation markers for tempo/key changes */
  tempoModulationMarkers?: ModulationMarker[];

  // === Notation Mode Options ===
  /** Currently active tool (notation mode only) */
  activeTool?: NotationTool;
  /** Long note rendering style */
  longNoteStyle?: LongNoteStyle;
  /** Callbacks for interactive events */
  callbacks?: NotationCallbacks;

  // === Animation State (for playback effects) ===
  /** Notes currently being animated (e.g., vibrato, envelope) */
  animatingNotes?: Set<string>;
}

/**
 * Props for singing mode (Singing Trainer - stationary).
 */
export interface PitchGridSingingProps extends PitchGridBaseProps {
  mode: 'singing';

  /** Singing mode configuration */
  singingConfig: SingingModeConfig;

  /** Optional target notes to display */
  targetNotes?: TargetNote[];

  /** Current tonic for scale degree display */
  tonic?: string;
}

/**
 * Props for highway mode (Singing Trainer - Guitar Hero style).
 */
export interface PitchGridHighwayProps extends PitchGridBaseProps {
  mode: 'highway';

  /** Highway mode configuration */
  highwayConfig: HighwayModeConfig;

  /** Current tonic for scale degree display */
  tonic?: string;

  /** Beat interval for vertical grid lines (ms) */
  beatIntervalMs?: number;
  /** Measure interval for vertical grid lines (ms) */
  measureIntervalMs?: number;
}

/**
 * Union type of all PitchGrid props.
 */
export type PitchGridProps =
  | PitchGridNotationProps
  | PitchGridSingingProps
  | PitchGridHighwayProps;

// ============================================================================
// Renderer Options (for internal use)
// ============================================================================

/**
 * Options passed to the low-level rendering functions.
 * Derived from props but in a format optimized for rendering.
 */
export interface PitchGridRenderOptions {
  // Canvas context
  ctx: CanvasRenderingContext2D;

  // Dimensions
  cellWidth: number;
  cellHeight: number;
  viewportWidth: number;
  viewportHeight: number;

  // Pitch data
  fullRowData: PitchRowData[];
  visibleRowRange: { startRow: number; endRow: number };

  // Visual
  colorMode: 'color' | 'bw';
  degreeDisplayMode: DegreeDisplayMode;
  accidentalMode: AccidentalMode;

  // Coordinate utilities
  coords: CoordinateUtils;
}

/**
 * Line style configuration for grid lines.
 */
export interface LineStyle {
  lineWidth: number;
  dash: number[];
  color: string;
}
