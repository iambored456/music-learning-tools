// State type definitions

import type { CanvasSpaceColumn } from '../src/utils/coordinateTypes.ts';

// Re-export coordinate types for convenience
export type { CanvasSpaceColumn } from '../src/utils/coordinateTypes.ts';

export interface GeometryPoint {
  x?: number;
  y?: number;
  col?: number;
  row?: number;
}

export interface PitchRowData {
  pitch: string;
  flatName: string;
  sharpName: string;
  toneNote: string;
  frequency: number;
  column: 'A' | 'B';
  hex: string;
  isAccidental: boolean;
  /**
   * Visual-only padding row (e.g., top boundary) to allow half-cells to be fully visible.
   * These rows should not be placeable and are typically hidden in the legends.
   */
  isBoundary?: boolean;
}

export interface PlacedNote {
  uuid: string;
  row: number;
  /** Absolute row index in masterRowData; used to restore position after range changes. */
  globalRow?: number;
  /** Canvas-space column index (0 = first musical beat) */
  startColumnIndex: CanvasSpaceColumn;
  /** Canvas-space column index (0 = first musical beat) */
  endColumnIndex: CanvasSpaceColumn;
  shape: 'circle' | 'oval' | 'diamond';
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

export type SixteenthStampPlaybackData = {
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
};

export type TripletStampPlaybackData = {
  /** Time-space microbeat index (0 = first microbeat; excludes tonic columns) */
  startTimeIndex: number;
  tripletStampId: number;
  row: number;
  pitch: string;
  color: string;
  span: number;
  placement: TripletStampPlacement;
};

export type Annotation = any;

export type LassoSelectedItem =
  | { type: 'note'; id: string; data: PlacedNote; index?: number }
  | { type: 'sixteenthStamp'; id: string; data: SixteenthStampPlacement; index?: number }
  | { type: 'tripletStamp'; id: string; data: TripletStampPlacement; index?: number };

export interface LassoSelection {
  selectedItems: LassoSelectedItem[];
  convexHull: GeometryPoint[] | null;
  isActive: boolean;
}

export interface TimbreState {
  name: string;
  adsr: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  coeffs: Float32Array;
  phases: Float32Array;
  activePresetName: string | null;
  gain: number;
  filter: {
    enabled: boolean;
    blend: number;
    cutoff: number;
    resonance: number;
    type: string;
    mix: number;
  };
  vibrato: {
    speed: number;
    span: number;
  };
  tremelo: {
    speed: number;
    span: number;
  };
}

export interface TimbresState {
  timbres: Record<string, TimbreState>;
  [key: string]: unknown;
}

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

export interface PitchRange {
  /**
   * Pitch viewport window into the pitch gamut (inclusive indices into `fullRowData` / `masterRowData`).
   *
   * Terminology:
   * - Pitch gamut: the complete pitch row array (`src/state/pitchData.ts`)
   * - Pitch viewport: the currently visible window into that gamut
   */
  topIndex: number;
  bottomIndex: number;
}

/** Alias for clarity in new code: the pitch viewport window into the pitch gamut. */
export type PitchViewportRange = PitchRange;

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

export interface PrintOptions {
  /** Paper size (orientation is controlled separately). */
  pageSize: 'letter' | '11x14' | '11x17';
  includeButtonGrid: boolean;
  includeDrums: boolean;
  /** Include the left pitch-to-Y-axis labels (historically called the left "legend"). */
  includeLeftLegend: boolean;
  /** Include the right pitch-to-Y-axis labels (historically called the right "legend"). */
  includeRightLegend: boolean;
  orientation: 'landscape' | 'portrait';
  colorMode: 'color' | 'bw';
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  topRow?: number;
  bottomRow?: number;
}

export interface HistoryEntry {
  notes: PlacedNote[];
  tonicSignGroups: TonicSignGroups;
  timbres: TimbresState['timbres'];
  placedChords: PlacedChord[];
  sixteenthStampPlacements: SixteenthStampPlacement[];
  tripletStampPlacements: TripletStampPlacement[];
  annotations: Annotation[];
  lassoSelection: LassoSelection;
}

export interface AppState {
  // Data & History
  placedNotes: PlacedNote[];
  placedChords: PlacedChord[];
  tonicSignGroups: TonicSignGroups;
  sixteenthStampPlacements: SixteenthStampPlacement[];
  tripletStampPlacements: TripletStampPlacement[];
  annotations: Annotation[];
  lassoSelection: LassoSelection;
  history: HistoryEntry[];
  historyIndex: number;
  fullRowData: PitchRowData[];
  pitchRange: PitchRange;

  // Rhythm
  macrobeatGroupings: MacrobeatGrouping[];
  macrobeatBoundaryStyles: MacrobeatBoundaryStyle[];
  hasAnacrusis: boolean;
  baseMicrobeatPx: number;
  modulationMarkers: ModulationMarker[];
  selectedModulationRatio: ModulationRatio | null;

  // Timbres & Colors
  timbres: TimbresState['timbres'];
  selectedTimbre?: string;
  colorPalette: Record<string, { primary: string; light: string }>;

  // UI & View State
  selectedTool: string;
  previousTool: string;
  selectedToolTonicNumber: number;
  selectedNote: {
    shape: 'circle' | 'oval' | 'diamond';
    color: string;
  };
  deviceProfile: DeviceProfile;
  activeChordId: string | null;
  activeChordIntervals: string[];
  isIntervalsInverted: boolean;
  chordPositionState: number;

  gridPosition: number;
  viewportRows: number;
  logicRows: number;
  cellWidth: number;
  cellHeight: number;
  /** Canvas-space: musical columns only (0 = first beat). Legend widths are constants (SIDE_COLUMN_WIDTH). */
  columnWidths: number[];
  /** CANVAS-SPACE: legacy per-column widths for some renderers (optional but currently still used). */
  musicalColumnWidths: number[];
  degreeDisplayMode: 'off' | 'diatonic' | 'modal';
  accidentalMode: AccidentalMode;
  showFrequencyLabels: boolean;
  showOctaveLabels: boolean;
  focusColours: boolean;
  keySignature?: string;

  // Playback
  isPlaying: boolean;
  isPaused: boolean;
  isLooping: boolean;
  tempo: number;
  /** Playhead visualization mode shared by pitch + drum grids. */
  playheadMode: 'cursor' | 'microbeat' | 'macrobeat';

  // Waveform
  waveformExtendedView: boolean;

  // ADSR
  adsrTimeAxisScale: number;

  // Print
  isPrintPreviewActive: boolean;
  printOptions: PrintOptions;

  // Long Notes Style
  longNoteStyle: 'style1' | 'style2';
}

export interface Store {
  state: AppState;
  isColdStart?: boolean;
  _anacrusisCache?: AnacrusisCache | null;
  _isBoundaryInAnacrusis: (boundaryIndex: number) => boolean;
  on(eventName: string, callback: (data?: any) => void): void;
  emit(eventName: string, data?: any): void;

  // Note action methods
  addNote(note: Partial<PlacedNote>): PlacedNote | null;
  updateNoteTail(note: PlacedNote, newEndColumn: CanvasSpaceColumn): void;
  updateMultipleNoteTails(notes: PlacedNote[], newEndColumn: CanvasSpaceColumn): void;
  updateNoteRow(note: PlacedNote, newRow: number): void;
  updateMultipleNoteRows(notes: PlacedNote[], rowOffsets: number[]): void;
  updateNotePosition(note: PlacedNote, newStartColumn: CanvasSpaceColumn): void;
  updateMultipleNotePositions(notes: PlacedNote[], newStartColumn: CanvasSpaceColumn): void;
  removeNote(note: PlacedNote): void;
  removeMultipleNotes(notes: PlacedNote[]): void;
  clearAllNotes(): void;
  loadNotes(notes: Partial<PlacedNote>[]): void;
  eraseInPitchArea(col: CanvasSpaceColumn, row: number, width?: number, record?: boolean): boolean;
  eraseTonicSignAt(columnIndex: CanvasSpaceColumn, record?: boolean): boolean;
  addTonicSignGroup(tonicSignGroup: Array<Pick<TonicSign, 'preMacrobeatIndex' | 'columnIndex' | 'row' | 'tonicNumber' | 'globalRow' | 'uuid'>>): void;

  // History action methods
  recordState(): void;
  undo(): void;
  redo(): void;
  clearSavedState(): void;

  // Playback action methods
  setPlaybackState(isPlaying: boolean, isPaused: boolean): void;
  setLooping(enabled: boolean): void;
  setPlayheadMode(mode: AppState['playheadMode']): void;

  // Timbre/ADSR action methods
  setADSR(color: string, adsr: Partial<TimbreState['adsr']>): void;
  setHarmonicCoefficients(color: string, coeffs: Float32Array): void;
  setHarmonicPhases(color: string, phases: Float32Array): void;
  setAdsrTimeAxisScale(scale: number): void;
  setAdsrComponentWidth(widthPercent: number): void;

  // Rhythm action methods
  increaseMacrobeatCount(): void;
  decreaseMacrobeatCount(): void;
  updateTimeSignature(measureIndex: number, groupings: number[]): void;
  setAnacrusis(enabled: boolean): void;
  addModulationMarker(
    measureIndex: number,
    ratio: ModulationRatio,
    xPosition?: number | null,
    columnIndex?: number | null,
    macrobeatIndex?: number | null
  ): string | null;
  removeModulationMarker(markerId: string): void;
  moveModulationMarker(markerId: string, measureIndex: number): void;
  setModulationRatio(markerId: string, ratio: ModulationRatio): void;
  toggleModulationMarker(markerId: string): void;
  clearModulationMarkers(): void;

  // Stamp/Triplet action methods
  addSixteenthStampPlacement(sixteenthStampId: number, startColumn: CanvasSpaceColumn, row: number, color?: string): SixteenthStampPlacement;
  removeSixteenthStampPlacement(placementId: string): boolean;
  eraseSixteenthStampsInArea(eraseStartCol: CanvasSpaceColumn, eraseEndCol: CanvasSpaceColumn, eraseStartRow: number, eraseEndRow: number): boolean;
  getAllSixteenthStampPlacements(): SixteenthStampPlacement[];
  getSixteenthStampAt(column: CanvasSpaceColumn, row: number): SixteenthStampPlacement | null;
  clearAllSixteenthStamps(): void;
  getSixteenthStampPlaybackData(): SixteenthStampPlaybackData[];
  updateSixteenthStampShapeOffset(placementId: string, shapeKey: string, rowOffset: number): void;
  getSixteenthStampShapeRow(placement: SixteenthStampPlacement, shapeKey: string): number;
  addTripletStampPlacement(placement: Omit<TripletStampPlacement, 'id'>): TripletStampPlacement;
  removeTripletStampPlacement(placementId: string): boolean;
  eraseTripletStampsInArea(eraseStartCol: number, eraseEndCol: number, eraseStartRow: number, eraseEndRow: number): boolean;
  getAllTripletStampPlacements(): TripletStampPlacement[];
  getTripletStampAt(timeIndex: number, row: number): TripletStampPlacement | null;
  clearAllTripletStamps(): void;
  getTripletStampPlaybackData(): TripletStampPlaybackData[];
  updateTripletStampShapeOffset(placementId: string, shapeKey: string, rowOffset: number): void;
  getTripletStampShapeRow(placement: TripletStampPlacement, shapeKey: string): number;

  // View action methods
  setSelectedTool(tool: string, tonicNumber?: string | number): void;
  setSelectedNote(shape: 'circle' | 'oval' | 'diamond', color: string): void;
  setTempo(tempo: number): void;
  applyPreset(color: string, preset: unknown): void;
  setDeviceProfile(profile: Partial<DeviceProfile>): void;
  setPitchRange(range: Partial<PitchRange>): void;
  setLayoutConfig(config: { cellWidth?: number; cellHeight?: number; columnWidths?: number[] }): void;
  setActiveChordIntervals(intervals: string[]): void;
  setIntervalsInversion(isInverted: boolean): void;
  setChordPosition(position: number): void;
  toggleAccidentalMode(mode: 'flat' | 'sharp'): void;
  toggleFrequencyLabels(): void;
  toggleOctaveLabels(): void;
  toggleFocusColours(): void;
  setDegreeDisplayMode(mode: 'off' | 'diatonic' | 'modal'): void;
  toggleWaveformExtendedView(): void;
  shiftGridUp(): void;
  shiftGridDown(): void;
  toggleMacrobeatGrouping(measureIndex: number): void;
  cycleMacrobeatBoundaryStyle(boundaryIndex: number): void;
  setFilterSettings(color: string, settings: Partial<TimbreState['filter']>): void;
  setPrintPreviewActive(isActive: boolean): void;
  setPrintOptions(options: Partial<PrintOptions>): void;
  setLongNoteStyle(style: 'style1' | 'style2'): void;

// Additional action methods will be added by other action modules
  [key: string]: unknown;
}

export interface AnimationEffectsManagerApi {
  updateAnimationState(): void;
  shouldTremoloBeRunning(): boolean;
  shouldVibratoBeRunning(): boolean;
  shouldEnvelopeFillBeRunning(): boolean;
  shouldAnimateNote(note: AnimatableNote): boolean;
  getVibratoYOffset(color?: string): number;
  getTremoloAmplitudeMultiplier(color: string): number;
  getADSRTremoloAmplitudeMultiplier(color: string): number;
  getFillLevel(note: AnimatableNote): number;
  shouldFillNote(note: AnimatableNote): boolean;
  triggerTremoloAmplitudeUpdate(): void;
  getAllActiveColors(): string[];
  dispose(): void;
}

// Window interface extensions for global objects
declare global {
  interface StaticWaveformVisualizer {
    currentColor: string | null;
    calculatedAmplitude?: number;
    initialize(): boolean;
    generateWaveform(): void;
    startPhaseTransition?(fromPhases: Float32Array, toPhases: Float32Array, changedBinIndex?: number): void;
    startSingleNoteVisualization(color: string): void;
    stopLiveVisualization(): void;
    startLiveVisualization(): void;
    getNormalizedAmplitude(): number;
    dispose(): void;
  }

  interface Window {
    waveformVisualizer?: StaticWaveformVisualizer;
    effectsCoordinator?: {
      getEffectParameters(colorKey: string, effectType: string): {
        time?: number;
        feedback?: number;
        decay?: number;
        roomSize?: number;
      };
    };
    animationEffectsManager?: AnimationEffectsManagerApi;
    synthEngine?: any;
    initAudio?: () => Promise<void>;
    getModulationMapping?: () => {
      canvasXToMicrobeat: (x: number) => number;
      microbeatToCanvasX: (microbeat: number) => number;
    };
    LayoutService?: {
      recalculateLayout: () => void;
    };
    __transportTimeMap?: any[];
    __transportMusicalEnd?: string;
    Tone?: {
      now?: () => number;
      [key: string]: unknown;
    };
  }
}


