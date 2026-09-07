import type { SolfegeLine } from '../constants/ladukhin.js';
import { solfegeMidi, type SolfegeTuningMode } from './solfegeNotation.js';
import type { SolfegeTrailPoint } from './solfegeTrail.js';

export const SOLFEGE_COUNT_IN_BEATS = 4;

export const SOLFEGE_ACCURACY_DEFAULTS = {
  toleranceCents: 50,
  maxSampleHoldMs: 150,
} as const;

/** Row-relative beats are negative until the first barline. */
export function solfegeCountdown(beat: number, countInBeats = SOLFEGE_COUNT_IN_BEATS): number | null {
  if (!Number.isFinite(beat) || beat >= 0 || countInBeats <= 0) return null;
  return Math.min(countInBeats, Math.max(1, Math.ceil(-beat)));
}

/** Percentage of elapsed pitched score time sung in tune; silence is not credited. */
export function calculateSolfegeAccuracy(
  line: SolfegeLine,
  trail: readonly SolfegeTrailPoint[],
  tonicMidi: number,
  tempo: number,
  settings: { toleranceCents: number; maxSampleHoldMs: number } = SOLFEGE_ACCURACY_DEFAULTS,
  throughBeat = line.durationBeats,
  tuning: SolfegeTuningMode = 'just',
): number {
  const scoredUntil = Number.isFinite(throughBeat) ? Math.max(0, Math.min(throughBeat, line.durationBeats)) : 0;
  const notes = line.notes.filter(note => note.midi !== null);
  const totalBeats = notes.reduce((sum, note) => sum + Math.max(0, Math.min(note.durationBeats, scoredUntil - note.beat)), 0);
  if (totalBeats <= 0 || !Number.isFinite(tempo) || tempo <= 0) return 0;
  const maxHoldBeats = Math.max(0, settings.maxSampleHoldMs) * tempo / 60000;
  const points = trail.filter(point => Number.isFinite(point.midi) && Number.isFinite(point.beat)
    && point.beat >= 0 && point.beat < scoredUntil).sort((a, b) => a.beat - b.beat);
  let accurateBeats = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i]!;
    const endBeat = Math.min(points[i + 1]?.beat ?? scoredUntil, point.beat + maxHoldBeats, scoredUntil);
    for (const note of notes) {
      const overlap = Math.min(endBeat, note.beat + note.durationBeats) - Math.max(point.beat, note.beat);
      if (overlap <= 0) continue;
      const centsError = Math.abs(point.midi - solfegeMidi(note.midi!, tonicMidi, tuning)) * 100;
      if (centsError <= settings.toleranceCents) accurateBeats += overlap;
    }
  }
  return Math.round(Math.min(100, Math.max(0, accurateBeats / totalBeats * 100)));
}
