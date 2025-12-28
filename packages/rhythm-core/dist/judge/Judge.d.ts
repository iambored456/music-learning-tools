/**
 * Judge
 *
 * Multi-channel pitch judgment system for vocal training.
 *
 * Provides three independent judgment channels:
 * A) Continuous Accuracy (Primary) - % of time pitch is in tolerance
 * B) Onset Incidence - Was voice started correctly?
 * C) Release Incidence - Was note sustained through the end?
 *
 * These channels are kept independent so they can be recombined
 * later for research purposes.
 */
import type { TimedNote, PitchSample, JudgeConfig, JudgmentResult, PitchFeedback, JudgmentCallback, Unsubscribe } from '../types.js';
export interface IJudge {
    setConfig(config: Partial<JudgeConfig>): void;
    getConfig(): JudgeConfig;
    addPitchSample(sample: PitchSample): void;
    startJudgingNote(note: TimedNote): void;
    stopJudgingNote(noteId: string): JudgmentResult | null;
    getActiveJudgments(): string[];
    getCurrentFeedback(noteId: string): PitchFeedback | null;
    isInTolerance(noteId: string): boolean;
    getCompletedJudgments(): JudgmentResult[];
    clearJudgments(): void;
    subscribeToJudgment(callback: JudgmentCallback): Unsubscribe;
}
/**
 * Create a judge instance.
 */
export declare function createJudge(config?: Partial<JudgeConfig>): IJudge;
//# sourceMappingURL=Judge.d.ts.map