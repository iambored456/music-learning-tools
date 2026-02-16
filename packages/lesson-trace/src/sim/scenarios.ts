import type {
  InputAttempt,
  InputPhaseContext,
  InputScenarioDefinition,
  InputScenarioSession,
} from './fakeInput.js';

function passAttempt(context: InputPhaseContext): InputAttempt {
  return {
    voicedMs: Math.max(220, Math.round(context.phaseDurationMs * 0.8)),
    coveragePct: 92,
    medianPitchMidi: 60 + ((context.inputIndex + context.loopIndex) % 8),
    jitterCents: 10,
    withinWindow: true,
    result: 'pass',
  };
}

function failAttempt(context: InputPhaseContext, reasonCodes: string[]): InputAttempt {
  return {
    voicedMs: Math.max(80, Math.round(context.phaseDurationMs * 0.35)),
    coveragePct: 42,
    medianPitchMidi: 56 + ((context.inputIndex + context.loopIndex) % 6),
    jitterCents: 44,
    withinWindow: false,
    result: 'fail',
    reasonCodes,
    retryDelayMs: 240,
  };
}

function makeSimpleScenario(
  id: string,
  description: string,
  nextInput: (context: InputPhaseContext) => InputAttempt[],
): InputScenarioDefinition {
  return {
    id,
    description,
    createSession(): InputScenarioSession {
      return {
        id,
        description,
        nextInput,
      };
    },
  };
}

const deterministicBaseline = makeSimpleScenario(
  'deterministic-baseline',
  'Predictable pass-first baseline for all input phases.',
  (context) => [passAttempt(context)],
);

const passOnFirstTry = makeSimpleScenario(
  'pass-on-first-try',
  'Single-attempt pass in every input phase.',
  (context) => [passAttempt(context)],
);

const failThenPass: InputScenarioDefinition = {
  id: 'fail-then-pass',
  description: 'Each input phase fails once, then succeeds on retry.',
  createSession(): InputScenarioSession {
    const seenInputs = new Set<string>();
    return {
      id: this.id,
      description: this.description,
      nextInput(context) {
        const key = `${context.loopIndex}:${context.inputIndex}`;
        if (seenInputs.has(key)) {
          return [passAttempt(context)];
        }
        seenInputs.add(key);
        return [
          failAttempt(context, ['off_pitch', 'below_hit_threshold']),
          passAttempt(context),
        ];
      },
    };
  },
};

const neverVoicedTimeout = makeSimpleScenario(
  'never-voiced-timeout',
  'No usable voiced input is detected.',
  () => [{
    voicedMs: 0,
    coveragePct: 0,
    withinWindow: false,
    result: 'fail',
    reasonCodes: ['no_voicing_timeout'],
  }],
);

const offPitchConsistently = makeSimpleScenario(
  'off-pitch-consistently',
  'Voiced input is present but consistently outside target window.',
  (context) => [{
    voicedMs: Math.max(140, Math.round(context.phaseDurationMs * 0.7)),
    coveragePct: 88,
    medianPitchMidi: 49 + ((context.inputIndex + context.loopIndex) % 5),
    jitterCents: 27,
    withinWindow: false,
    result: 'fail',
    reasonCodes: ['outside_target_window'],
  }],
);

const lowCoverageFlaky = makeSimpleScenario(
  'low-coverage-flaky',
  'Alternating coverage quality causes mixed pass/fail outcomes.',
  (context) => {
    const shouldPass = (context.inputIndex + context.loopIndex) % 2 === 0;
    if (shouldPass) {
      return [{
        ...passAttempt(context),
        coveragePct: 74,
        voicedMs: Math.max(160, Math.round(context.phaseDurationMs * 0.55)),
      }];
    }
    return [{
      ...failAttempt(context, ['low_coverage']),
      coveragePct: 34,
      voicedMs: Math.max(60, Math.round(context.phaseDurationMs * 0.25)),
    }];
  },
);

const holdSteadySuccess = makeSimpleScenario(
  'hold-steady-success',
  'Strong success on hold-steady phases, baseline pass elsewhere.',
  (context) => {
    if (context.phaseTargetMode === 'holdSteady') {
      return [{
        ...passAttempt(context),
        coveragePct: 95,
        jitterCents: 6,
      }];
    }
    return [passAttempt(context)];
  },
);

const slideUpSuccess = makeSimpleScenario(
  'slide-up-success',
  'Reliable success on upward slide phases.',
  (context) => {
    if (context.phaseTargetMode === 'slideWindow' && context.slideDirection === 'down') {
      return [failAttempt(context, ['slide_direction_mismatch'])];
    }
    return [passAttempt(context)];
  },
);

const slideDownSuccess = makeSimpleScenario(
  'slide-down-success',
  'Reliable success on downward slide phases.',
  (context) => {
    if (context.phaseTargetMode === 'slideWindow' && context.slideDirection === 'up') {
      return [failAttempt(context, ['slide_direction_mismatch'])];
    }
    return [passAttempt(context)];
  },
);

export const SCENARIO_DEFINITIONS: InputScenarioDefinition[] = [
  deterministicBaseline,
  passOnFirstTry,
  failThenPass,
  neverVoicedTimeout,
  offPitchConsistently,
  lowCoverageFlaky,
  holdSteadySuccess,
  slideUpSuccess,
  slideDownSuccess,
];

const SCENARIO_MAP = new Map(SCENARIO_DEFINITIONS.map((scenario) => [scenario.id, scenario]));

export function listScenarioDefinitions(): InputScenarioDefinition[] {
  return [...SCENARIO_DEFINITIONS];
}

export function getScenarioDefinition(scenarioId: string): InputScenarioDefinition | null {
  return SCENARIO_MAP.get(scenarioId) ?? null;
}
