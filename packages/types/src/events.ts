/**
 * Event types for Music Learning Tools
 *
 * These define the events emitted by the engine that UI and tutorials can subscribe to.
 */

import type { PlacedNote, LassoSelection, PitchRange } from './music.js';

/**
 * Engine event names and their payloads
 */
export interface EngineEvents {
  // Note events
  noteAdded: PlacedNote;
  noteRemoved: PlacedNote;
  noteUpdated: { note: PlacedNote; changes: Partial<PlacedNote> };
  notesChanged: void;

  // Selection events
  selectionChanged: LassoSelection;

  // Playback events
  playbackStarted: void;
  playbackPaused: void;
  playbackResumed: void;
  playbackStopped: void;
  playheadMoved: { time: number; column: number };
  tempoChanged: number;
  loopingChanged: boolean;

  // History events
  historyChanged: void;
  stateRecorded: void;

  // Tool events
  toolChanged: string;
  noteShapeChanged: string;
  noteColorChanged: string;

  // View events
  pitchRangeChanged: PitchRange;
  layoutConfigChanged: { oldConfig: unknown; newConfig: unknown };
  degreeDisplayModeChanged: string;

  // Timbre events
  timbreChanged: string;
  filterChanged: string;
  audioEffectChanged: { effectType: string; color: string; effectParams?: Record<string, number> };

  // Rhythm events
  rhythmStructureChanged: void;
  modulationMarkersChanged: void;

  // Audio events
  noteAttack: { noteId: string; color: string };
  noteRelease: { noteId: string; color: string };
  volumeChanged: number;

  // Print events
  printPreviewStateChanged: boolean;
  printOptionsChanged: void;
}

/**
 * Type helper for event callbacks
 */
export type EventCallback<E extends keyof EngineEvents> =
  EngineEvents[E] extends void
    ? () => void
    : (data: EngineEvents[E]) => void;

/**
 * Event emitter interface
 */
export interface EventEmitter {
  on<E extends keyof EngineEvents>(event: E, callback: EventCallback<E>): void;
  off<E extends keyof EngineEvents>(event: E, callback: EventCallback<E>): void;
  emit<E extends keyof EngineEvents>(
    event: E,
    ...args: EngineEvents[E] extends void ? [] : [EngineEvents[E]]
  ): void;
}
