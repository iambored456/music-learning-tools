import type { SolfegeLine } from '../constants/ladukhin.js';
import { solfegeMidi, type SolfegeTuningMode } from './solfegeNotation.js';

const GLIDE_SECONDS = 0.08;

/** Visual pitch only: briefly ease from an adjoining note using the playback clock. */
export function getSolfegePlaybackMidi(
  line: SolfegeLine,
  beat: number,
  tonicMidi: number,
  tempo: number,
  tuning: SolfegeTuningMode,
): number | null {
  const index = line.notes.findIndex(note => note.beat <= beat && beat < note.beat + note.durationBeats);
  const note = line.notes[index];
  if (!note || note.midi === null) return null;
  const target = solfegeMidi(note.midi, tonicMidi, tuning);
  const previous = line.notes[index - 1];
  if (!previous || previous.midi === null || !Number.isFinite(tempo) || tempo <= 0
    || Math.abs(previous.beat + previous.durationBeats - note.beat) > 1e-6) return target;

  // Cap the glide for short notes so it settles before the next transition.
  const glideBeats = Math.min(GLIDE_SECONDS * tempo / 60, note.durationBeats / 2);
  const progress = Math.min(1, Math.max(0, (beat - note.beat) / glideBeats));
  const eased = progress * progress * (3 - 2 * progress);
  const from = solfegeMidi(previous.midi, tonicMidi, tuning);
  return from + (target - from) * eased;
}
