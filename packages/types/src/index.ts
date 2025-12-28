/**
 * @mlt/types - Shared TypeScript types for Music Learning Tools
 *
 * This package contains all shared type definitions used across the monorepo.
 */

// Coordinate system types
export {
  type CanvasSpaceColumn,
  type FullSpaceColumn,
  isCanvasSpaceColumn,
  isFullSpaceColumn,
  createCanvasSpaceColumn,
  createFullSpaceColumn,
  unwrapColumn,
} from './coordinates.js';

// Music domain types
export {
  // Pitch & Row
  type PitchRowData,
  type PitchRange,
  type PitchViewportRange,

  // Notes
  type NoteShape,
  type PlacedNote,
  type AnimatableNote,
  type PlacedChord,

  // Tonic & Harmony
  type TonicSign,
  type TonicSignGroups,

  // Stamps
  type SixteenthStampPlacement,
  type TripletStampPlacement,
  type SixteenthStampPlaybackData,
  type TripletStampPlaybackData,

  // Rhythm & Time
  type MacrobeatGrouping,
  type MacrobeatBoundaryStyle,
  type ModulationRatio,
  type ModulationMarker,
  type AnacrusisCache,

  // Timbre & Audio
  type ADSREnvelope,
  type FilterSettings,
  type VibratoSettings,
  type TremoloSettings,
  type TimbreState,
  type TimbresMap,

  // Selection
  type GeometryPoint,
  type LassoSelectedItem,
  type LassoSelection,

  // Device & View
  type DeviceProfile,
  type AccidentalMode,
  type DegreeDisplayMode,
  type PlayheadMode,
  type LongNoteStyle,

  // Print
  type PageSize,
  type Orientation,
  type ColorMode,
  type PrintOptions,
} from './music.js';

// State types
export {
  type HistoryEntry,
  type AppState,
  type Store,
} from './state.js';

// Annotation types
export {
  type Annotation,
  type BaseAnnotation,
  type FreehandAnnotation,
  type TextAnnotation,
} from './annotations.js';

// Event types
export {
  type EngineEvents,
  type EventCallback,
  type EventEmitter,
} from './events.js';
