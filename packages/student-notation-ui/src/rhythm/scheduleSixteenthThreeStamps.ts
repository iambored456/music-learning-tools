// js/rhythm/scheduleSixteenthThreeStamps.ts
import { getSixteenthThreeStampById } from './sixteenthThreeStamps.js';
import logger from '@utils/logger.ts';
import type { SixteenthThreeStampPlacement } from '@app-types/state.js';

logger.moduleLoaded('SixteenthThreeStampScheduler', 'stamps');

// Three-sixteenth stamps use regular sixteenth-note timing:
// 3 notes each spaced 0.5 microbeats apart (= 1 sixteenth note)
// Slots 0, 1, 2 map to resolveEventTiming's diamond path:
//   offsetSeconds = slot * (quarter / 4), durationSeconds = quarter / 4

export interface SixteenthThreeStampScheduleEvent {
  offset: string | Record<string, number>;
  duration: string;
  type: 'diamond';
  slot: number;
  shapeKey: string;
  rowOffset: number;
  noteId?: string;
}

/**
 * Gets the three-sixteenth stamp scheduling data for a cell
 * @param sixteenthThreeStampId - The ID of the three-sixteenth stamp to schedule
 * @param placement - Optional placement object with shapeOffsets for per-shape pitches
 * @returns Array of scheduling events
 */
export function getSixteenthThreeStampScheduleEvents(sixteenthThreeStampId: number, placement: SixteenthThreeStampPlacement | null = null): SixteenthThreeStampScheduleEvent[] {
  const stamp = getSixteenthThreeStampById(sixteenthThreeStampId);
  if (!stamp) {
    logger.warn('SixteenthThreeStampScheduler', `Unknown three-sixteenth stamp ID: ${sixteenthThreeStampId}`, { sixteenthThreeStampId }, 'stamps');
    return [];
  }

  const events: SixteenthThreeStampScheduleEvent[] = [];

  // Add diamonds with per-shape pitch offsets
  // Each diamond uses type 'diamond' which resolveEventTiming handles as:
  //   offsetSeconds = slot * (quarter / 4)
  //   durationSeconds = quarter / 4
  stamp.diamonds.forEach(slot => {
    const shapeKey = `diamond_${slot}`;
    const rowOffset = placement?.shapeOffsets?.[shapeKey] || 0;

    events.push({
      offset: '0', // offset is computed from slot by resolveEventTiming
      duration: '16n',
      type: 'diamond',
      slot,
      shapeKey,
      rowOffset
    });
  });

  return events;
}
