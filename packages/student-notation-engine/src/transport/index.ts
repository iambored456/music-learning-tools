/**
 * Transport Module
 *
 * Provides time mapping, loop management, and drum playback utilities.
 * Framework-agnostic - all dependencies are injected.
 */

// Time map calculator
export {
  createTimeMapCalculator,
  type TimeMapCalculatorConfig,
  type TimeMapCalculatorInstance
} from './timeMapCalculator.js';

// Drum manager
export {
  createDrumManager,
  DEFAULT_DRUM_SAMPLES
} from './drumManager.js';

// Types
export type {
  LoopBounds,
  TimeMapConfig,
  TimeMapState,
  MacrobeatInfo,
  PlacedTonicSign,
  TransportLogger,
  GetMacrobeatInfoCallback,
  GetPlacedTonicSignsCallback,
  UpdatePlayheadModelCallback,
  DrumConfig,
  DrumManagerInstance,
  DrumTrackId,
  StampPlaybackData,
  TripletPlaybackData,
  ScheduleEvent,
  ModulationMarkerData
} from './types.js';
