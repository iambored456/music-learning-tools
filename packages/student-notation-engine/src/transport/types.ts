/**
 * Transport Module Types
 *
 * Type definitions for transport and playback functionality.
 * Framework-agnostic - no DOM or store dependencies.
 */

import type * as Tone from 'tone';

/** Configured loop boundary state */
export interface LoopBounds {
  loopStart: number;
  loopEnd: number;
}

/** Time map configuration for playhead model updates */
export interface TimeMapConfig {
  timeMap: number[];
  musicalEndTime: number;
  columnWidths: number[];
  cellWidth: number;
}

/** Playback data for a stamp */
export interface StampPlaybackData {
  sixteenthStampId: string;
  column: number;
  row: number;
  pitch: string;
  color: string;
  placement?: {
    shapeOffsets?: Record<string, number>;
  };
}

/** Playback data for a triplet */
export interface TripletPlaybackData {
  tripletStampId: string;
  startTimeIndex: number;
  row: number;
  color: string;
  placement?: {
    shapeOffsets?: Record<string, number>;
  };
}

/** Schedule event for stamp/triplet playback */
export interface ScheduleEvent {
  offset: Tone.Unit.Time;
  duration: Tone.Unit.Time;
  rowOffset: number;
  slot?: number;
}

/** Measure boundary information for modulation */
export interface MacrobeatInfo {
  startColumn: number;
  endColumn: number;
}

/** Modulation marker data */
export interface ModulationMarkerData {
  measureIndex: number;
  ratio: number;
  active: boolean;
  xPosition?: number | null;
}

/** Drum track identifiers */
export type DrumTrackId = 'H' | 'M' | 'L';

/** Placed tonic sign for time map calculation */
export interface PlacedTonicSign {
  columnIndex: number;
  spanColumns?: number;
}

/** State subset needed for time map calculation */
export interface TimeMapState {
  tempo: number;
  columnWidths: number[];
  hasAnacrusis: boolean;
  macrobeatBoundaryStyles: string[];
  modulationMarkers?: ModulationMarkerData[];
  isLooping: boolean;
  cellWidth: number;
}

/** Logger interface for transport utilities */
export interface TransportLogger {
  debug(category: string, message: string, data?: unknown, context?: string): void;
  timing?(category: string, message: string, data?: unknown): void;
}

/** Callback to get macrobeat info by index */
export type GetMacrobeatInfoCallback = (index: number) => MacrobeatInfo | null;

/** Callback to get placed tonic signs */
export type GetPlacedTonicSignsCallback = () => PlacedTonicSign[];

/** Callback to update playhead model */
export type UpdatePlayheadModelCallback = (config: TimeMapConfig) => void;

/** Drum player configuration */
export interface DrumConfig {
  /** URLs for drum samples (uses defaults if not provided) */
  samples?: Record<DrumTrackId, string>;
  /** Synth engine instance for audio routing */
  synthEngine?: {
    getMainVolumeNode(): Tone.Volume | null;
  };
  /** Initial volume in dB */
  initialVolume?: number;
}

/** Drum manager instance */
export interface DrumManagerInstance {
  /** Get the Tone.Players instance */
  getPlayers(): Tone.Players | null;
  /** Get the volume control node */
  getVolumeNode(): Tone.Volume | null;
  /** Trigger a drum hit */
  trigger(trackId: DrumTrackId, time: number): void;
  /** Reset timing state */
  reset(): void;
  /** Dispose resources */
  dispose(): void;
}
