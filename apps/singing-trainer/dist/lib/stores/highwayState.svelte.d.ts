/**
 * Highway State Store - Svelte 5 Runes
 *
 * State for the "Guitar Hero" note highway visualization mode.
 */
export interface TargetNote {
    midi: number;
    startTimeMs: number;
    durationMs: number;
    hit?: boolean;
}
export interface HighwayState {
    isPlaying: boolean;
    startTime: number | null;
    currentTimeMs: number;
    targetNotes: TargetNote[];
    nowLineX: number;
    pixelsPerSecond: number;
    timeWindowMs: number;
}
export declare const highwayState: {
    readonly state: HighwayState;
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    setTargetNotes(notes: TargetNote[]): void;
    markNoteHit(noteIndex: number): void;
    setNowLineX(x: number): void;
    setPixelsPerSecond(pps: number): void;
    setTimeWindowMs(ms: number): void;
    reset(): void;
};
