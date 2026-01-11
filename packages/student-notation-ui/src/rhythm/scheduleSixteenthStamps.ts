// js/rhythm/scheduleSixteenthStamps.ts
import { getSixteenthStampById } from './sixteenthStamps.js';
import logger from '@utils/logger.ts';
import type { SixteenthStampPlacement } from '@app-types/state.js';

logger.moduleLoaded('SixteenthStampScheduler', 'stamps');

// Time offsets for each slot within a 2-microbeat cell
// slot 0 = start, slot 1 = 1st 16th, slot 2 = 8th beat, slot 3 = 3rd 16th (8n + 16n)
const SLOT_OFFSETS = ['0', '16n', '8n', {'8n': 1, '16n': 1}] as const;

export interface SixteenthStampScheduleEvent {
  offset: string | Record<string, number>;
  duration: string;
  type: 'oval' | 'diamond';
  slot: number;
  shapeKey: string;
  rowOffset: number;
}

/**
 * Gets the stamp scheduling data for a cell
 * @param sixteenthStampId - The ID of the sixteenth stamp to schedule
 * @param placement - Optional placement object with shapeOffsets for per-shape pitches
 * @returns Array of scheduling events {offset, duration, type, slot, shapeKey, rowOffset}
 */
export function getSixteenthStampScheduleEvents(sixteenthStampId: number, placement: SixteenthStampPlacement | null = null): SixteenthStampScheduleEvent[] {
  const stamp = getSixteenthStampById(sixteenthStampId);
  if (!stamp) {
    logger.warn('SixteenthStampScheduler', `Unknown sixteenth stamp ID: ${sixteenthStampId}`, { sixteenthStampId }, 'stamps');
    return [];
  }

  const events: SixteenthStampScheduleEvent[] = [];

  // Add ovals (8th notes) with per-shape pitch offsets
  stamp.ovals.forEach(start => {
    const shapeKey = `oval_${start}`;
    const rowOffset = placement?.shapeOffsets?.[shapeKey] || 0;

    events.push({
      offset: SLOT_OFFSETS[start] as string | Record<string, number>,
      duration: '8n',
      type: 'oval',
      slot: start,
      shapeKey,
      rowOffset  // Pitch offset from base row
    });
  });

  // Add diamonds (16th notes) with per-shape pitch offsets
  stamp.diamonds.forEach(slot => {
    const shapeKey = `diamond_${slot}`;
    const rowOffset = placement?.shapeOffsets?.[shapeKey] || 0;

    events.push({
      offset: SLOT_OFFSETS[slot] as string | Record<string, number>,
      duration: '16n',
      type: 'diamond',
      slot: slot,
      shapeKey,
      rowOffset  // Pitch offset from base row
    });
  });

  return events;
}

/**
 * Helper function to convert cell index to time based on tempo
 * @param cellIndex - The cell index in the sequence
 * @param cellDuration - Duration of each cell in seconds (2 microbeats)
 * @returns Time in seconds
 */
export function cellIndexToTime(cellIndex: number, cellDuration: number): number {
  return cellIndex * cellDuration;
}

/**
 * Helper function to get cell duration based on current tempo
 * Each cell represents 2 microbeats = 1 quarter note = 4 sixteenth notes
 * @param bpm - Beats per minute (quarter note tempo)
 * @returns Cell duration in seconds
 */
export function getCellDuration(bpm: number): number {
  return 60 / bpm; // 1 quarter note duration
}

export { SLOT_OFFSETS };


