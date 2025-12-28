/**
 * @mlt/student-notation-engine
 *
 * Framework-agnostic engine for Student Notation.
 * Provides canvas rendering, audio playback, and state management
 * without any DOM dependencies.
 *
 * Usage:
 *
 * ```typescript
 * import { createEngineController } from '@mlt/student-notation-engine';
 *
 * const engine = createEngineController();
 *
 * engine.init({
 *   pitchGridContext: canvas.getContext('2d'),
 *   drumGridContext: drumCanvas.getContext('2d'),
 * });
 *
 * // Use the public API
 * engine.setTool('note');
 * engine.insertNote(40, 0, 4);
 * engine.play();
 *
 * // Subscribe to events
 * engine.on('noteAdded', (note) => {
 *   console.log('Note added:', note);
 * });
 * ```
 */

// Re-export types from @mlt/types
export type {
  // State
  AppState,
  Store,
  HistoryEntry,

  // Music
  PlacedNote,
  NoteShape,
  PlacedChord,
  TonicSign,
  TonicSignGroups,
  PitchRowData,
  PitchRange,

  // Stamps
  SixteenthStampPlacement,
  TripletStampPlacement,
  SixteenthStampPlaybackData,
  TripletStampPlaybackData,

  // Rhythm
  MacrobeatGrouping,
  MacrobeatBoundaryStyle,
  ModulationMarker,
  ModulationRatio,

  // Timbre
  TimbreState,
  TimbresMap,
  ADSREnvelope,
  FilterSettings,

  // Selection
  LassoSelection,
  LassoSelectedItem,
  GeometryPoint,

  // View
  DeviceProfile,
  AccidentalMode,
  DegreeDisplayMode,
  PlayheadMode,
  LongNoteStyle,
  PrintOptions,

  // Coordinates
  CanvasSpaceColumn,
} from '@mlt/types';

// Controller API
export {
  createEngineController,
  createLessonMode,
  type EngineController,
  type EngineConfig,
  type LessonModeAPI,
  type SelectionItem,
  type HighlightTarget,
  type ActionEvent,
  type ActionHandler,
  type EventCallback,
} from './controller.js';

// State module
export {
  createStore,
  getInitialState,
  fullRowData,
  getPitchByToneNote,
  getPitchByIndex,
  getPitchIndex,
  resolvePitchRange,
  type StoreConfig,
  type StoreInstance,
  type StorageAdapter,
  type Unsubscribe
} from './state/index.js';

// Audio module
export {
  createSynthEngine,
  createTransportService,
  // Context configuration
  configureAudioContext,
  getContextInfo,
  DEFAULT_CONTEXT_OPTIONS,
  // Utilities
  GainManager,
  getPerVoiceBaselineGain,
  ClippingMonitor,
  FilteredVoice,
  setVoiceLogger,
  // Types
  type ContextOptions,
  type SynthEngineInstance,
  type SynthEngineConfig,
  type TransportServiceInstance,
  type TransportConfig,
  type EffectsManager,
  type HarmonicFilter,
  type SynthLogger,
  type GainManagerOptions,
  type ClippingMonitorOptions,
  type FilteredVoiceOptions,
  type FilterParams,
  type VibratoParams,
  type TremoloParams,
  type VoiceLogger,
} from './audio/index.js';

// Canvas module
export {
  renderPitchGrid,
  renderDrumGrid,
  type PitchGridRenderOptions,
  type DrumGridRenderOptions,
} from './canvas/index.js';

// Transport module
export {
  createTimeMapCalculator,
  createDrumManager,
  DEFAULT_DRUM_SAMPLES,
  type TimeMapCalculatorConfig,
  type TimeMapCalculatorInstance,
  type DrumConfig,
  type DrumManagerInstance,
  type DrumTrackId,
  type LoopBounds,
  type TimeMapConfig,
  type TimeMapState,
  type MacrobeatInfo,
  type PlacedTonicSign,
  type TransportLogger,
  type StampPlaybackData,
  type TripletPlaybackData,
  type ScheduleEvent,
  type ModulationMarkerData,
} from './transport/index.js';

// Version
export const VERSION = '0.1.0';
