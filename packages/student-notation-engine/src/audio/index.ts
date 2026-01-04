/**
 * Audio Module
 *
 * This module contains:
 * - SynthEngine (Tone.js polyphonic synthesizer management)
 * - TransportService (playback scheduling and timing)
 * - Audio utilities (GainManager, ClippingMonitor, FilteredVoice)
 */

// Synth engine and transport
export { createSynthEngine } from './synthEngine.js';
export { createTransportService } from './transportService.js';

// Audio utilities
export {
  GainManager,
  getPerVoiceBaselineGain,
  DEFAULT_GAIN_MANAGER_OPTIONS,
  type GainManagerOptions
} from './GainManager.js';

export {
  ClippingMonitor,
  DEFAULT_CLIPPING_MONITOR_OPTIONS,
  type ClippingMonitorOptions
} from './ClippingMonitor.js';

export {
  FilteredVoice,
  setVoiceLogger,
  type FilteredVoiceOptions,
  type FilterParams,
  type VibratoParams,
  type TremoloParams,
  type VoiceLogger
} from './FilteredVoice.js';

// Context configuration
export {
  configureAudioContext,
  getContextInfo,
  DEFAULT_CONTEXT_OPTIONS,
  type ContextOptions,
  type LatencyHint
} from './contextConfig.js';

// Types
export type {
  SynthEngineInstance,
  SynthEngineConfig,
  TransportServiceInstance,
  TransportConfig,
  TransportState,
  TransportStateCallbacks,
  TransportEventCallbacks,
  TransportVisualCallbacks,
  PlaybackMode,
  SchedulableNote,
  SchedulableStamp,
  SchedulableTriplet,
  StampScheduleEvent,
  EffectsManager,
  HarmonicFilter,
  SynthLogger,
  AudioInitCallback,
  GetDrumVolumeCallback,
  InternalTimbreState
} from './types.js';
