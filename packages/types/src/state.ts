/**
 * Application State Types for Music Learning Tools
 */

import type { CanvasSpaceColumn } from './coordinates.js';
import type {
  PitchRowData,
  PitchRange,
  PlacedNote,
  PlacedChord,
  TonicSign,
  TonicSignGroups,
  SixteenthStampPlacement,
  TripletStampPlacement,
  SixteenthStampPlaybackData,
  TripletStampPlaybackData,
  MacrobeatGrouping,
  MacrobeatBoundaryStyle,
  ModulationMarker,
  ModulationRatio,
  AnacrusisCache,
  TimbreState,
  TimbresMap,
  LassoSelection,
  DeviceProfile,
  AccidentalMode,
  DegreeDisplayMode,
  PlayheadMode,
  LongNoteStyle,
  PrintOptions,
  ADSREnvelope,
  FilterSettings,
} from './music.js';

// Re-export for convenience
export type { Annotation } from './annotations.js';

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  notes: PlacedNote[];
  tonicSignGroups: TonicSignGroups;
  timbres: TimbresMap;
  placedChords: PlacedChord[];
  sixteenthStampPlacements: SixteenthStampPlacement[];
  tripletStampPlacements: TripletStampPlacement[];
  annotations: unknown[];
  lassoSelection: LassoSelection;
}

/**
 * Complete application state
 */
export interface AppState {
  // Data & History
  placedNotes: PlacedNote[];
  placedChords: PlacedChord[];
  tonicSignGroups: TonicSignGroups;
  sixteenthStampPlacements: SixteenthStampPlacement[];
  tripletStampPlacements: TripletStampPlacement[];
  annotations: unknown[];
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
  timbres: TimbresMap;
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
  /** Canvas-space: musical columns only (0 = first beat). */
  columnWidths: number[];
  /** Canvas-space: legacy per-column widths for some renderers. */
  musicalColumnWidths: number[];
  degreeDisplayMode: DegreeDisplayMode;
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
  playheadMode: PlayheadMode;

  // Waveform
  waveformExtendedView: boolean;

  // ADSR
  adsrTimeAxisScale: number;

  // Print
  isPrintPreviewActive: boolean;
  printOptions: PrintOptions;

  // Long Notes Style
  longNoteStyle: LongNoteStyle;
}

/**
 * Store interface - the public API for state management
 */
export interface Store {
  state: AppState;
  isColdStart?: boolean;
  _anacrusisCache?: AnacrusisCache | null;
  _isBoundaryInAnacrusis: (boundaryIndex: number) => boolean;

  // Event system
  on(eventName: string, callback: (data?: unknown) => void): void;
  emit(eventName: string, data?: unknown): void;

  // Note actions
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

  // History actions
  recordState(): void;
  undo(): void;
  redo(): void;
  clearSavedState(): void;

  // Playback actions
  setPlaybackState(isPlaying: boolean, isPaused: boolean): void;
  setLooping(enabled: boolean): void;
  setPlayheadMode(mode: PlayheadMode): void;

  // Timbre/ADSR actions
  setADSR(color: string, adsr: Partial<ADSREnvelope>): void;
  setHarmonicCoefficients(color: string, coeffs: Float32Array): void;
  setHarmonicPhases(color: string, phases: Float32Array): void;
  setAdsrTimeAxisScale(scale: number): void;
  setAdsrComponentWidth(widthPercent: number): void;

  // Rhythm actions
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

  // Stamp actions
  addSixteenthStampPlacement(sixteenthStampId: number, startColumn: CanvasSpaceColumn, row: number, color?: string): SixteenthStampPlacement;
  removeSixteenthStampPlacement(placementId: string): boolean;
  eraseSixteenthStampsInArea(eraseStartCol: CanvasSpaceColumn, eraseEndCol: CanvasSpaceColumn, eraseStartRow: number, eraseEndRow: number): boolean;
  getAllSixteenthStampPlacements(): SixteenthStampPlacement[];
  getSixteenthStampAt(column: CanvasSpaceColumn, row: number): SixteenthStampPlacement | null;
  clearAllSixteenthStamps(): void;
  getSixteenthStampPlaybackData(): SixteenthStampPlaybackData[];
  updateSixteenthStampShapeOffset(placementId: string, shapeKey: string, rowOffset: number): void;
  getSixteenthStampShapeRow(placement: SixteenthStampPlacement, shapeKey: string): number;

  // Triplet actions
  addTripletStampPlacement(placement: Omit<TripletStampPlacement, 'id'>): TripletStampPlacement;
  removeTripletStampPlacement(placementId: string): boolean;
  eraseTripletStampsInArea(eraseStartCol: number, eraseEndCol: number, eraseStartRow: number, eraseEndRow: number): boolean;
  getAllTripletStampPlacements(): TripletStampPlacement[];
  getTripletStampAt(timeIndex: number, row: number): TripletStampPlacement | null;
  clearAllTripletStamps(): void;
  getTripletStampPlaybackData(): TripletStampPlaybackData[];
  updateTripletStampShapeOffset(placementId: string, shapeKey: string, rowOffset: number): void;
  getTripletStampShapeRow(placement: TripletStampPlacement, shapeKey: string): number;

  // View actions
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
  setDegreeDisplayMode(mode: DegreeDisplayMode): void;
  toggleWaveformExtendedView(): void;
  shiftGridUp(): void;
  shiftGridDown(): void;
  toggleMacrobeatGrouping(measureIndex: number): void;
  cycleMacrobeatBoundaryStyle(boundaryIndex: number): void;
  setFilterSettings(color: string, settings: Partial<FilterSettings>): void;
  setPrintPreviewActive(isActive: boolean): void;
  setPrintOptions(options: Partial<PrintOptions>): void;
  setLongNoteStyle(style: LongNoteStyle): void;

  // Extensible
  [key: string]: unknown;
}
