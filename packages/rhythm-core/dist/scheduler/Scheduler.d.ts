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
import type { SessionTimeMs, ScheduledEvent, ScheduledEventId, ScheduledEventType, SchedulerConfig } from '../types.js';
/**
 * Event input without system-managed fields.
 */
export interface ScheduledEventInput {
    timeMs: SessionTimeMs;
    type: ScheduledEventType;
    callback: () => void;
}
export interface IScheduler {
    schedule(event: ScheduledEventInput): ScheduledEventId;
    cancel(id: ScheduledEventId): boolean;
    cancelByType(type: ScheduledEventType): number;
    reschedule(id: ScheduledEventId, newTimeMs: SessionTimeMs): boolean;
    scheduleMany(events: ScheduledEventInput[]): ScheduledEventId[];
    clear(): void;
    tick(currentTimeMs: SessionTimeMs): void;
    getUpcomingEvents(currentTimeMs: SessionTimeMs, withinMs?: number): ScheduledEvent[];
    getPendingCount(): number;
    setLookahead(lookaheadMs: number): void;
}
/**
 * Create a scheduler instance.
 */
export declare function createScheduler(config?: Partial<SchedulerConfig>): IScheduler;
//# sourceMappingURL=Scheduler.d.ts.map