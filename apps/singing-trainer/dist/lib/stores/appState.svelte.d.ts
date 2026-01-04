/**
 * App State Store - Svelte 5 Runes
 *
 * Main application state for the Singing Trainer.
 */
export type VisualizationMode = 'stationary' | 'highway';
export type TonicNote = 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B';
export interface DroneState {
    isPlaying: boolean;
    octave: number;
    volume: number;
}
export interface YAxisRange {
    minMidi: number;
    maxMidi: number;
}
export interface AppState {
    isDetecting: boolean;
    visualizationMode: VisualizationMode;
    tonic: TonicNote;
    useDegrees: boolean;
    showAccidentals: boolean;
    pitchHighlightEnabled: boolean;
    yAxisRange: YAxisRange;
    drone: DroneState;
}
export declare const appState: {
    readonly state: AppState;
    toggleDetecting(): void;
    setDetecting(isDetecting: boolean): void;
    setVisualizationMode(mode: VisualizationMode): void;
    setTonic(tonic: TonicNote): void;
    setUseDegrees(useDegrees: boolean): void;
    setShowAccidentals(show: boolean): void;
    togglePitchHighlight(): void;
    setPitchHighlightEnabled(enabled: boolean): void;
    setYAxisRange(range: YAxisRange): void;
    expandYAxisUpper(): void;
    contractYAxisUpper(): void;
    expandYAxisLower(): void;
    contractYAxisLower(): void;
    toggleDrone(): void;
    setDroneOctave(octave: number): void;
    setDroneVolume(volume: number): void;
    reset(): void;
};
