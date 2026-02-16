import type { LessonType } from '@mlt/lesson-templates';

export type TraceSettingsValue = string | number | boolean;

export type TracePhase = 'leadIn' | 'reference' | 'rest' | 'input' | 'feedback' | 'overdub';

export interface TraceEventBase {
  atMs: number;
  type: string;
}

export interface LessonLoadedEvent extends TraceEventBase {
  type: 'lessonLoaded';
  lessonId: string;
  variantId: string;
  scenarioId: string;
}

export interface SegmentStartEvent extends TraceEventBase {
  type: 'segmentStart';
  segmentId: string;
  segmentName?: string;
  segmentIndex: number;
}

export interface AvatarSayEvent extends TraceEventBase {
  type: 'avatarSay';
  text: string;
  textId?: string;
}

export interface HighwayVisibilityEvent extends TraceEventBase {
  type: 'highwayShow' | 'highwayHide';
}

export interface PhaseEnterEvent extends TraceEventBase {
  type: 'phaseEnter';
  phase: TracePhase;
  loopIndex: number;
  phaseIndex: number;
  phaseLabel?: string;
  targetMode?: string;
}

export interface ReferenceToneEvent extends TraceEventBase {
  type: 'referenceTone';
  state: 'on' | 'off';
  note?: string;
}

export interface DroneEvent extends TraceEventBase {
  type: 'drone';
  state: 'on' | 'off';
  tonic?: string;
}

export interface WaitForInputEvent extends TraceEventBase {
  type: 'waitForInput';
  state: 'begin' | 'end';
  thresholds?: Record<string, number>;
}

export interface InputMetricsEvent extends TraceEventBase {
  type: 'inputMetrics';
  inputIndex: number;
  attempt: number;
  voicedMs: number;
  coveragePct: number;
  medianPitchMidi?: number;
  jitterCents?: number;
  withinWindow: boolean;
}

export interface HighwayNoteJudgedEvent extends TraceEventBase {
  type: 'highwayNoteJudged';
  inputIndex: number;
  status: 'hit' | 'miss';
  noteLabel?: string;
  reasonCodes?: string[];
}

export interface EvaluationEvent extends TraceEventBase {
  type: 'evaluation';
  inputIndex: number;
  attempt: number;
  result: 'pass' | 'fail';
  reasonCodes?: string[];
}

export interface LoopAdvanceEvent extends TraceEventBase {
  type: 'loopAdvance';
  newLoopIndex: number;
}

export interface LessonCompleteEvent extends TraceEventBase {
  type: 'lessonComplete';
  passCount: number;
  failCount: number;
  totalInputs: number;
}

export type TraceEvent =
  | LessonLoadedEvent
  | SegmentStartEvent
  | AvatarSayEvent
  | HighwayVisibilityEvent
  | PhaseEnterEvent
  | ReferenceToneEvent
  | DroneEvent
  | WaitForInputEvent
  | InputMetricsEvent
  | HighwayNoteJudgedEvent
  | EvaluationEvent
  | LoopAdvanceEvent
  | LessonCompleteEvent;

export interface LessonTraceSummary {
  durationMs: number;
  totalEvents: number;
  evaluations: {
    pass: number;
    fail: number;
  };
}

export interface LessonTraceDocument {
  schemaVersion: '1.0.0';
  generatedAtIso: string;
  lessonId: string;
  lessonName: string;
  lessonType: LessonType;
  variantId: string;
  variantName?: string;
  scenarioId: string;
  settings: Record<string, TraceSettingsValue>;
  events: TraceEvent[];
  summary: LessonTraceSummary;
}
