import type { LoopPhaseTargetMode } from '@mlt/lesson-templates';

export interface InputAttempt {
  voicedMs: number;
  coveragePct: number;
  medianPitchMidi?: number;
  jitterCents?: number;
  withinWindow: boolean;
  result: 'pass' | 'fail';
  reasonCodes?: string[];
  retryDelayMs?: number;
}

export interface InputPhaseContext {
  lessonId: string;
  lessonName: string;
  loopIndex: number;
  inputIndex: number;
  phaseIndex: number;
  phaseLabel?: string;
  phaseTargetMode?: LoopPhaseTargetMode;
  phaseDurationMs: number;
  segmentId?: string;
  segmentName?: string;
  slideDirection?: 'up' | 'down';
}

export interface InputScenarioSession {
  readonly id: string;
  readonly description: string;
  nextInput(context: InputPhaseContext): InputAttempt[];
}

export interface InputScenarioDefinition {
  readonly id: string;
  readonly description: string;
  createSession(): InputScenarioSession;
}

/**
 * Deterministic input facade. It delegates each input phase to the scenario.
 */
export class FakeInput {
  constructor(private readonly session: InputScenarioSession) {}

  get scenarioId(): string {
    return this.session.id;
  }

  get description(): string {
    return this.session.description;
  }

  evaluatePhase(context: InputPhaseContext): InputAttempt[] {
    const attempts = this.session.nextInput(context);
    return attempts.length > 0 ? attempts : [];
  }
}
