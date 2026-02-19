import {
  DEFAULT_TANPURA_PLAYBACK_RATE_CONFIG,
  PURETONES_DEFAULT_TANPURA_PRESET,
  PURETONES_NOTE_LABELS,
  getTanpuraPlaybackRate,
} from './tanpuraPresets';

export type DroneEngine = 'tanpura' | 'synth';

export interface TanpuraTuningBehavior {
  fineTuneCents: number;
  brightness: number;
  jivari: number;
  variance: number;
}

export interface TanpuraStringBehavior {
  stringName: '1st_String' | '2nd_String' | '3rd_String' | '4th_String' | '5th_String' | '6th_String';
  enabled: boolean;
  noteIndex: number;
  fineTuneCents: number;
  ultraFineTuneCents: number;
  gainDb: number;
  variance: number;
}

export interface TanpuraTuningLimits {
  fineTuneCents: { min: number; max: number };
  brightness: { min: number; max: number };
  jivari: { min: number; max: number };
  variance: { min: number; max: number };
}

export interface TanpuraStringBehaviorLimits {
  noteIndex: { min: number; max: number };
  fineTuneCents: { min: number; max: number };
  ultraFineTuneCents: { min: number; max: number };
  gainDb: { min: number; max: number };
  variance: { min: number; max: number };
}

export const TANPURA_TUNING_LIMITS: TanpuraTuningLimits = {
  fineTuneCents: { min: -100, max: 100 },
  brightness: { min: 0, max: 100 },
  jivari: { min: 0, max: 100 },
  variance: { min: 0, max: 100 },
};

export const DEFAULT_TANPURA_TUNING_BEHAVIOR: TanpuraTuningBehavior = {
  fineTuneCents: 0,
  brightness: 58,
  jivari: 42,
  variance: 36,
};

export const TANPURA_STRING_BEHAVIOR_LIMITS: TanpuraStringBehaviorLimits = {
  noteIndex: { min: 0, max: PURETONES_NOTE_LABELS.length - 1 },
  fineTuneCents: { min: -100, max: 100 },
  ultraFineTuneCents: { min: -100, max: 100 },
  gainDb: { min: -24, max: 12 },
  variance: { min: 0, max: 100 },
};

export const NOTE_RATIOS = [
  2,
  243 / 128,
  16 / 9,
  27 / 16,
  128 / 81,
  3 / 2,
  729 / 512,
  4 / 3,
  81 / 64,
  32 / 27,
  9 / 8,
  256 / 243,
  1,
] as const;

export const DEFAULT_TANPURA_STRING_BEHAVIORS: readonly TanpuraStringBehavior[] = PURETONES_DEFAULT_TANPURA_PRESET.strings.map((string) => ({
  stringName: string.stringName,
  enabled: string.loopEnabled,
  noteIndex: string.noteIndex,
  fineTuneCents: string.fineTuneCents,
  ultraFineTuneCents: string.ultraFineTuneCents,
  gainDb: string.gainDb,
  variance: string.variance,
}));

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeTanpuraTuningBehavior(
  tuning: Partial<TanpuraTuningBehavior> | TanpuraTuningBehavior
): TanpuraTuningBehavior {
  return {
    fineTuneCents: clamp(
      toFinite(tuning.fineTuneCents ?? DEFAULT_TANPURA_TUNING_BEHAVIOR.fineTuneCents, DEFAULT_TANPURA_TUNING_BEHAVIOR.fineTuneCents),
      TANPURA_TUNING_LIMITS.fineTuneCents.min,
      TANPURA_TUNING_LIMITS.fineTuneCents.max
    ),
    brightness: clamp(
      toFinite(tuning.brightness ?? DEFAULT_TANPURA_TUNING_BEHAVIOR.brightness, DEFAULT_TANPURA_TUNING_BEHAVIOR.brightness),
      TANPURA_TUNING_LIMITS.brightness.min,
      TANPURA_TUNING_LIMITS.brightness.max
    ),
    jivari: clamp(
      toFinite(tuning.jivari ?? DEFAULT_TANPURA_TUNING_BEHAVIOR.jivari, DEFAULT_TANPURA_TUNING_BEHAVIOR.jivari),
      TANPURA_TUNING_LIMITS.jivari.min,
      TANPURA_TUNING_LIMITS.jivari.max
    ),
    variance: clamp(
      toFinite(tuning.variance ?? DEFAULT_TANPURA_TUNING_BEHAVIOR.variance, DEFAULT_TANPURA_TUNING_BEHAVIOR.variance),
      TANPURA_TUNING_LIMITS.variance.min,
      TANPURA_TUNING_LIMITS.variance.max
    ),
  };
}

export function normalizeTanpuraStringBehavior(
  behavior: Partial<TanpuraStringBehavior> | TanpuraStringBehavior,
  fallback: TanpuraStringBehavior = DEFAULT_TANPURA_STRING_BEHAVIORS[0]
): TanpuraStringBehavior {
  return {
    stringName: behavior.stringName ?? fallback.stringName,
    enabled: Boolean(behavior.enabled ?? fallback.enabled),
    noteIndex: clamp(
      Math.round(toFinite(behavior.noteIndex ?? fallback.noteIndex, fallback.noteIndex)),
      TANPURA_STRING_BEHAVIOR_LIMITS.noteIndex.min,
      TANPURA_STRING_BEHAVIOR_LIMITS.noteIndex.max
    ),
    fineTuneCents: clamp(
      Math.round(toFinite(behavior.fineTuneCents ?? fallback.fineTuneCents, fallback.fineTuneCents)),
      TANPURA_STRING_BEHAVIOR_LIMITS.fineTuneCents.min,
      TANPURA_STRING_BEHAVIOR_LIMITS.fineTuneCents.max
    ),
    ultraFineTuneCents: clamp(
      Math.round(toFinite(behavior.ultraFineTuneCents ?? fallback.ultraFineTuneCents, fallback.ultraFineTuneCents)),
      TANPURA_STRING_BEHAVIOR_LIMITS.ultraFineTuneCents.min,
      TANPURA_STRING_BEHAVIOR_LIMITS.ultraFineTuneCents.max
    ),
    gainDb: clamp(
      toFinite(behavior.gainDb ?? fallback.gainDb, fallback.gainDb),
      TANPURA_STRING_BEHAVIOR_LIMITS.gainDb.min,
      TANPURA_STRING_BEHAVIOR_LIMITS.gainDb.max
    ),
    variance: clamp(
      Math.round(toFinite(behavior.variance ?? fallback.variance, fallback.variance)),
      TANPURA_STRING_BEHAVIOR_LIMITS.variance.min,
      TANPURA_STRING_BEHAVIOR_LIMITS.variance.max
    ),
  };
}

export function normalizeTanpuraStringBehaviors(
  behaviors: readonly (Partial<TanpuraStringBehavior> | TanpuraStringBehavior)[]
): TanpuraStringBehavior[] {
  const normalized = DEFAULT_TANPURA_STRING_BEHAVIORS.map((fallback, index) =>
    normalizeTanpuraStringBehavior(behaviors[index] ?? fallback, fallback)
  );
  return normalized;
}

function centsToPlaybackRate(cents: number): number {
  return 2 ** (cents / 1200);
}

export function getTanpuraPlaybackRateForTuning(
  targetMidi: number,
  tuning: TanpuraTuningBehavior,
  phase = 0
): number {
  const normalized = normalizeTanpuraTuningBehavior(tuning);
  const baseRate = getTanpuraPlaybackRate(targetMidi, DEFAULT_TANPURA_PLAYBACK_RATE_CONFIG);
  const driftCents = Math.sin(phase * Math.PI * 2) * (normalized.variance * 0.08);
  const tunedRate = baseRate * centsToPlaybackRate(normalized.fineTuneCents + driftCents);
  return clamp(tunedRate, DEFAULT_TANPURA_PLAYBACK_RATE_CONFIG.minRate, DEFAULT_TANPURA_PLAYBACK_RATE_CONFIG.maxRate);
}

export function getTanpuraStringRatio(noteIndex: number): number {
  const bounded = clamp(Math.round(noteIndex), 0, NOTE_RATIOS.length - 1);
  return NOTE_RATIOS[bounded];
}

export function getTanpuraStringSemitoneOffset(noteIndex: number): number {
  const ratio = getTanpuraStringRatio(noteIndex);
  return 12 * Math.log2(ratio);
}

export function getTanpuraFilterFrequencyFromTuning(tuning: TanpuraTuningBehavior): number {
  const normalized = normalizeTanpuraTuningBehavior(tuning);
  const cutoff = 340 + (normalized.brightness * 63) + (normalized.jivari * 7);
  return clamp(cutoff, 300, 9000);
}

export function getTanpuraFilterQFromTuning(tuning: TanpuraTuningBehavior): number {
  const normalized = normalizeTanpuraTuningBehavior(tuning);
  const q = 0.35 + (normalized.jivari / 18);
  return clamp(q, 0.35, 6);
}

export function getTanpuraTremoloDepthFromTuning(tuning: TanpuraTuningBehavior): number {
  const normalized = normalizeTanpuraTuningBehavior(tuning);
  const depth = 0.02 + (normalized.variance / 280) + (normalized.jivari / 500);
  return clamp(depth, 0, 0.45);
}

export function getTanpuraTremoloFrequencyFromTuning(tuning: TanpuraTuningBehavior): number {
  const normalized = normalizeTanpuraTuningBehavior(tuning);
  const frequency = 1.4 + (normalized.variance / 18) + (normalized.jivari / 55);
  return clamp(frequency, 1.2, 9);
}
