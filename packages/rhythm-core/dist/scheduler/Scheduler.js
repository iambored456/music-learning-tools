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
import { asSessionTimeMs, asScheduledEventId } from '../types.js';
import { DEFAULT_SCHEDULER_CONFIG } from '../constants.js';
/**
 * Create a scheduler instance.
 */
export function createScheduler(config = {}) {
    // Merge with defaults
    const fullConfig = {
        ...DEFAULT_SCHEDULER_CONFIG,
        ...config,
    };
    let lookaheadMs = fullConfig.lookaheadMs;
    // All scheduled events, keyed by ID
    const events = new Map();
    // Counter for generating unique IDs
    let idCounter = 0;
    /**
     * Generate a unique event ID.
     */
    function generateId() {
        return asScheduledEventId(`evt_${Date.now()}_${idCounter++}`);
    }
    /**
     * Schedule a single event.
     *
     * @param event - Event to schedule
     * @returns Event ID
     */
    function schedule(event) {
        const id = generateId();
        const scheduledEvent = {
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
    function cancel(id) {
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
    function cancelByType(type) {
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
    function reschedule(id, newTimeMs) {
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
    function scheduleMany(eventInputs) {
        return eventInputs.map(e => schedule(e));
    }
    /**
     * Clear all events (pending and fired).
     */
    function clear() {
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
    function tick(currentTimeMs) {
        // Collect events to fire (within lookahead window)
        const toFire = [];
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
            }
            catch (error) {
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
    function getUpcomingEvents(currentTimeMs, withinMs) {
        const window = withinMs ?? lookaheadMs;
        const endTimeMs = asSessionTimeMs(currentTimeMs + window);
        const upcoming = [];
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
    function getPendingCount() {
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
    function setLookahead(newLookaheadMs) {
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
