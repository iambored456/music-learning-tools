/**
 * Exercise Voice Converter
 *
 * Converts overdub exercise voices (microbeat-column-based) to
 * TargetNote[] (millisecond-based) for highway display.
 */

import type { ExerciseVoice, ExerciseTimeGrid } from '@mlt/lesson-templates';
import type { TargetNote } from '../stores/highwayState.svelte.js';

export interface ConvertExerciseVoiceOptions {
  /** Default wait-gate behavior applied to active input notes. */
  waitForInput?: boolean;
  /** Optional semitone transposition applied to all note MIDI pitches. */
  transposeSemitones?: number;
  /**
   * Optional placeholder lyric for notes that have no explicit lyric.
   * When provided, this is emitted as `lyric` and no static pitch-name label is injected.
   */
  missingLyricPlaceholder?: string;
}

/**
 * Converts microbeat column positions to milliseconds.
 * In overdub exercises, one macrobeat corresponds to an eighth note.
 * A quarter-note beat therefore contains 2 macrobeats.
 */
function microbeatColToMs(col: number, microbeatsPerMacrobeat: number, tempo: number): number {
  const msPerQuarterBeat = 60000 / tempo;
  const msPerMacrobeat = msPerQuarterBeat / 2;
  const msPerMicrobeat = msPerMacrobeat / microbeatsPerMacrobeat;
  return col * msPerMicrobeat;
}

/**
 * Convert exercise voices to highway TargetNotes.
 *
 * @param voices - Exercise voices with microbeat-column-based notes
 * @param timeGrid - Time grid structure (microbeats, groupings)
 * @param tempo - Tempo in BPM
 * @param activeVoiceId - Which voice the user is practicing (its notes get role='input').
 *   All other voices get role='reference'. If null/undefined, all voices are 'reference' (listen-only).
 * @returns Array of TargetNotes with per-voice colors, sorted by startTimeMs
 */
export function convertExerciseVoicesToTargetNotes(
  voices: ExerciseVoice[],
  timeGrid: ExerciseTimeGrid,
  tempo: number,
  activeVoiceId?: string | null,
  options: ConvertExerciseVoiceOptions = {},
): TargetNote[] {
  const notes: TargetNote[] = [];
  const waitForInputEnabled = options.waitForInput ?? false;
  const transposeSemitones = Number.isFinite(options.transposeSemitones)
    ? Math.round(options.transposeSemitones as number)
    : 0;

  function midiToPitchName(midi: number): string {
    const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const pitchClass = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${pitchClasses[pitchClass]}${octave}`;
  }

  for (const voice of voices) {
    const isActiveVoice = activeVoiceId != null && voice.voiceId === activeVoiceId;

    for (const note of voice.notes) {
      const startTimeMs = microbeatColToMs(note.startMicrobeatCol, timeGrid.microbeatsPerMacrobeat, tempo);
      // endMicrobeatCol is inclusive, so duration spans from start to end+1
      const endTimeMs = microbeatColToMs(note.endMicrobeatCol + 1, timeGrid.microbeatsPerMacrobeat, tempo);
      const transposedMidi = Math.max(0, Math.min(127, note.midiPitch + transposeSemitones));
      const trimmedLyric = typeof note.lyric === 'string' ? note.lyric.trim() : '';
      const hasExplicitLyric = trimmedLyric.length > 0;
      const missingLyricPlaceholder = options.missingLyricPlaceholder;
      const lyric = hasExplicitLyric
        ? trimmedLyric
        : (typeof missingLyricPlaceholder === 'string' ? missingLyricPlaceholder : undefined);

      notes.push({
        midi: transposedMidi,
        voiceId: voice.voiceId,
        startTimeMs,
        durationMs: endTimeMs - startTimeMs,
        lyric,
        // Keep lyric-driven notes dynamic so they can switch to scale-degree labels.
        label: lyric ? undefined : midiToPitchName(transposedMidi),
        color: voice.color,
        role: isActiveVoice ? 'input' : 'reference',
        waitForInput: isActiveVoice ? (note.waitForInput ?? waitForInputEnabled) : undefined,
      });
    }
  }

  // Sort by start time for consistent rendering
  notes.sort((a, b) => a.startTimeMs - b.startTimeMs);

  return notes;
}

/**
 * Calculate the total duration of an exercise in milliseconds.
 */
export function calculateExerciseDurationMs(
  timeGrid: ExerciseTimeGrid,
  tempo: number,
): number {
  return microbeatColToMs(timeGrid.microbeatCount, timeGrid.microbeatsPerMacrobeat, tempo);
}
