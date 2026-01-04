import { NotePerformance } from '@mlt/student-notation-engine';
import { TargetNote } from './highwayState.svelte.js';
export interface ExerciseConfig {
    numLoops: number;
    minMidi: number;
    maxMidi: number;
    tempo: number;
    referenceVolume: number;
}
export type ExercisePhase = 'reference' | 'rest1' | 'input' | 'rest2';
export interface ExerciseState {
    isActive: boolean;
    isPlaying: boolean;
    config: ExerciseConfig;
    currentLoop: number;
    currentPhase: ExercisePhase;
    currentPitch: number | null;
    generatedNotes: TargetNote[];
    results: ExerciseResult[];
}
export interface ExerciseResult {
    loopIndex: number;
    targetPitch: number;
    performance: NotePerformance | null;
    accuracy: number;
}
export declare const demoExerciseState: {
    readonly state: ExerciseState;
    /**
     * Update exercise configuration
     */
    configure(newConfig: Partial<ExerciseConfig>): void;
    /**
     * Set pitch range from current Y-axis range
     */
    setPitchRange(minMidi: number, maxMidi: number): void;
    /**
     * Start the demo exercise
     */
    start(): void;
    /**
     * Stop the exercise
     */
    stop(): void;
    /**
     * Mark exercise as playing (called when highway starts)
     */
    setPlaying(playing: boolean): void;
    /**
     * Update current phase based on time
     */
    updatePhase(currentTimeMs: number): void;
    /**
     * Add a performance result for a completed loop
     */
    addResult(result: ExerciseResult): void;
    /**
     * Check if we already have a result for a specific loop
     */
    hasResultForLoop(loopIndex: number): boolean;
    /**
     * Get all results
     */
    getResults(): ExerciseResult[];
    /**
     * Get current progress
     */
    getCurrentProgress(): {
        current: number;
        total: number;
    };
    /**
     * Get generated notes for highway
     */
    getGeneratedNotes(): TargetNote[];
    /**
     * Calculate average accuracy from results
     */
    getAverageAccuracy(): number;
    /**
     * Count hits
     */
    getHitCount(): number;
    /**
     * Reset to default state
     */
    reset(): void;
};
