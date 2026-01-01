/**
 * Pitch State Store - Svelte 5 Runes
 *
 * Real-time pitch detection state including current pitch and history.
 */
export interface DetectedPitch {
    frequency: number;
    midi: number;
    clarity: number;
    pitchClass: number;
}
export interface PitchHistoryPoint {
    frequency: number;
    midi: number;
    time: number;
    clarity: number;
}
export interface StablePitch {
    pitchClass: number | null;
    opacity: number;
    size: number;
}
export interface PitchState {
    currentPitch: DetectedPitch | null;
    history: PitchHistoryPoint[];
    stablePitch: StablePitch;
}
export declare const pitchState: {
    readonly state: PitchState;
    setCurrentPitch(pitch: DetectedPitch | null): void;
    addHistoryPoint(point: PitchHistoryPoint): void;
    setStablePitch(stable: StablePitch): void;
    clearHistory(): void;
    reset(): void;
};
