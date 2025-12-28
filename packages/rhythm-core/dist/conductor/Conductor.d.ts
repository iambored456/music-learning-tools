/**
 * Conductor
 *
 * The authoritative time source for the entire rhythm system.
 * All timing-dependent components derive their time from the Conductor.
 *
 * Supports two modes:
 * - 'playhead-led': Time advances based on wall clock (default)
 * - 'audio-led': Time follows audio playback position
 *
 * The Conductor maintains:
 * - Current session time
 * - Tempo
 * - Play/pause/seek state
 * - Latency offsets for compensation
 */
import type { SessionTimeMs, ConductorConfig, ConductorState, ConductorMode, ConductorStateCallback, LatencyOffsets, AudioTimeSource, Unsubscribe } from '../types.js';
export interface IConductor {
    readonly state: ConductorState;
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    seek(timeMs: SessionTimeMs): void;
    getCurrentTimeMs(): SessionTimeMs;
    getAdjustedTimeMs(offsetKey: keyof LatencyOffsets): SessionTimeMs;
    setMode(mode: ConductorMode): void;
    setAudioSource(source: AudioTimeSource): void;
    setTempo(bpm: number): void;
    setOffsets(offsets: Partial<LatencyOffsets>): void;
    subscribe(callback: ConductorStateCallback): Unsubscribe;
    dispose(): void;
}
/**
 * Create a new Conductor instance.
 *
 * @param config - Configuration options
 * @returns A Conductor instance
 */
export declare function createConductor(config?: Partial<ConductorConfig>): IConductor;
//# sourceMappingURL=Conductor.d.ts.map