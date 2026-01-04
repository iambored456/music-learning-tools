/**
 * Reference Audio Service
 *
 * Plays sine wave reference tones for the demo exercise.
 */
declare class ReferenceAudioService {
    private synth;
    private scheduledTimeouts;
    private volume;
    private startTime;
    private _isPlaying;
    /**
     * Check if a reference tone is currently playing
     */
    get isPlaying(): boolean;
    /**
     * Initialize the audio service
     */
    init(): Promise<void>;
    /**
     * Set reference tone volume
     */
    setVolume(dB: number): void;
    /**
     * Schedule all reference tones for the exercise
     * Uses setTimeout for precise timing aligned with the highway animation
     */
    scheduleReferenceTones(notes: Array<{
        midi: number;
        startTimeMs: number;
        durationMs: number;
    }>): void;
    /**
     * Play a single reference tone immediately
     */
    playTone(midi: number, durationMs: number): void;
    /**
     * Clear all scheduled notes
     */
    clearScheduled(): void;
    /**
     * Stop all audio
     */
    stop(): void;
    /**
     * Dispose of audio resources
     */
    dispose(): void;
}
export declare const referenceAudio: ReferenceAudioService;
export {};
