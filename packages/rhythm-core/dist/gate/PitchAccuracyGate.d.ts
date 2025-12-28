/**
 * Pitch Accuracy Gate
 *
 * Controls playhead advancement based on pitch accuracy.
 * When enabled, the gate can pause playback if the singer
 * fails to maintain accurate pitch for too long.
 *
 * Features:
 * - Configurable grace period before gating
 * - Smooth UX by allowing brief inaccuracies
 * - Resume detection when accuracy is restored
 */
import type { SessionTimeMs, GateConfig, GateState, GateStateCallback, Unsubscribe } from '../types.js';
export interface IGateCheckResult {
    /** Should the playhead pause? */
    shouldPause: boolean;
    /** Should the playhead resume (if currently paused)? */
    shouldResume: boolean;
    /** Current gate state */
    state: GateState;
}
export interface IPitchAccuracyGate {
    setConfig(config: Partial<GateConfig>): void;
    getConfig(): GateConfig;
    enable(): void;
    disable(): void;
    isEnabled(): boolean;
    getState(): GateState;
    reportAccuracy(isInTolerance: boolean, timeMs: SessionTimeMs): void;
    checkGate(currentTimeMs: SessionTimeMs): IGateCheckResult;
    forceRelease(): void;
    reset(): void;
    subscribe(callback: GateStateCallback): Unsubscribe;
}
/**
 * Create a pitch accuracy gate instance.
 */
export declare function createPitchAccuracyGate(config?: Partial<GateConfig>): IPitchAccuracyGate;
//# sourceMappingURL=PitchAccuracyGate.d.ts.map