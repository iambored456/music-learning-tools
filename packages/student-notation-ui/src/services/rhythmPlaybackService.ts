// js/services/rhythmPlaybackService.ts
import * as Tone from 'tone';
import { getSixteenthStampScheduleEvents } from '@/rhythm/scheduleSixteenthStamps.ts';
import { getSixteenthThreeStampScheduleEvents } from '@/rhythm/scheduleSixteenthThreeStamps.ts';
import { getTripletStampScheduleEvents } from '@/rhythm/scheduleTripletStamps.ts';
import store from '@state/initStore.ts';
import SynthEngine from './initAudio.ts';
import logger from '@utils/logger.ts';
import type { SixteenthStampPlacement, SixteenthThreeStampPlacement, TripletStampPlacement } from '@mlt/types';
import { buildSixteenthStampShapeNoteId, buildTripletStampShapeNoteId } from '@utils/stampPlaybackNoteId.ts';

logger.moduleLoaded('RhythmPlaybackService');

interface ScheduledEvent {
  pitch: string;
  color: string;
  attackTime: number;
  releaseTime: number;
  noteId?: string;
}

type TimedStampEvent = {
  offset: string | Record<string, number>;
  duration: string;
  slot: number;
  type: 'oval' | 'diamond' | 'triplet-eighth' | 'triplet-quarter';
};

function getQuarterDurationSeconds(tempoBpm: number): number {
  const safeTempo = Number.isFinite(tempoBpm) && tempoBpm > 0 ? tempoBpm : 120;
  return 60 / safeTempo;
}

function resolveEventTiming(
  event: TimedStampEvent,
  tempoBpm: number
): { offsetSeconds: number; durationSeconds: number } {
  const quarter = getQuarterDurationSeconds(tempoBpm);

  switch (event.type) {
    case 'oval':
      return {
        offsetSeconds: event.slot * (quarter / 4),
        durationSeconds: quarter / 2
      };
    case 'diamond':
      return {
        offsetSeconds: event.slot * (quarter / 4),
        durationSeconds: quarter / 4
      };
    case 'triplet-eighth': {
      const step = quarter / 3;
      return {
        offsetSeconds: event.slot * step,
        durationSeconds: step
      };
    }
    case 'triplet-quarter': {
      const step = (2 * quarter) / 3;
      return {
        offsetSeconds: event.slot * step,
        durationSeconds: step
      };
    }
    default:
      return {
        offsetSeconds: Tone.Time(event.offset as Tone.Unit.Time).toSeconds(),
        durationSeconds: Tone.Time(event.duration as Tone.Unit.Time).toSeconds()
      };
  }
}

/**
 * Service for playing rhythm patterns when clicking on stamped grid cells
 * Converts rhythm stamps into timed note events at the current project tempo
 */
class RhythmPlaybackService {
  private scheduledEvents: ScheduledEvent[] = [];
  private isInitialized = false;
  private scheduleToken = 0;

  constructor() {
    this.scheduledEvents = [];
    this.isInitialized = false;
    this.scheduleToken = 0;
  }

  // Convenience aliases used elsewhere
  init(): Promise<void> {
    return this.initialize();
  }

  refresh(): void {
    this.stopCurrentPattern();
  }

  /**
     * Initialize the service
     */
  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    // Do not start the AudioContext here (this runs during app boot and can trigger
    // browser "user gesture" restrictions). Audio is unlocked via `window.initAudio`
    // in `src/core/main.ts`, and by explicit user actions (e.g. clicking playback).
    this.isInitialized = true;

    logger.info('RhythmPlaybackService', 'Initialized');
  }

  /**
     * Play a rhythm pattern for a clicked cell
     */
  playRhythmPattern(
    sixteenthStampId: number,
    pitch: string,
    color: string,
    noteShape: 'circle' | 'oval' | 'diamond' = 'oval',
    placement: SixteenthStampPlacement | null = null
  ): void {
    if (!this.isInitialized) {
      logger.warn('RhythmPlaybackService', 'Not initialized, call initialize() first');
      return;
    }

    // Clear any previously scheduled preview events
    this.stopCurrentPattern();

    // Get the rhythm stamp's event structure with per-shape offsets
    const events = getSixteenthStampScheduleEvents(sixteenthStampId, placement);

    if (!events || events.length === 0) {
      logger.warn('RhythmPlaybackService', `No events found for sixteenth stamp ${sixteenthStampId}`);
      return;
    }

    logger.debug('RhythmPlaybackService', `Playing pattern for sixteenth stamp ${sixteenthStampId}: ${events.length} notes`, {
      sixteenthStampId,
      basePitch: pitch,
      color,
      events,
      hasShapeOffsets: !!placement?.shapeOffsets
    });

    // Use direct SynthEngine calls with absolute timing
    const now = Tone.now();
    const scheduleToken = this.scheduleToken;
    const tempoBpm = store.state.tempo;

    // Get the base row for calculating per-shape pitches
    // Use globalRow for pitch lookups (fullRowData is never sliced)
    const baseRow = placement?.globalRow ?? placement?.row;

    events.forEach((event, index) => {
      try {
        const { offsetSeconds, durationSeconds } = resolveEventTiming(event as TimedStampEvent, tempoBpm);
        const attackTime = now + offsetSeconds;

        // Adjust duration based on note shape
        // Circle notes (quarter notes) are twice as long as oval notes (eighth notes)
        const duration = noteShape === 'circle' ? durationSeconds * 2 : durationSeconds;

        const releaseTime = attackTime + duration;

        // Calculate pitch for this individual shape
        // If we have placement data with offsets, calculate the specific shape pitch
        let shapePitch = pitch;
        if (baseRow !== undefined && event.rowOffset !== 0) {
          const shapeRow = baseRow + event.rowOffset;
          const rowData = store.state.fullRowData[shapeRow];
          if (rowData) {
            shapePitch = rowData.toneNote.replace('♭', 'b').replace('♯', '#');
          }
        }
        shapePitch = shapePitch.replace('\u266D', 'b').replace('\u266F', '#');
        const noteId = placement?.id && event.shapeKey
          ? buildSixteenthStampShapeNoteId(placement.id, event.shapeKey)
          : undefined;

        // SynthEngine.triggerAttack accepts a time parameter
        // This schedules the note in Web Audio's future
        SynthEngine.triggerAttack(shapePitch, color, attackTime);
        if (noteId) {
          Tone.Draw.schedule(() => {
            if (this.scheduleToken !== scheduleToken) {return;}
            store.emit('noteAttack', { noteId, color });
          }, attackTime);
        }

        // Schedule the release
        SynthEngine.triggerRelease(shapePitch, color, releaseTime);
        if (noteId) {
          Tone.Draw.schedule(() => {
            if (this.scheduleToken !== scheduleToken) {return;}
            store.emit('noteRelease', { noteId, color });
          }, releaseTime);
        }

        // Store the timing info for potential cancellation
        this.scheduledEvents.push({
          pitch: shapePitch,
          color,
          attackTime,
          releaseTime,
          noteId
        });

      } catch (error) {
        logger.warn('RhythmPlaybackService', `Error scheduling note ${index + 1}`, error);
      }
    });

    logger.info('RhythmPlaybackService', `Scheduled ${events.length} notes for rhythm pattern ${sixteenthStampId}`);
  }

  /**
     * Stop the current pattern (release all notes immediately)
     */
  stopCurrentPattern(): void {
    if (this.scheduledEvents.length === 0) {return;}

    logger.debug('RhythmPlaybackService', `Clearing ${this.scheduledEvents.length} scheduled events`);
    this.scheduleToken += 1;

    // Release all notes immediately
    // Note: We can't cancel future-scheduled Web Audio events,
    // but we can release all currently playing notes
    SynthEngine.releaseAll();

    const activeShapeNoteIds = Array.from(new Set(
      this.scheduledEvents
        .map(event => event.noteId)
        .filter((noteId): noteId is string => typeof noteId === 'string' && noteId.length > 0)
    ));
    activeShapeNoteIds.forEach((noteId) => {
      store.emit('noteRelease', { noteId });
    });

    this.scheduledEvents = [];
  }

  /**
     * Check if a stamp exists at a given grid position
     */
  getSixteenthStampAtPosition(columnIndex: number, rowIndex: number): SixteenthStampPlacement | null {
    if (!store.state.sixteenthStampPlacements) {return null;}

    // Find a stamp that overlaps this position
    // Stamps span 2 columns (startColumn and endColumn)
    const stamp = store.state.sixteenthStampPlacements.find(placement => {
      const rowMatches = placement.row === rowIndex;
      const columnMatches = columnIndex >= placement.startColumn &&
                                  columnIndex < placement.endColumn;
      return rowMatches && columnMatches;
    });

    return stamp || null;
  }

  /**
     * Play a triplet rhythm pattern for a clicked cell
     */
  playTripletPattern(tripletStampId: number, pitch: string, color: string, placement: TripletStampPlacement | null = null): void {
    if (!this.isInitialized) {
      logger.warn('RhythmPlaybackService', 'Not initialized, call initialize() first');
      return;
    }

    // Clear any previously scheduled preview events
    this.stopCurrentPattern();

    // Get the triplet's event structure with per-shape offsets
    const events = getTripletStampScheduleEvents(tripletStampId, placement);

    if (!events || events.length === 0) {
      logger.warn('RhythmPlaybackService', `No events found for triplet ${tripletStampId}`);
      return;
    }

    logger.debug('RhythmPlaybackService', `Playing triplet pattern ${tripletStampId}: ${events.length} notes`, {
      tripletStampId,
      basePitch: pitch,
      color,
      events,
      hasShapeOffsets: !!placement?.shapeOffsets
    });

    // Use direct SynthEngine calls with absolute timing
    const now = Tone.now();
    const scheduleToken = this.scheduleToken;
    const tempoBpm = store.state.tempo;
    // Get the base row for calculating per-shape pitches
    // Use globalRow for pitch lookups (fullRowData is never sliced)
    const baseRow = placement?.globalRow ?? placement?.row;

    events.forEach((event, index) => {
      try {
        const { offsetSeconds, durationSeconds } = resolveEventTiming(event as TimedStampEvent, tempoBpm);
        const attackTime = now + offsetSeconds;
        const releaseTime = attackTime + durationSeconds;

        // Calculate pitch for this individual shape
        let shapePitch = pitch;
        if (baseRow !== undefined && event.rowOffset !== 0) {
          const shapeRow = baseRow + event.rowOffset;
          const rowData = store.state.fullRowData[shapeRow];
          if (rowData) {
            shapePitch = rowData.toneNote;
          }
        }
        shapePitch = shapePitch.replace('\u266D', 'b').replace('\u266F', '#');
        const noteId = placement?.id && event.shapeKey
          ? buildTripletStampShapeNoteId(placement.id, event.shapeKey)
          : undefined;

        // Schedule the note
        SynthEngine.triggerAttack(shapePitch, color, attackTime);
        SynthEngine.triggerRelease(shapePitch, color, releaseTime);
        if (noteId) {
          Tone.Draw.schedule(() => {
            if (this.scheduleToken !== scheduleToken) {return;}
            store.emit('noteAttack', { noteId, color });
          }, attackTime);
          Tone.Draw.schedule(() => {
            if (this.scheduleToken !== scheduleToken) {return;}
            store.emit('noteRelease', { noteId, color });
          }, releaseTime);
        }

        // Store the timing info for potential cancellation
        this.scheduledEvents.push({
          pitch: shapePitch,
          color,
          attackTime,
          releaseTime,
          noteId
        });

      } catch (error) {
        logger.warn('RhythmPlaybackService', `Error scheduling triplet note ${index + 1}`, error);
      }
    });

    logger.info('RhythmPlaybackService', `Scheduled ${events.length} notes for triplet pattern ${tripletStampId}`);
  }

  /**
     * Check if a triplet exists at a given grid position
     */
  getTripletStampAtPosition(timeIndex: number, rowIndex: number): TripletStampPlacement | null {
    if (!store.state.tripletStampPlacements) {return null;}

    return store.state.tripletStampPlacements.find(placement =>
      placement.row === rowIndex &&
            timeIndex >= placement.startTimeIndex &&
            timeIndex < placement.startTimeIndex + (placement.span * 2)
    ) || null;
  }

  /**
     * Check if a three-sixteenth stamp exists at a given time-space position
     */
  getSixteenthThreeStampAtPosition(timeIndex: number, rowIndex: number): SixteenthThreeStampPlacement | null {
    if (!store.state.sixteenthThreeStampPlacements) {return null;}

    const stamp = store.state.sixteenthThreeStampPlacements.find(placement => {
      const rowMatches = placement.row === rowIndex;
      const timeMatches = timeIndex >= placement.startTimeIndex &&
                                  timeIndex < placement.startTimeIndex + 1.5;
      return rowMatches && timeMatches;
    });

    return stamp || null;
  }

  /**
     * Play a three-sixteenth rhythm pattern for a clicked cell
     */
  playThreeRhythmPattern(
    sixteenthThreeStampId: number,
    pitch: string,
    color: string,
    noteShape: 'circle' | 'oval' | 'diamond' = 'oval',
    placement: SixteenthThreeStampPlacement | null = null
  ): void {
    if (!this.isInitialized) {
      logger.warn('RhythmPlaybackService', 'Not initialized, call initialize() first');
      return;
    }

    this.stopCurrentPattern();

    const events = getSixteenthThreeStampScheduleEvents(sixteenthThreeStampId, placement);

    if (!events || events.length === 0) {
      logger.warn('RhythmPlaybackService', `No events found for three-sixteenth stamp ${sixteenthThreeStampId}`);
      return;
    }

    logger.debug('RhythmPlaybackService', `Playing three-sixteenth pattern ${sixteenthThreeStampId}: ${events.length} notes`, {
      sixteenthThreeStampId,
      basePitch: pitch,
      color,
      events,
      hasShapeOffsets: !!placement?.shapeOffsets
    });

    const now = Tone.now();
    const scheduleToken = this.scheduleToken;
    const tempoBpm = store.state.tempo;
    const baseRow = placement?.globalRow ?? placement?.row;

    events.forEach((event, index) => {
      try {
        const { offsetSeconds, durationSeconds } = resolveEventTiming(event as TimedStampEvent, tempoBpm);
        const attackTime = now + offsetSeconds;
        const duration = noteShape === 'circle' ? durationSeconds * 2 : durationSeconds;
        const releaseTime = attackTime + duration;

        let shapePitch = pitch;
        if (baseRow !== undefined && event.rowOffset !== 0) {
          const shapeRow = baseRow + event.rowOffset;
          const rowData = store.state.fullRowData[shapeRow];
          if (rowData) {
            shapePitch = rowData.toneNote.replace('♭', 'b').replace('♯', '#');
          }
        }
        shapePitch = shapePitch.replace('\u266D', 'b').replace('\u266F', '#');
        const noteId = placement?.id && event.shapeKey
          ? buildSixteenthStampShapeNoteId(placement.id, event.shapeKey)
          : undefined;

        SynthEngine.triggerAttack(shapePitch, color, attackTime);
        if (noteId) {
          Tone.Draw.schedule(() => {
            if (this.scheduleToken !== scheduleToken) {return;}
            store.emit('noteAttack', { noteId, color });
          }, attackTime);
        }

        SynthEngine.triggerRelease(shapePitch, color, releaseTime);
        if (noteId) {
          Tone.Draw.schedule(() => {
            if (this.scheduleToken !== scheduleToken) {return;}
            store.emit('noteRelease', { noteId, color });
          }, releaseTime);
        }

        this.scheduledEvents.push({
          pitch: shapePitch,
          color,
          attackTime,
          releaseTime,
          noteId
        });

      } catch (error) {
        logger.warn('RhythmPlaybackService', `Error scheduling three-sixteenth note ${index + 1}`, error);
      }
    });

    logger.info('RhythmPlaybackService', `Scheduled ${events.length} notes for three-sixteenth pattern ${sixteenthThreeStampId}`);
  }

  /**
     * Dispose of the service and clean up resources
     */
  dispose(): void {
    this.stopCurrentPattern();
    this.isInitialized = false;
    logger.info('RhythmPlaybackService', 'Disposed');
  }
}

// Create singleton instance
const rhythmPlaybackService = new RhythmPlaybackService();

export default rhythmPlaybackService;
