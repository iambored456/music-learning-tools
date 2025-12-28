/**
 * Referee
 *
 * Session orchestrator that wires together all rhythm-core components.
 * Manages the complete session lifecycle from chart loading to completion.
 *
 * The Referee:
 * - Never renders UI (separation of concerns)
 * - Owns the session state
 * - Routes pitch samples to the Judge
 * - Manages note activation/deactivation
 * - Coordinates with the gate for lesson modes
 */
import type { SingingTrainerSnapshot } from '@mlt/handoff';
import type { SessionTimeMs, RefereeConfig, SessionState, SessionPhase, SessionStateCallback, PitchSample, JudgmentCallback, BeatEventCallback, Unsubscribe } from '../types.js';
import { type IConductor } from '../conductor/Conductor.js';
import { type IScheduler } from '../scheduler/Scheduler.js';
import { type IChartAdapter } from '../chart/ChartAdapter.js';
import { type IBeatWindow } from '../beat/BeatWindow.js';
import { type IJudge } from '../judge/Judge.js';
import { type IPitchAccuracyGate } from '../gate/PitchAccuracyGate.js';
export interface IReferee {
    loadChart(snapshot: SingingTrainerSnapshot): Promise<void>;
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    seek(timeMs: SessionTimeMs): void;
    readonly sessionState: SessionState;
    getPhase(): SessionPhase;
    readonly conductor: IConductor;
    readonly scheduler: IScheduler;
    readonly chartAdapter: IChartAdapter;
    readonly beatWindow: IBeatWindow;
    readonly judge: IJudge;
    readonly gate: IPitchAccuracyGate;
    onPitchDetected(sample: PitchSample): void;
    subscribeToState(callback: SessionStateCallback): Unsubscribe;
    subscribeToJudgments(callback: JudgmentCallback): Unsubscribe;
    subscribeToBeat(callback: BeatEventCallback): Unsubscribe;
    dispose(): void;
}
/**
 * Create a referee instance.
 */
export declare function createReferee(config?: Partial<RefereeConfig>): IReferee;
//# sourceMappingURL=Referee.d.ts.map