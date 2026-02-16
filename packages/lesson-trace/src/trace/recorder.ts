import type { LessonType } from '@mlt/lesson-templates';
import type {
  EvaluationEvent,
  LessonTraceDocument,
  TraceEvent,
  TraceSettingsValue,
} from './types.js';

export interface ClockLike {
  readonly nowMs: number;
}

export interface TraceDocumentMeta {
  lessonId: string;
  lessonName: string;
  lessonType: LessonType;
  variantId: string;
  variantName?: string;
  scenarioId: string;
  settings: Record<string, TraceSettingsValue>;
}

type TraceEventInput = TraceEvent extends infer Event
  ? Event extends TraceEvent
    ? Omit<Event, 'atMs'>
    : never
  : never;

/**
 * Minimal typed recorder used by the headless lesson runner.
 */
export class TraceRecorder {
  private readonly events: TraceEvent[] = [];

  constructor(private readonly clock: ClockLike) {}

  record(event: TraceEventInput): void {
    this.events.push({
      ...event,
      atMs: this.clock.nowMs,
    } as TraceEvent);
  }

  buildDocument(meta: TraceDocumentMeta): LessonTraceDocument {
    const evaluations = this.events.filter(
      (event): event is EvaluationEvent => event.type === 'evaluation',
    );
    const pass = evaluations.filter((event) => event.result === 'pass').length;
    const fail = evaluations.filter((event) => event.result === 'fail').length;
    const lastAtMs = this.events.length > 0
      ? this.events[this.events.length - 1]?.atMs ?? 0
      : this.clock.nowMs;

    return {
      schemaVersion: '1.0.0',
      generatedAtIso: new Date().toISOString(),
      lessonId: meta.lessonId,
      lessonName: meta.lessonName,
      lessonType: meta.lessonType,
      variantId: meta.variantId,
      variantName: meta.variantName,
      scenarioId: meta.scenarioId,
      settings: meta.settings,
      events: [...this.events],
      summary: {
        durationMs: Math.max(this.clock.nowMs, lastAtMs),
        totalEvents: this.events.length,
        evaluations: {
          pass,
          fail,
        },
      },
    };
  }
}
