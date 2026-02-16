import {
  applyVariation,
  type AnyLessonTemplate,
  type OverdubExerciseTemplate,
  type PitchMatchingConfig,
  type PitchMatchingTemplate,
} from '@mlt/lesson-templates';
import { FakeClock } from './sim/fakeClock.js';
import { FakeInput, type InputAttempt } from './sim/fakeInput.js';
import { getScenarioDefinition } from './sim/scenarios.js';
import { TraceRecorder } from './trace/recorder.js';
import type { LessonTraceDocument, TraceSettingsValue } from './trace/types.js';

type SettingsMap = Record<string, TraceSettingsValue>;

export interface RunLessonHeadlessOptions {
  template: AnyLessonTemplate;
  scenarioId: string;
  variantId?: string;
  settings?: SettingsMap;
}

export interface RunLessonHeadlessResult {
  trace: LessonTraceDocument;
  warnings: string[];
}

interface ResolvedPitchVariant {
  variantId: string;
  variantName?: string;
  config: PitchMatchingConfig;
}

function toNumber(value: TraceSettingsValue | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function toBoolean(value: TraceSettingsValue | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function midiToNoteName(midi: number): string {
  const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  return `${names[pitchClass]}${octave}`;
}

function buildDefaultSettings(
  template: AnyLessonTemplate,
  overrides: SettingsMap | undefined,
): SettingsMap {
  const defaults: SettingsMap = {};
  for (const field of template.settingsSchema.fields) {
    defaults[field.key] = field.default;
  }
  return { ...defaults, ...(overrides ?? {}) };
}

function splitDuration(durationMs: number, parts: number): number[] {
  if (parts <= 0) return [durationMs];
  const whole = Math.max(0, Math.round(durationMs));
  const base = Math.floor(whole / parts);
  let remainder = whole - (base * parts);
  const slices: number[] = [];
  for (let i = 0; i < parts; i++) {
    const extra = remainder > 0 ? 1 : 0;
    slices.push(base + extra);
    remainder -= extra;
  }
  return slices;
}

function getRetryMessage(reasonCodes: string[] | undefined): string {
  if (!reasonCodes || reasonCodes.length === 0) {
    return 'Try that input again.';
  }
  if (reasonCodes.includes('no_voicing_timeout')) {
    return 'No voiced input was detected. Keep the voice active and retry.';
  }
  if (reasonCodes.includes('slide_direction_mismatch')) {
    return 'The slide direction did not match. Retry with the requested direction.';
  }
  if (reasonCodes.includes('low_coverage')) {
    return 'Coverage was too low. Sustain the sound longer on retry.';
  }
  return 'Input was outside the target. Retry this phase.';
}

function resolvePitchVariant(
  template: PitchMatchingTemplate,
  variantId: string | undefined,
): ResolvedPitchVariant {
  if (!variantId || variantId === 'default') {
    return {
      variantId: 'default',
      config: { ...template.config },
    };
  }

  const normalized = normalizeName(variantId);
  const variation = template.variations?.find((item) => (
    item.id === variantId ||
    normalizeName(item.id) === normalized ||
    normalizeName(item.name) === normalized
  ));

  if (!variation) {
    throw new Error(
      `Variant "${variantId}" not found for lesson "${template.id}".`,
    );
  }

  return {
    variantId: variation.id,
    variantName: variation.name,
    config: applyVariation(template.config, variation.configOverrides),
  };
}

function resolvePitchConfig(
  template: PitchMatchingTemplate,
  settings: SettingsMap,
  variantId: string | undefined,
): ResolvedPitchVariant {
  const variant = resolvePitchVariant(template, variantId);
  const base = variant.config;
  return {
    ...variant,
    config: {
      ...base,
      numLoops: toNumber(settings.loopCount, base.numLoops),
      tempo: toNumber(settings.tempoBpm, base.tempo),
      minAmplitudeDb: toNumber(settings.minAmplitudeDb, base.minAmplitudeDb ?? -60),
      minVoicedMs: toNumber(settings.minVoicedMs, base.minVoicedMs ?? 400),
      minCoveragePct: toNumber(settings.minCoveragePct, base.minCoveragePct ?? 60),
      bandLowMinOffsetSemis: toNumber(settings.bandLowMinOffsetSemis, base.bandLowMinOffsetSemis ?? -8),
      bandLowMaxOffsetSemis: toNumber(settings.bandLowMaxOffsetSemis, base.bandLowMaxOffsetSemis ?? -3),
      bandHighMinOffsetSemis: toNumber(settings.bandHighMinOffsetSemis, base.bandHighMinOffsetSemis ?? 3),
      bandHighMaxOffsetSemis: toNumber(settings.bandHighMaxOffsetSemis, base.bandHighMaxOffsetSemis ?? 8),
      holdBandSemitones: toNumber(settings.holdBandSemitones, base.holdBandSemitones ?? 1),
      minSlideSemitones: toNumber(settings.minSlideSemitones, base.minSlideSemitones ?? 3),
      waitForInput: toBoolean(settings.waitForInput, base.waitForInput ?? false),
      showImmediateFeedback: toBoolean(
        settings.showImmediateFeedback,
        base.showImmediateFeedback ?? true,
      ),
      showScore: toBoolean(settings.showScore, base.showScore ?? true),
    },
  };
}

function runPitchMatchingTrace(
  template: PitchMatchingTemplate,
  scenarioId: string,
  variantId: string | undefined,
  settingsOverride: SettingsMap | undefined,
): RunLessonHeadlessResult {
  const scenario = getScenarioDefinition(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario "${scenarioId}".`);
  }

  const settings = buildDefaultSettings(template, settingsOverride);
  const resolved = resolvePitchConfig(template, settings, variantId);
  const config = resolved.config;
  const warnings: string[] = [];

  const clock = new FakeClock();
  const recorder = new TraceRecorder(clock);
  const input = new FakeInput(scenario.createSession());
  const pattern = template.pattern;
  const microbeatMs = (60 / Math.max(1, config.tempo)) * 1000 / 2;
  const minMidi = Number.isFinite(config.minMidi) ? Number(config.minMidi) : 48;
  const maxMidi = Number.isFinite(config.maxMidi) ? Number(config.maxMidi) : 72;
  const lowMidi = Math.min(minMidi, maxMidi);
  const highMidi = Math.max(minMidi, maxMidi);
  const droneOn = toBoolean(settings.droneOn, false);

  recorder.record({
    type: 'lessonLoaded',
    lessonId: template.id,
    variantId: resolved.variantId,
    scenarioId,
  });
  recorder.record({ type: 'highwayShow' });

  if (droneOn) {
    recorder.record({
      type: 'drone',
      state: 'on',
      tonic: template.speakingPitchUsage === 'none' ? 'static' : 'speaking-pitch',
    });
  }

  if (pattern.leadInMs > 0) {
    recorder.record({
      type: 'phaseEnter',
      phase: 'leadIn',
      loopIndex: 0,
      phaseIndex: -1,
      phaseLabel: 'Lead In',
    });
    clock.advance(pattern.leadInMs);
  }

  let segmentIndex = 0;
  let lastSegmentId: string | undefined;
  let inputIndex = 0;
  let passCount = 0;
  let failCount = 0;

  for (let loopIndex = 0; loopIndex < config.numLoops; loopIndex++) {
    const loopSeed = hashString(`${template.id}:${loopIndex}`);
    const loopPitch = lowMidi + (loopSeed % ((highMidi - lowMidi) + 1));

    for (let phaseIndex = 0; phaseIndex < pattern.phases.length; phaseIndex++) {
      const phase = pattern.phases[phaseIndex];
      const phaseDurationMs = Math.max(0, Math.round(phase.durationMicrobeats * microbeatMs));
      const targetMode = phase.targetMode ?? 'fixedPitch';

      if (phase.segmentId && phase.segmentId !== lastSegmentId) {
        recorder.record({
          type: 'segmentStart',
          segmentId: phase.segmentId,
          segmentName: phase.segmentName,
          segmentIndex,
        });
        segmentIndex += 1;
        lastSegmentId = phase.segmentId;
      }

      recorder.record({
        type: 'phaseEnter',
        phase: phase.type,
        loopIndex,
        phaseIndex,
        phaseLabel: phase.label,
        targetMode,
      });

      if (phase.instructionMessage) {
        recorder.record({
          type: 'avatarSay',
          text: phase.instructionMessage,
          textId: phase.segmentId,
        });
      }

      if (phase.type === 'reference') {
        recorder.record({
          type: 'referenceTone',
          state: 'on',
          note: midiToNoteName(loopPitch),
        });
        clock.advance(phaseDurationMs);
        recorder.record({
          type: 'referenceTone',
          state: 'off',
          note: midiToNoteName(loopPitch),
        });
        continue;
      }

      if (phase.type === 'rest') {
        clock.advance(phaseDurationMs);
        continue;
      }

      const waitForInput = toBoolean(config.waitForInput, false) && (phase.waitForInput ?? true);
      if (waitForInput) {
        recorder.record({
          type: 'waitForInput',
          state: 'begin',
          thresholds: {
            minVoicedMs: config.minVoicedMs ?? 400,
            minCoveragePct: config.minCoveragePct ?? 60,
            minAmplitudeDb: config.minAmplitudeDb ?? -60,
          },
        });
      }

      const attempts = input.evaluatePhase({
        lessonId: template.id,
        lessonName: template.name,
        loopIndex,
        inputIndex,
        phaseIndex,
        phaseLabel: phase.label,
        phaseTargetMode: phase.targetMode,
        phaseDurationMs,
        segmentId: phase.segmentId,
        segmentName: phase.segmentName,
        slideDirection: phase.slideDirection,
      });

      const resolvedAttempts: InputAttempt[] = attempts.length > 0
        ? attempts
        : [{
          voicedMs: 0,
          coveragePct: 0,
          withinWindow: false,
          result: 'fail',
          reasonCodes: ['no_attempts_generated'],
        }];
      const timeSlices = splitDuration(phaseDurationMs, resolvedAttempts.length);

      for (let attemptIndex = 0; attemptIndex < resolvedAttempts.length; attemptIndex++) {
        const attempt = resolvedAttempts[attemptIndex];
        const attemptNumber = attemptIndex + 1;
        const status = attempt.result === 'pass' ? 'hit' : 'miss';
        const currentSliceMs = timeSlices[attemptIndex] ?? 0;

        recorder.record({
          type: 'inputMetrics',
          inputIndex,
          attempt: attemptNumber,
          voicedMs: attempt.voicedMs,
          coveragePct: attempt.coveragePct,
          medianPitchMidi: attempt.medianPitchMidi,
          jitterCents: attempt.jitterCents,
          withinWindow: attempt.withinWindow,
        });

        recorder.record({
          type: 'highwayNoteJudged',
          inputIndex,
          status,
          noteLabel: phase.label ?? midiToNoteName(loopPitch),
          reasonCodes: attempt.reasonCodes,
        });

        recorder.record({
          type: 'evaluation',
          inputIndex,
          attempt: attemptNumber,
          result: attempt.result,
          reasonCodes: attempt.reasonCodes,
        });

        if (attempt.result === 'pass') {
          passCount += 1;
        } else {
          failCount += 1;
        }

        const hasRetry = attempt.result === 'fail' && attemptIndex < (resolvedAttempts.length - 1);
        if (hasRetry) {
          recorder.record({
            type: 'phaseEnter',
            phase: 'feedback',
            loopIndex,
            phaseIndex,
            phaseLabel: 'Feedback',
            targetMode,
          });
          recorder.record({
            type: 'avatarSay',
            text: getRetryMessage(attempt.reasonCodes),
          });
        }

        clock.advance(currentSliceMs);
      }

      if (waitForInput) {
        recorder.record({
          type: 'waitForInput',
          state: 'end',
        });
      }

      inputIndex += 1;
    }

    if (loopIndex < (config.numLoops - 1)) {
      recorder.record({
        type: 'loopAdvance',
        newLoopIndex: loopIndex + 1,
      });
    }
  }

  if (droneOn) {
    recorder.record({
      type: 'drone',
      state: 'off',
      tonic: template.speakingPitchUsage === 'none' ? 'static' : 'speaking-pitch',
    });
  }

  recorder.record({ type: 'highwayHide' });
  recorder.record({
    type: 'lessonComplete',
    passCount,
    failCount,
    totalInputs: inputIndex,
  });

  const trace = recorder.buildDocument({
    lessonId: template.id,
    lessonName: template.name,
    lessonType: template.type,
    variantId: resolved.variantId,
    variantName: resolved.variantName,
    scenarioId,
    settings,
  });

  if (trace.summary.evaluations.fail > 0 && config.waitForInput !== true) {
    warnings.push(
      'Failures were recorded while wait-for-input is disabled; runtime retries may differ from this trace.',
    );
  }

  return { trace, warnings };
}

function runOverdubTrace(
  template: OverdubExerciseTemplate,
  scenarioId: string,
  variantId: string | undefined,
  settingsOverride: SettingsMap | undefined,
): RunLessonHeadlessResult {
  const warnings: string[] = [];
  if (variantId && variantId !== 'default') {
    warnings.push(`Overdub lessons do not expose variants. Ignoring variant "${variantId}".`);
  }

  const settings = buildDefaultSettings(template, settingsOverride);
  const tempo = toNumber(settings.tempo, template.config.tempo);
  const countInBeats = toNumber(settings.countInBeats, template.config.countInBeats ?? 4);
  const msPerQuarterBeat = 60000 / Math.max(1, tempo);
  const msPerMacrobeat = msPerQuarterBeat / 2;
  const msPerMicrobeat = msPerMacrobeat / template.config.timeGrid.microbeatsPerMacrobeat;
  const leadInMs = Math.max(0, Math.round(countInBeats * msPerQuarterBeat));
  const exerciseDurationMs = Math.max(
    0,
    Math.round(template.config.timeGrid.microbeatCount * msPerMicrobeat),
  );

  const clock = new FakeClock();
  const recorder = new TraceRecorder(clock);

  recorder.record({
    type: 'lessonLoaded',
    lessonId: template.id,
    variantId: 'default',
    scenarioId,
  });
  recorder.record({ type: 'highwayShow' });

  if (leadInMs > 0) {
    recorder.record({
      type: 'phaseEnter',
      phase: 'leadIn',
      loopIndex: 0,
      phaseIndex: -1,
      phaseLabel: 'Count In',
    });
    clock.advance(leadInMs);
  }

  recorder.record({
    type: 'phaseEnter',
    phase: 'overdub',
    loopIndex: 0,
    phaseIndex: 0,
    phaseLabel: 'Overdub Playback',
  });

  const voiceMarkers = template.config.voices
    .map((voice, index) => {
      const firstNote = voice.notes[0];
      if (!firstNote) return null;
      return {
        atMs: Math.max(0, Math.round(firstNote.startMicrobeatCol * msPerMicrobeat)),
        segmentId: voice.voiceId,
        segmentName: voice.name,
        segmentIndex: index,
      };
    })
    .filter((marker): marker is { atMs: number; segmentId: string; segmentName: string; segmentIndex: number } => marker !== null)
    .sort((a, b) => a.atMs - b.atMs || a.segmentIndex - b.segmentIndex);

  let elapsedMs = 0;
  for (const marker of voiceMarkers) {
    const deltaMs = Math.max(0, marker.atMs - elapsedMs);
    if (deltaMs > 0) {
      clock.advance(deltaMs);
      elapsedMs += deltaMs;
    }
    recorder.record({
      type: 'segmentStart',
      segmentId: marker.segmentId,
      segmentName: marker.segmentName,
      segmentIndex: marker.segmentIndex,
    });
  }

  if (exerciseDurationMs > elapsedMs) {
    clock.advance(exerciseDurationMs - elapsedMs);
  }

  recorder.record({ type: 'highwayHide' });
  recorder.record({
    type: 'lessonComplete',
    passCount: 0,
    failCount: 0,
    totalInputs: 0,
  });

  const trace = recorder.buildDocument({
    lessonId: template.id,
    lessonName: template.name,
    lessonType: template.type,
    variantId: 'default',
    scenarioId,
    settings,
  });

  warnings.push('Overdub traces currently model timeline/voice events only (no pitch scoring).');
  return { trace, warnings };
}

export function runLessonHeadless(options: RunLessonHeadlessOptions): RunLessonHeadlessResult {
  const { template, scenarioId, variantId, settings } = options;
  if (template.type === 'pitch-matching') {
    return runPitchMatchingTrace(template, scenarioId, variantId, settings);
  }
  if (template.type === 'overdub') {
    return runOverdubTrace(template, scenarioId, variantId, settings);
  }
  throw new Error('Unsupported lesson type for headless runner.');
}
