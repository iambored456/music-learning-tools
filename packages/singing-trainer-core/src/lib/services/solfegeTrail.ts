import type { PitchHistoryPoint } from '../stores/pitchState.svelte.js';

export interface SolfegeTrailPoint { beat: number; midi: number; move: boolean }

/** Convert a detected pitch into row time, leaving a break across silence. */
export function toSolfegeTrailPoint(
  sample: PitchHistoryPoint,
  started: number,
  tempo: number,
  countIn: number,
  duration: number,
  previousVoicedTime: number,
): SolfegeTrailPoint | null {
  const beat = (sample.time - started) * tempo / 60000 - countIn;
  if (sample.frequency <= 0 || sample.clarity <= 0 || !Number.isFinite(sample.midi)
    || beat < 0 || beat > duration) return null;
  return { beat, midi: sample.midi, move: sample.time - previousVoicedTime > 150 };
}
