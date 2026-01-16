/**
 * Audio Module Types
 */

import type * as Tone from 'tone';
import type { TimbresMap, TimbreState } from '@mlt/types';

/**
 * Effects manager interface for synth-level effects (reverb, delay).
 * The app provides this to the engine for effect routing.
 */
export interface EffectsManager {
  /** Apply synth-level effects (e.g., reverb, delay) */
  applySynthEffects(synth: unknown, color: string, masterGain: Tone.Gain): void;
  /** Apply effects to a specific voice */
  applyEffectsToVoice(voice: unknown, color: string): void;
}

/**
 * Harmonic filter interface for getting filtered coefficients.
 * The app provides this to handle frequency-dependent filtering.
 */
export interface HarmonicFilter {
  /** Get filtered coefficients for a color */
  getFilteredCoefficients(color: string): Float32Array;
}

/**
 * Logger interface for synth engine.
 */
export interface SynthLogger {
  debug(category: string, message: string, data?: unknown, context?: string): void;
  info(category: string, message: string, data?: unknown, context?: string): void;
  warn(category: string, message: string, data?: unknown, context?: string): void;
}

/**
 * Callback for audio initialization (user gesture).
 */
export type AudioInitCallback = () => Promise<void>;

/**
 * Callback for getting drum volume.
 */
export type GetDrumVolumeCallback = () => number;

/**
 * Synth Engine Instance
 */
export interface SynthEngineInstance {
  /** Initialize the synth engine */
  init(): void;

  /** Play a note */
  playNote(pitch: string | number, duration: number | string, time?: number): Promise<void>;

  /** Trigger attack for a note (used by Transport scheduling) */
  triggerAttack(pitch: string | number, color: string, time?: number, isDrum?: boolean): void;

  /**
   * Trigger attack for interactive (user-initiated) events.
   * Adds a small scheduling offset to help avoid audio pops.
   */
  triggerAttackInteractive(pitch: string | number, color: string): void;

  /** Quick release for specific pitches (used during note dragging) */
  quickReleasePitches(pitches: Array<string | number>, color: string): void;

  /** Trigger release for a note */
  triggerRelease(pitch: string | number, color: string, time?: number): void;

  /** Release all voices */
  releaseAll(): void;

  /** Update synth for a specific timbre color */
  updateSynthForColor(color: string): void;

  /** Set the BPM */
  setBpm(tempo: number): void;

  /** Set the master volume in dB */
  setVolume(dB: number): void;

  /** Get the master gain node for external connections */
  getMasterGainNode(): Tone.Gain | null;

  /** Get the main volume node */
  getMainVolumeNode(): Tone.Volume | null;

  /** Get a synth by color */
  getSynth(color: string): unknown | null;

  /** Get all synths */
  getAllSynths(): Record<string, unknown>;

  /** Create waveform analyzer for visualization */
  createWaveformAnalyzer(color: string): Tone.Analyser | null;

  /** Get waveform analyzer for a color */
  getWaveformAnalyzer(color: string): Tone.Analyser | null;

  /** Get all waveform analyzers */
  getAllWaveformAnalyzers(): Map<string, Tone.Analyser>;

  /** Remove waveform analyzer */
  removeWaveformAnalyzer(color: string): void;

  /** Dispose all waveform analyzers */
  disposeAllWaveformAnalyzers(): void;

  /** Stop background monitors */
  stopBackgroundMonitors(): void;

  /** Clean up resources */
  dispose(): void;
}

/**
 * Transport Service Instance
 */
export interface TransportServiceInstance {
  /** Initialize the transport */
  init(): void;

  /** Start playback from the beginning */
  start(): void;

  /** Resume paused playback */
  resume(): void;

  /** Pause playback */
  pause(): void;

  /** Stop playback and reset */
  stop(): void;

  /** Handle state changes (notes or rhythm changed) */
  handleStateChange(): void;

  /** Clean up resources */
  dispose(): void;
}

/**
 * Configuration for synth engine
 */
export interface SynthEngineConfig {
  /** Initial timbres */
  timbres: TimbresMap;
  /** Master volume in dB */
  masterVolume?: number;
  /** Optional effects manager */
  effectsManager?: EffectsManager;
  /** Optional harmonic filter */
  harmonicFilter?: HarmonicFilter;
  /** Optional logger */
  logger?: SynthLogger;
  /** Optional audio init callback (for user gesture compliance) */
  audioInit?: AudioInitCallback;
  /** Optional drum volume callback */
  getDrumVolume?: GetDrumVolumeCallback;
  /** Callback when timbre is updated */
  onTimbreUpdated?: (color: string) => void;
}

/**
 * Placed note for scheduling
 */
export interface SchedulableNote {
  uuid: string;
  startColumnIndex: number;
  endColumnIndex: number;
  globalRow?: number;
  row: number;
  shape: 'circle' | 'oval' | string;
  color: string;
  isDrum?: boolean;
  drumTrack?: number | null;
}

/**
 * Stamp playback data for scheduling
 */
export interface SchedulableStamp {
  sixteenthStampId: string | number;
  column: number;
  row: number;
  color: string;
  placement?: {
    shapeOffsets?: Record<string, number>;
  };
}

/**
 * Triplet playback data for scheduling
 */
export interface SchedulableTriplet {
  tripletStampId: string | number;
  startTimeIndex: number;
  row: number;
  color: string;
  placement?: {
    shapeOffsets?: Record<string, number>;
  };
}

/**
 * Schedule event for stamps/triplets
 */
export interface StampScheduleEvent {
  offset: Tone.Unit.Time;
  duration: Tone.Unit.Time;
  rowOffset: number;
  slot?: number;
}

/**
 * State subset needed by transport service
 */
export interface TransportState {
  tempo: number;
  columnWidths: number[];
  hasAnacrusis: boolean;
  macrobeatBoundaryStyles: string[];
  tempoModulationMarkers?: Array<{
    measureIndex: number;
    ratio: number;
    active: boolean;
    xPosition?: number | null;
  }>;
  isLooping: boolean;
  isPaused: boolean;
  cellWidth: number;
  placedNotes: SchedulableNote[];
  timbres: TimbresMap;
  fullRowData: Array<{ toneNote: string; hex?: string }>;
  playheadMode: 'line' | 'microbeat' | 'macrobeat';
}

/**
 * Callbacks for transport visual updates (decouples from DOM)
 */
export interface TransportVisualCallbacks {
  /** Clear playhead canvas */
  clearPlayheadCanvas?: () => void;
  /** Clear drum playhead canvas */
  clearDrumPlayheadCanvas?: () => void;
  /** Draw playhead line at position */
  drawPlayheadLine?: (x: number, canvasHeight: number) => void;
  /** Draw pulsing column highlight */
  drawPlayheadHighlight?: (x: number, width: number, canvasHeight: number, timestamp: number) => void;
  /** Draw drum playhead line */
  drawDrumPlayheadLine?: (x: number, canvasHeight: number) => void;
  /** Draw drum playhead highlight */
  drawDrumPlayheadHighlight?: (x: number, width: number, canvasHeight: number, timestamp: number) => void;
  /** Update beat line highlight position (for button rows) */
  updateBeatLineHighlight?: (x: number, width: number, visible: boolean) => void;
  /** Trigger note pop animation on drum grid */
  triggerDrumNotePop?: (columnIndex: number, drumTrack: number) => void;
  /** Trigger ADSR playhead visual */
  triggerAdsrVisual?: (noteId: string, phase: 'attack' | 'release', color: string, adsr: any) => void;
  /** Clear all ADSR visuals */
  clearAdsrVisuals?: () => void;
  /** Get canvas logical width */
  getPlayheadCanvasWidth?: () => number;
  /** Get canvas logical height */
  getPlayheadCanvasHeight?: () => number;
  /** Get drum canvas logical height */
  getDrumCanvasHeight?: () => number;
}

/**
 * Callbacks for transport state access (decouples from store)
 */
export interface TransportStateCallbacks {
  /** Get current state */
  getState: () => TransportState;
  /** Get stamp playback data */
  getStampPlaybackData?: () => SchedulableStamp[];
  /** Get stamp schedule events */
  getStampScheduleEvents?: (stampId: string | number, placement?: any) => StampScheduleEvent[];
  /** Get triplet playback data */
  getTripletPlaybackData?: () => SchedulableTriplet[];
  /** Get triplet schedule events */
  getTripletScheduleEvents?: (tripletId: string | number, placement?: any) => StampScheduleEvent[];
  /** Convert time index to canvas column */
  timeToCanvas?: (timeIndex: number, state: TransportState) => number;
  /** Get placed tonic signs */
  getPlacedTonicSigns?: () => Array<{ columnIndex: number; spanColumns?: number }>;
  /** Get tonic span column indices */
  getTonicSpanColumnIndices?: (tonicSigns: Array<{ columnIndex: number; spanColumns?: number }>) => Set<number>;
  /** Get macrobeat info by index */
  getMacrobeatInfo?: (index: number) => { startColumn: number; endColumn: number } | null;
  /** Get column start X position */
  getColumnStartX?: (columnIndex: number) => number;
  /** Get column width */
  getColumnWidth?: (columnIndex: number) => number;
  /** Get total canvas width */
  getCanvasWidth?: () => number;
  /** Get macrobeat highlight rect for column */
  getMacrobeatHighlightRect?: (columnIndex: number) => { x: number; width: number } | null;
}

/**
 * Callbacks for transport events (decouples from store)
 */
export interface TransportEventCallbacks {
  /** Subscribe to state changes */
  on: (event: string, handler: (data?: any) => void) => void;
  /** Emit event */
  emit: (event: string, data?: any) => void;
  /** Set playback state */
  setPlaybackState?: (isPlaying: boolean, isPaused: boolean) => void;
}

/**
 * Playback mode for the transport service.
 */
export type PlaybackMode = 'standard' | 'highway';

/**
 * Configuration for transport service
 */
export interface TransportConfig {
  /** Synth engine instance */
  synthEngine: SynthEngineInstance;
  /** State access callbacks */
  stateCallbacks: TransportStateCallbacks;
  /** Event callbacks */
  eventCallbacks: TransportEventCallbacks;
  /** Visual update callbacks (optional - for headless operation) */
  visualCallbacks?: TransportVisualCallbacks;
  /** Optional logger */
  logger?: SynthLogger;
  /** Optional audio init callback (for user gesture compliance) */
  audioInit?: AudioInitCallback;
  /** Playback mode (default: 'standard') */
  playbackMode?: PlaybackMode;
  /** Note Highway service instance (required when playbackMode is 'highway') */
  highwayService?: any; // Using 'any' to avoid circular dependency with highway module
}

/**
 * Extended timbre state for internal synth use
 * Note: gain, vibrato, tremelo, and filter are inherited from TimbreState
 * This interface can be extended with additional internal-only properties
 */
export interface InternalTimbreState extends TimbreState {
  // Inherits all properties from TimbreState including:
  // gain, vibrato, tremelo, filter
}
