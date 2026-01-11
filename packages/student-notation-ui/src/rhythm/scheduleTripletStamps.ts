// js/rhythm/scheduleTripletStamps.ts
import * as Tone from 'tone';
import { getTripletStampById, GROUP_WIDTH_CELLS } from './tripletStamps.js';
import logger from '@utils/logger.ts';
import type { TripletStampPlacement } from '@app-types/state.js';

logger.moduleLoaded('TripletScheduler', 'triplets');

export interface TripletStampScheduleEvent {
  offset: string;
  duration: string;
  type: 'triplet-eighth' | 'triplet-quarter';
  slot: number;
  shapeKey: string;
  rowOffset: number;
}

interface RhythmPlacement {
  timeIndex?: number;
  tripletGroup?: {
    startTimeIndex: number;
    tripletStampId: number;
  };
}

interface TriggerableSynth {
  triggerAttackRelease: (pitch: string, duration: number, time?: number) => void;
}

/**
 * Convert a time index (microbeat) to absolute seconds.
 * Each microbeat = one eighth note ("8n")
 */
function getTimeIndexStartSeconds(timeIndex: number): number {
  // Using Tone.js time notation where 1 microbeat = "8n" (eighth note)
  return Tone.Time(`${timeIndex} * 8n`).toSeconds();
}

/**
 * Gets the triplet scheduling data for a triplet group
 * @param tripletStampId - The ID of the triplet stamp to schedule
 * @param placement - Optional placement object with shapeOffsets for per-shape pitches
 * @returns Array of scheduling events {offset, duration, slot, shapeKey, rowOffset}
 */
export function getTripletStampScheduleEvents(tripletStampId: number, placement: TripletStampPlacement | null = null): TripletStampScheduleEvent[] {
  const stamp = getTripletStampById(tripletStampId);
  if (!stamp) {
    logger.warn('TripletScheduler', `Unknown triplet stamp ID: ${tripletStampId}`, { tripletStampId }, 'triplets');
    return [];
  }

  const events: TripletStampScheduleEvent[] = [];
  const stepStr = stamp.span === 'eighth' ? '8t' : '4t'; // triplet eighth or triplet quarter
  const stepDuration = stepStr; // duration equals the step for clean reads

  // Create events for each active slot in the triplet
  stamp.hits.forEach(slot => {
    const shapeKey = `triplet_${slot}`;
    const rowOffset = placement?.shapeOffsets?.[shapeKey] || 0;

    // Calculate proper offset for each slot using simple multiplication
    let offset: string;
    if (slot === 0) {
      offset = '0';
    } else if (slot === 1) {
      offset = stepStr; // First triplet step (8t or 4t)
    } else if (slot === 2) {
      // Calculate two triplet steps
      const stepSeconds = Tone.Time(stepStr).toSeconds();
      offset = Tone.Time(stepSeconds * 2).toNotation();
    } else {
      // Fallback for other slots
      const stepSeconds = Tone.Time(stepStr).toSeconds();
      offset = Tone.Time(stepSeconds * slot).toNotation();
    }

    events.push({
      offset: offset,
      duration: stepDuration,
      type: stamp.span === 'eighth' ? 'triplet-eighth' : 'triplet-quarter',
      slot: slot,
      shapeKey,
      rowOffset  // Pitch offset from base row
    });
    logger.debug('TripletScheduler', `Triplet stamp ${tripletStampId} ${stamp.span} at slot ${slot} with offset "${offset}", rowOffset: ${rowOffset}`, 'triplets');
  });

  logger.debug('TripletScheduler', `Total events for triplet stamp ${tripletStampId}:`, events.length, 'triplets');
  return events;
}

/**
 * Schedules a single triplet group
 * @param tripletGroup - {startTimeIndex, tripletStampId, pitch}
 * @param synth - The synth to trigger
 */
export function scheduleTripletGroup(
  tripletGroup: { startTimeIndex: number; tripletStampId: number; pitch: string },
  synth: TriggerableSynth
): void {
  const { startTimeIndex, tripletStampId, pitch } = tripletGroup;
  const stamp = getTripletStampById(tripletStampId);

  if (!stamp) {
    logger.warn('TripletScheduler', `Cannot schedule unknown triplet stamp ID: ${tripletStampId}`, { tripletStampId }, 'triplets');
    return;
  }

  const groupStart = getTimeIndexStartSeconds(startTimeIndex);
  const stepStr = stamp.span === 'eighth' ? '8t' : '4t';
  const stepSec = Tone.Time(stepStr).toSeconds();

  logger.debug('TripletScheduler', `Scheduling triplet group`, {
    startTimeIndex,
    tripletStampId,
    pitch,
    groupStart,
    stepStr,
    stepSec,
    hits: stamp.hits
  }, 'triplets');

  // Trigger each active slot
  stamp.hits.forEach(slot => {
    const triggerTime = groupStart + slot * stepSec;
    // Duration: one triplet step reads cleanly; adjust if you want legato/overlap
    synth.triggerAttackRelease(pitch, stepSec, triggerTime);

    logger.debug('TripletScheduler', `Scheduled triplet note`, {
      slot,
      triggerTime,
      duration: stepSec,
      pitch
    }, 'triplets');
  });
}

/**
 * Schedules multiple triplet groups in sequence
 * @param tripletGroupsData - Array of {startTimeIndex, tripletStampId, pitch, synth} objects
 */
export function scheduleTripletGroups(
  tripletGroupsData: { startTimeIndex: number; tripletStampId: number; pitch: string; synth: TriggerableSynth }[]
): void {
  tripletGroupsData.forEach(groupData => {
    scheduleTripletGroup({
      startTimeIndex: groupData.startTimeIndex,
      tripletStampId: groupData.tripletStampId,
      pitch: groupData.pitch
    }, groupData.synth);
  });
}

/**
 * Helper function to get the cell span for a triplet stamp
 * @param tripletStampId - The triplet stamp ID
 * @returns Number of cells the triplet group spans
 */
export function getTripletGroupSpan(tripletStampId: number): number {
  const stamp = getTripletStampById(tripletStampId);
  return stamp ? (GROUP_WIDTH_CELLS[stamp.span] ?? 1) : 1;
}

/**
 * Validates if a triplet group can be placed at the given time index
 * @param startTimeIndex - Starting time index (microbeat)
 * @param tripletStampId - The triplet stamp ID
 * @param existingPlacements - Array of existing rhythm placements to check for conflicts
 * @returns True if placement is valid
 */
export function canPlaceTripletGroup(startTimeIndex: number, tripletStampId: number, existingPlacements: RhythmPlacement[] = []): boolean {
  const span = getTripletGroupSpan(tripletStampId);
  const timeSpan = span * 2;

  // Check if the required cells are available
  for (let i = 0; i < timeSpan; i++) {
    const timeIndex = startTimeIndex + i;
    const hasConflict = existingPlacements.some(placement =>
      placement.timeIndex === timeIndex ||
      (placement.tripletGroup &&
       placement.tripletGroup.startTimeIndex <= timeIndex &&
       timeIndex < placement.tripletGroup.startTimeIndex + (getTripletGroupSpan(placement.tripletGroup.tripletStampId) * 2))
    );

    if (hasConflict) {
      logger.debug('TripletScheduler', `Triplet placement conflict at time ${timeIndex}`, {
        startTimeIndex,
        tripletStampId,
        span
      }, 'triplets');
      return false;
    }
  }

  return true;
}


