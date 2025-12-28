/**
 * Scheduler
 *
 * Schedules events to fire at specific times with lookahead.
 * Events are scheduled ahead of time to prevent jitter during
 * frame drops or performance issues.
 *
 * Key features:
 * - Configurable lookahead window
 * - Event cancellation and rescheduling
 * - Categorized events (accompaniment, gate, beat, custom)
 * - Efficient tick-based processing
 */

import type {
  SessionTimeMs,
  ScheduledEvent,
  ScheduledEventId,
  ScheduledEventType,
  SchedulerConfig,
} from '../types.js';
import { asSessionTimeMs, asScheduledEventId } from '../types.js';
import { DEFAULT_SCHEDULER_CONFIG } from '../constants.js';

/**
 * Event input without system-managed fields.
 */
export interface ScheduledEventInput {
  timeMs: SessionTimeMs;
  type: ScheduledEventType;
  callback: () => void;
}

export interface IScheduler {
  // Event management
  schedule(event: ScheduledEventInput): ScheduledEventId;
  cancel(id: ScheduledEventId): boolean;
  cancelByType(type: ScheduledEventType): number;
  reschedule(id: ScheduledEventId, newTimeMs: SessionTimeMs): boolean;

  // Bulk operations
  scheduleMany(events: ScheduledEventInput[]): ScheduledEventId[];
  clear(): void;

  // Processing
  tick(currentTimeMs: SessionTimeMs): void;

  // State queries
  getUpcomingEvents(currentTimeMs: SessionTimeMs, withinMs?: number): ScheduledEvent[];
  getPendingCount(): number;

  // Configuration
  setLookahead(lookaheadMs: number): void;
}

/**
 * Create a scheduler instance.
 */
export function createScheduler(config: Partial<SchedulerConfig> = {}): IScheduler {
  // Merge with defaults
  const fullConfig: SchedulerConfig = {
    ...DEFAULT_SCHEDULER_CONFIG,
    ...config,
  };

  let lookaheadMs = fullConfig.lookaheadMs;

  // All scheduled events, keyed by ID
  const events: Map<ScheduledEventId, ScheduledEvent> = new Map();

  // Counter for generating unique IDs
  let idCounter = 0;

  /**
   * Generate a unique event ID.
   */
  function generateId(): ScheduledEventId {
    return asScheduledEventId(`evt_${Date.now()}_${idCounter++}`);
  }

  /**
   * Schedule a single event.
   *
   * @param event - Event to schedule
   * @returns Event ID
   */
  function schedule(event: ScheduledEventInput): ScheduledEventId {
    const id = generateId();

    const scheduledEvent: ScheduledEvent = {
      id,
      timeMs: event.timeMs,
      type: event.type,
      callback: event.callback,
      fired: false,
      cancelled: false,
    };

    events.set(id, scheduledEvent);
    return id;
  }

  /**
   * Cancel a scheduled event.
   *
   * @param id - Event ID to cancel
   * @returns True if event was found and cancelled
   */
  function cancel(id: ScheduledEventId): boolean {
    const event = events.get(id);
    if (!event || event.fired || event.cancelled) {
      return false;
    }

    event.cancelled = true;
    return true;
  }

  /**
   * Cancel all events of a specific type.
   *
   * @param type - Event type to cancel
   * @returns Number of events cancelled
   */
  function cancelByType(type: ScheduledEventType): number {
    let count = 0;

    for (const event of events.values()) {
      if (event.type === type && !event.fired && !event.cancelled) {
        event.cancelled = true;
        count++;
      }
    }

    return count;
  }

  /**
   * Reschedule an event to a new time.
   *
   * @param id - Event ID to reschedule
   * @param newTimeMs - New time for the event
   * @returns True if event was found and rescheduled
   */
  function reschedule(id: ScheduledEventId, newTimeMs: SessionTimeMs): boolean {
    const event = events.get(id);
    if (!event || event.fired || event.cancelled) {
      return false;
    }

    event.timeMs = newTimeMs;
    return true;
  }

  /**
   * Schedule multiple events at once.
   *
   * @param eventInputs - Events to schedule
   * @returns Array of event IDs
   */
  function scheduleMany(eventInputs: ScheduledEventInput[]): ScheduledEventId[] {
    return eventInputs.map(e => schedule(e));
  }

  /**
   * Clear all events (pending and fired).
   */
  function clear(): void {
    events.clear();
    idCounter = 0;
  }

  /**
   * Process events that should fire at or before the current time.
   *
   * This should be called regularly (e.g., every animation frame)
   * with the current session time.
   *
   * @param currentTimeMs - Current session time
   */
  function tick(currentTimeMs: SessionTimeMs): void {
    // Collect events to fire (within lookahead window)
    const toFire: ScheduledEvent[] = [];

    for (const event of events.values()) {
      if (event.fired || event.cancelled) {
        continue;
      }

      // Fire if event time is at or before current time
      if (event.timeMs <= currentTimeMs) {
        toFire.push(event);
      }
    }

    // Sort by time to fire in order
    toFire.sort((a, b) => a.timeMs - b.timeMs);

    // Fire events
    for (const event of toFire) {
      event.fired = true;
      try {
        event.callback();
      } catch (error) {
        console.error('Scheduler: Error in event callback', error);
      }
    }

    // Cleanup old events (fired or cancelled, older than lookahead)
    const cleanupThreshold = asSessionTimeMs(currentTimeMs - lookaheadMs * 2);

    for (const [id, event] of events) {
      if ((event.fired || event.cancelled) && event.timeMs < cleanupThreshold) {
        events.delete(id);
      }
    }
  }

  /**
   * Get upcoming events within a time window.
   *
   * @param currentTimeMs - Current session time
   * @param withinMs - Window size (defaults to lookahead)
   * @returns Array of upcoming events
   */
  function getUpcomingEvents(currentTimeMs: SessionTimeMs, withinMs?: number): ScheduledEvent[] {
    const window = withinMs ?? lookaheadMs;
    const endTimeMs = asSessionTimeMs(currentTimeMs + window);

    const upcoming: ScheduledEvent[] = [];

    for (const event of events.values()) {
      if (event.fired || event.cancelled) {
        continue;
      }

      if (event.timeMs >= currentTimeMs && event.timeMs < endTimeMs) {
        upcoming.push(event);
      }
    }

    // Sort by time
    upcoming.sort((a, b) => a.timeMs - b.timeMs);

    return upcoming;
  }

  /**
   * Get count of pending (not fired, not cancelled) events.
   */
  function getPendingCount(): number {
    let count = 0;

    for (const event of events.values()) {
      if (!event.fired && !event.cancelled) {
        count++;
      }
    }

    return count;
  }

  /**
   * Update the lookahead window.
   */
  function setLookahead(newLookaheadMs: number): void {
    lookaheadMs = Math.max(0, newLookaheadMs);
  }

  return {
    schedule,
    cancel,
    cancelByType,
    reschedule,
    scheduleMany,
    clear,
    tick,
    getUpcomingEvents,
    getPendingCount,
    setLookahead,
  };
}
