/**
 * Transport Service Types
 *
 * Type definitions for transport and playback functionality.
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
export interface MeasureBoundaryInfo {
  startColumn: number;
  endColumn: number;
}

/** Modulation marker data */
export interface ModulationMarker {
  measureIndex: number;
  ratio: number;
  active: boolean;
  xPosition?: number | null;
}

/** Drum track identifiers */
export type DrumTrackId = 'H' | 'M' | 'L';
