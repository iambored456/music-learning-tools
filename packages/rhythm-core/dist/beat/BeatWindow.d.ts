/**
 * Beat Window
 *
 * Emits beat events and tracks the current "beat window" state.
 * A beat window is a timing margin around each beat center where
 * actions are considered "on beat".
 *
 * Used for:
 * - Metronome ticks
 * - Visual beat emphasis
 * - Accompaniment scheduling
 */
import type { SessionTimeMs, TimedBeat, BeatWindowConfig, BeatEventCallback, Unsubscribe } from '../types.js';
export interface BeatWindowState {
    /** Current beat index (or -1 if before first beat) */
    currentBeatIndex: number;
    /** Whether we're currently in a beat window */
    inBeatWindow: boolean;
    /** Whether we're in the early part of the window */
    inEarlyWindow: boolean;
    /** Whether we're in the late part of the window */
    inLateWindow: boolean;
    /** Time until next beat (ms, or null if no more beats) */
    msToNextBeat: number | null;
}
export interface IBeatWindow {
    setBeats(beats: TimedBeat[]): void;
    setConfig(config: Partial<BeatWindowConfig>): void;
    getState(currentTimeMs: SessionTimeMs): BeatWindowState;
    getBeatAt(timeMs: SessionTimeMs): TimedBeat | null;
    getNextBeat(afterTimeMs: SessionTimeMs): TimedBeat | null;
    subscribeToBeat(callback: BeatEventCallback): Unsubscribe;
    tick(currentTimeMs: SessionTimeMs): void;
    reset(): void;
}
/**
 * Create a beat window instance.
 */
export declare function createBeatWindow(config?: Partial<BeatWindowConfig>): IBeatWindow;
//# sourceMappingURL=BeatWindow.d.ts.map