/**
 * Playhead Time Source
 *
 * Provides time based on BPM-driven playhead advancement.
 * Time advances in real-time using performance.now() as the underlying clock.
 *
 * This is the default time source - time is derived from wall clock,
 * not from audio playback position.
 */
import type { SessionTimeMs } from '../types.js';
export interface PlayheadTimeSourceState {
    isRunning: boolean;
    isPaused: boolean;
    currentTimeMs: SessionTimeMs;
}
/**
 * Creates a playhead-led time source.
 *
 * In this mode, session time advances based on wall clock time.
 * The conductor starts at time 0 and advances in real-time.
 *
 * Pause/resume is handled by tracking pause duration and adjusting
 * the start time accordingly, preventing any accumulated drift.
 */
export declare function createPlayheadTimeSource(): {
    getCurrentTimeMs: () => SessionTimeMs;
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    seek: (timeMs: SessionTimeMs) => void;
    isRunning: () => boolean;
    isPaused: () => boolean;
    getState: () => PlayheadTimeSourceState;
};
export type PlayheadTimeSource = ReturnType<typeof createPlayheadTimeSource>;
//# sourceMappingURL=PlayheadTimeSource.d.ts.map