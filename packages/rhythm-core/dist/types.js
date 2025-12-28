/**
 * @mlt/rhythm-core - Type Definitions
 *
 * Framework-agnostic types for timing, scheduling, chart interpretation,
 * pitch judgment, and session orchestration.
 */
// ============================================================================
// Helper Functions for Branded Types
// ============================================================================
/** Create a SessionTimeMs from a number */
export function asSessionTimeMs(ms) {
    return ms;
}
/** Create an AudioContextTime from a number */
export function asAudioContextTime(seconds) {
    return seconds;
}
/** Create a ScheduledEventId from a string */
export function asScheduledEventId(id) {
    return id;
}
