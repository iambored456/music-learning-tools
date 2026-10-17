import type { GameMode, Settings } from './settings.ts';

export interface LessonTiming {
  tonicizationEnabled: boolean;
  autoContinueCorrect: boolean;
  reviewSkip: 'none' | 'correct' | 'all';
  tonicizationBpm: number;
  leadInSeconds: number;
  noteSeconds: number;
  noteGapSeconds: number;
  answerGapSeconds: number;
  feedbackGapSeconds: number;
  feedbackNoteSeconds: number;
  feedbackNoteGapSeconds: number;
  correctDelaySeconds: number;
  skippedCorrectSeconds: number;
  nextQuestionGapSeconds: number;
  repeatGapSeconds: number;
  replayGapSeconds: number;
  thinkSeconds: number;
  tapSeconds: number;
}
export type TimingField = { [K in keyof LessonTiming]: LessonTiming[K] extends number ? K : never }[keyof LessonTiming];
export type TimingProfiles = Partial<Record<GameMode, LessonTiming>>;
export const TIMING_LIMITS: Record<TimingField, { min: number; max: number; step: number }> = {
  tonicizationBpm: { min: 20, max: 300, step: 1 },
  leadInSeconds: { min: 0, max: 10, step: 0.05 },
  noteSeconds: { min: 0.05, max: 5, step: 0.05 },
  noteGapSeconds: { min: 0, max: 5, step: 0.05 },
  answerGapSeconds: { min: 0, max: 10, step: 0.05 },
  feedbackGapSeconds: { min: 0, max: 10, step: 0.05 },
  feedbackNoteSeconds: { min: 0.05, max: 5, step: 0.05 },
  feedbackNoteGapSeconds: { min: 0, max: 5, step: 0.05 },
  correctDelaySeconds: { min: 0, max: 15, step: 0.05 },
  skippedCorrectSeconds: { min: 0, max: 5, step: 0.05 },
  nextQuestionGapSeconds: { min: 0, max: 15, step: 0.05 },
  repeatGapSeconds: { min: 0, max: 10, step: 0.05 },
  replayGapSeconds: { min: 0, max: 10, step: 0.05 },
  thinkSeconds: { min: 0, max: 30, step: 0.05 },
  tapSeconds: { min: 0.05, max: 5, step: 0.05 },
};

export function defaultLessonTiming(settings?: Settings, mode: GameMode = settings?.mode ?? 'freeplay'): LessonTiming {
  const pocket = mode === 'pocket';
  const gap = pocket ? 60 / (settings?.pocket.tempo ?? 40) : settings?.noteGap ?? 0.8;
  return {
    tonicizationEnabled: settings?.cadence ?? true,
    autoContinueCorrect: settings?.autoContinueCorrect ?? false,
    reviewSkip: settings?.reviewSkip ?? 'correct',
    tonicizationBpm: 60,
    leadInSeconds: 0.5,
    noteSeconds: mode === 'degrees' ? Math.max(1.2, gap * 4 / 5) : mode === 'quality' ? 1 : gap * 4 / 5,
    noteGapSeconds: gap / 5,
    answerGapSeconds: mode === 'quality' || (pocket && settings?.pocket.exercise === 'quality') ? 0 : gap / 5,
    feedbackGapSeconds: 0,
    feedbackNoteSeconds: gap * 4 / 5,
    feedbackNoteGapSeconds: gap / 5,
    correctDelaySeconds: settings?.autoContinueSeconds ?? 2,
    skippedCorrectSeconds: 0.4,
    nextQuestionGapSeconds: pocket ? gap : mode === 'cycle' ? 1.8 : 0,
    repeatGapSeconds: gap,
    replayGapSeconds: gap,
    thinkSeconds: settings?.pocket.waitSeconds ?? 1,
    tapSeconds: 0.25,
  };
}

export function normalizeLessonTiming(input: unknown, fallback = defaultLessonTiming()): LessonTiming {
  const value = input && typeof input === 'object' ? input as Partial<LessonTiming> : {};
  const fields = Object.fromEntries((Object.keys(TIMING_LIMITS) as TimingField[]).map(field => {
    const number = value[field];
    const { min, max } = TIMING_LIMITS[field];
    return [field, typeof number === 'number' && Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback[field]];
  }));
  return { ...fields,
    tonicizationEnabled: typeof value.tonicizationEnabled === 'boolean' ? value.tonicizationEnabled : fallback.tonicizationEnabled,
    autoContinueCorrect: typeof value.autoContinueCorrect === 'boolean' ? value.autoContinueCorrect : fallback.autoContinueCorrect,
    reviewSkip: value.reviewSkip === 'none' || value.reviewSkip === 'correct' || value.reviewSkip === 'all' ? value.reviewSkip : fallback.reviewSkip,
  } as LessonTiming;
}

export function lessonTiming(settings: Settings): LessonTiming {
  return settings.timings[settings.mode] ?? defaultLessonTiming(settings);
}

export function setLessonTiming(settings: Settings, patch: Partial<LessonTiming>): void {
  const current = lessonTiming(settings);
  settings.timings = { ...settings.timings, [settings.mode]: normalizeLessonTiming({ ...current, ...patch }, current) };
}

export function tonicizationPhrase(settings: Settings): { notes: { degree: number; beats: number }[]; label: string } {
  const major = settings.scale === '1' && (settings.mode === 'degrees' || settings.mode === 'melody');
  const degrees = major ? [0, 4, 7, 5, 2, -1, 0] : [0, 5, 7, 0];
  return {
    notes: degrees.map((degree, index) => ({ degree, beats: (major ? 0.5 : 1) * (index === degrees.length - 1 ? 2 : 1) })),
    label: major ? '1–3–5–4–2–7–1' : '1–4–5–1',
  };
}
