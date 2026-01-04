import { NoteHighwayServiceInstance, NotePerformance } from '@mlt/student-notation-engine';
export interface TargetNote {
    midi: number;
    startTimeMs: number;
    durationMs: number;
    hit?: boolean;
    lyric?: string;
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
    readonly engineService: NoteHighwayServiceInstance | null;
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    setTargetNotes(notes: TargetNote[]): void;
    markNoteHit(noteIndex: number): void;
    setNowLineX(x: number): void;
    setPixelsPerSecond(pps: number): void;
    setTimeWindowMs(ms: number): void;
    recordPitchInput(midi: number, clarity: number): void;
    getPerformanceResults(): Map<string, NotePerformance>;
    reset(): void;
};
