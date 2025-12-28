/**
 * Playhead Time Source
 *
 * Provides time based on BPM-driven playhead advancement.
 * Time advances in real-time using performance.now() as the underlying clock.
 *
 * This is the default time source - time is derived from wall clock,
 * not from audio playback position.
 */
import { asSessionTimeMs } from '../types.js';
/**
 * Creates a playhead-led time source.
 *
 * In this mode, session time advances based on wall clock time.
 * The conductor starts at time 0 and advances in real-time.
 *
 * Pause/resume is handled by tracking pause duration and adjusting
 * the start time accordingly, preventing any accumulated drift.
 */
export function createPlayheadTimeSource() {
    // Wall clock time when session started (performance.now())
    let startWallTimeMs = null;
    // Total accumulated pause duration
    let totalPauseDurationMs = 0;
    // Wall clock time when pause began (null if not paused)
    let pauseStartWallTimeMs = null;
    // Seeked offset (added to calculated time)
    let seekOffsetMs = 0;
    /**
     * Get the current session time.
     * Returns 0 if not running.
     */
    function getCurrentTimeMs() {
        if (startWallTimeMs === null) {
            return asSessionTimeMs(0);
        }
        if (pauseStartWallTimeMs !== null) {
            // Currently paused - return time at pause
            const elapsed = pauseStartWallTimeMs - startWallTimeMs - totalPauseDurationMs;
            return asSessionTimeMs(Math.max(0, elapsed + seekOffsetMs));
        }
        // Running - calculate from wall clock
        const now = performance.now();
        const elapsed = now - startWallTimeMs - totalPauseDurationMs;
        return asSessionTimeMs(Math.max(0, elapsed + seekOffsetMs));
    }
    /**
     * Start the time source.
     */
    function start() {
        startWallTimeMs = performance.now();
        totalPauseDurationMs = 0;
        pauseStartWallTimeMs = null;
        seekOffsetMs = 0;
    }
    /**
     * Stop the time source and reset.
     */
    function stop() {
        startWallTimeMs = null;
        totalPauseDurationMs = 0;
        pauseStartWallTimeMs = null;
        seekOffsetMs = 0;
    }
    /**
     * Pause the time source.
     * Time stops advancing but session remains active.
     */
    function pause() {
        if (startWallTimeMs === null || pauseStartWallTimeMs !== null) {
            return; // Not running or already paused
        }
        pauseStartWallTimeMs = performance.now();
    }
    /**
     * Resume from pause.
     */
    function resume() {
        if (pauseStartWallTimeMs === null) {
            return; // Not paused
        }
        // Add the pause duration to total
        const pauseDuration = performance.now() - pauseStartWallTimeMs;
        totalPauseDurationMs += pauseDuration;
        pauseStartWallTimeMs = null;
    }
    /**
     * Seek to a specific session time.
     * Works whether running, paused, or stopped.
     */
    function seek(timeMs) {
        if (startWallTimeMs === null) {
            // Not started yet - just set the seek offset
            seekOffsetMs = timeMs;
            return;
        }
        const now = performance.now();
        if (pauseStartWallTimeMs !== null) {
            // Paused - adjust so that resume continues from sought time
            const currentPauseDuration = now - pauseStartWallTimeMs;
            totalPauseDurationMs += currentPauseDuration;
            pauseStartWallTimeMs = now;
        }
        // Calculate what elapsed time would give us the target
        const currentElapsed = now - startWallTimeMs - totalPauseDurationMs;
        seekOffsetMs = timeMs - currentElapsed;
    }
    /**
     * Check if the time source is running (started and not stopped).
     */
    function isRunning() {
        return startWallTimeMs !== null;
    }
    /**
     * Check if the time source is paused.
     */
    function isPaused() {
        return pauseStartWallTimeMs !== null;
    }
    /**
     * Get the current state.
     */
    function getState() {
        return {
            isRunning: isRunning(),
            isPaused: isPaused(),
            currentTimeMs: getCurrentTimeMs(),
        };
    }
    return {
        getCurrentTimeMs,
        start,
        stop,
        pause,
        resume,
        seek,
        isRunning,
        isPaused,
        getState,
    };
}
