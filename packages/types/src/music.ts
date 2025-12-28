/**
 * Core music domain types for Music Learning Tools
 */

import type { CanvasSpaceColumn } from './coordinates.js';

// ============================================================================
// Pitch & Row Types
// ============================================================================

export interface PitchRowData {
  pitch: string;
  flatName: string;
  sharpName: string;
  toneNote: string;
  frequency: number;
  column: 'A' | 'B';
  hex: string;
  isAccidental: boolean;
  /** MIDI note number (0-127) */
  midi?: number;
  /** Pitch class (0-11, C=0) */
  pitchClass?: number;
  /** Octave number */
  octave?: number;
  /**
   * Visual-only padding row (e.g., top boundary) to allow half-cells to be fully visible.
   * These rows should not be placeable and are typically hidden in the legends.
   */
  isBoundary?: boolean;
}

export interface PitchRange {
  /**
   * Pitch viewport window into the pitch gamut (inclusive indices into fullRowData).
   */
  topIndex: number;
  bottomIndex: number;
}

/** Alias for clarity in new code: the pitch viewport window into the pitch gamut. */
export type PitchViewportRange = PitchRange;

// ============================================================================
// Note Types
// ============================================================================

export type NoteShape = 'circle' | 'oval' | 'diamond';

export interface PlacedNote {
  uuid: string;
  row: number;
  /** Absolute row index in masterRowData; used to restore position after range changes. */
  globalRow?: number;
  /** Canvas-space column index (0 = first musical beat) */
  startColumnIndex: CanvasSpaceColumn;
  /** Canvas-space column index (0 = first musical beat) */
  endColumnIndex: CanvasSpaceColumn;
  shape: NoteShape;
  color: string;
  isDrum?: boolean;
  drumTrack?: number | string | null;
  enharmonicPreference?: boolean;
  tonicNumber?: number | null;
}

export type AnimatableNote = Pick<PlacedNote, 'color'> & Partial<Pick<PlacedNote, 'uuid'>>;

export interface PlacedChord {
  position: {
    xBeat: number;
    [key: string]: unknown;
  };
  notes: string[];
  [key: string]: unknown;
}

// ============================================================================
// Tonic & Harmony Types
// ============================================================================

export interface TonicSign {
  /** Canvas-space column index (0 = first musical beat) */
  columnIndex: CanvasSpaceColumn;
  row: number;
  /** Absolute row index in master pitch data (preserved across pitch range changes) */
  globalRow?: number;
  tonicNumber: number;
  preMacrobeatIndex: number;
  uuid?: string;
  [key: string]: unknown;
}

export type TonicSignGroups = Record<string, TonicSign[]>;

// ============================================================================
// Stamp Types (Sixteenth & Triplet)
// ============================================================================

export interface SixteenthStampPlacement {
  id: string;
  sixteenthStampId: number;
  /** Canvas-space column index (0 = first musical beat) */
  startColumn: CanvasSpaceColumn;
  /** Canvas-space column index (0 = first musical beat) */
  endColumn: CanvasSpaceColumn;
  row: number;
  /** Absolute row index in masterRowData; used to restore position after range changes. */
  globalRow?: number;
  color: string;
  timestamp: number;
  shapeOffsets?: Record<string, number>;
}

export interface TripletStampPlacement {
  id: string;
  tripletStampId: number;
  /** Time-space microbeat index (0 = first microbeat; excludes tonic columns) */
  startTimeIndex: number;
  span: number;
  row: number;
  /** Absolute row index in masterRowData; used to restore position after range changes. */
  globalRow?: number;
  color: string;
  timestamp: number;
  shapeOffsets?: Record<string, number>;
}

export interface SixteenthStampPlaybackData {
  sixteenthStampId: number;
  /** Canvas-space column index (0 = first musical beat) */
  column: CanvasSpaceColumn;
  /** Canvas-space column index (0 = first musical beat) */
  startColumn: CanvasSpaceColumn;
  /** Canvas-space column index (0 = first musical beat) */
  endColumn: CanvasSpaceColumn;
  row: number;
  pitch: string;
  color: string;
  placement: SixteenthStampPlacement;
}

export interface TripletStampPlaybackData {
  /** Time-space microbeat index (0 = first microbeat; excludes tonic columns) */
  startTimeIndex: number;
  tripletStampId: number;
  row: number;
  pitch: string;
  color: string;
  span: number;
  placement: TripletStampPlacement;
}

// ============================================================================
// Rhythm & Time Types
// ============================================================================

export type MacrobeatGrouping = 2 | 3;
export type MacrobeatBoundaryStyle = 'dashed' | 'solid' | 'anacrusis';
export type ModulationRatio = number;

export interface ModulationMarker {
  id: string;
  measureIndex: number;
  ratio: ModulationRatio;
  active: boolean;
  xPosition: number | null;
  /** Canvas-space column index (0 = first musical beat) */
  columnIndex: CanvasSpaceColumn | null;
  macrobeatIndex: number | null;
  xCanvas?: number;
}

export interface AnacrusisCache {
  groupings: MacrobeatGrouping[];
  boundaryStyles: MacrobeatBoundaryStyle[];
}

// ============================================================================
// Timbre & Audio Types
// ============================================================================

export interface ADSREnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface FilterSettings {
  enabled: boolean;
  blend: number;
  cutoff: number;
  resonance: number;
  type: string;
  mix: number;
}

export interface VibratoSettings {
  speed: number;
  span: number;
}

export interface TremoloSettings {
  speed: number;
  span: number;
}

export interface TimbreState {
  name: string;
  adsr: ADSREnvelope;
  coeffs: Float32Array;
  phases: Float32Array;
  activePresetName: string | null;
  gain: number;
  filter: FilterSettings;
  vibrato: VibratoSettings;
  tremelo: TremoloSettings; // Note: historical spelling preserved
}

export type TimbresMap = Record<string, TimbreState>;

// ============================================================================
// Selection Types
// ============================================================================

export interface GeometryPoint {
  x?: number;
  y?: number;
  col?: number;
  row?: number;
}

export type LassoSelectedItem =
  | { type: 'note'; id: string; data: PlacedNote; index?: number }
  | { type: 'sixteenthStamp'; id: string; data: SixteenthStampPlacement; index?: number }
  | { type: 'tripletStamp'; id: string; data: TripletStampPlacement; index?: number };

export interface LassoSelection {
  selectedItems: LassoSelectedItem[];
  convexHull: GeometryPoint[] | null;
  isActive: boolean;
}

// ============================================================================
// Device & View Types
// ============================================================================

export interface DeviceProfile {
  isMobile: boolean;
  isTouch: boolean;
  isCoarsePointer: boolean;
  orientation: 'landscape' | 'portrait';
  width: number;
  height: number;
}

export interface AccidentalMode {
  sharp: boolean;
  flat: boolean;
}

export type DegreeDisplayMode = 'off' | 'diatonic' | 'modal';
export type PlayheadMode = 'cursor' | 'microbeat' | 'macrobeat';
export type LongNoteStyle = 'style1' | 'style2';

// ============================================================================
// Print Types
// ============================================================================

export type PageSize = 'letter' | '11x14' | '11x17';
export type Orientation = 'landscape' | 'portrait';
export type ColorMode = 'color' | 'bw';

export interface PrintOptions {
  pageSize: PageSize;
  includeButtonGrid: boolean;
  includeDrums: boolean;
  includeLeftLegend: boolean;
  includeRightLegend: boolean;
  orientation: Orientation;
  colorMode: ColorMode;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  topRow?: number;
  bottomRow?: number;
}
