/**
 * Pitch Matcher
 *
 * Calculates pitch tolerance and determines if a detected pitch
 * matches a target note within acceptable bounds.
 *
 * Features:
 * - Configurable tolerance in cents
 * - Different tolerance for short notes (looser)
 * - Calculates deviation from target
 */
import type { PitchSample, TimedNote, JudgeConfig } from '../types.js';
/**
 * Result of matching a pitch to a target.
 */
export interface PitchMatchResult {
    /** Whether the pitch is within tolerance */
    isMatch: boolean;
    /** Deviation from target in cents (positive = sharp, negative = flat) */
    deviationCents: number;
    /** Absolute deviation from target in cents */
    absoluteDeviationCents: number;
    /** The tolerance that was used */
    toleranceCents: number;
}
export interface IPitchMatcher {
    match(sample: PitchSample, targetNote: TimedNote): PitchMatchResult;
    matchPitch(detectedMidi: number, targetMidi: number, isShortNote: boolean): PitchMatchResult;
    getToleranceForNote(note: TimedNote): number;
    getDefaultTolerance(): number;
    getShortNoteTolerance(): number;
    setConfig(config: Partial<JudgeConfig>): void;
}
/**
 * Create a pitch matcher instance.
 */
export declare function createPitchMatcher(config?: Partial<JudgeConfig>): IPitchMatcher;
//# sourceMappingURL=PitchMatcher.d.ts.map