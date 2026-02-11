/**
 * Exercise Voice Converter
 *
 * Converts overdub exercise voices (microbeat-column-based) to
 * TargetNote[] (millisecond-based) for highway display.
 */

import type { ExerciseVoice, ExerciseTimeGrid } from '@mlt/lesson-templates';
import type { TargetNote } from '../stores/highwayState.svelte.js';

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
): TargetNote[] {
  const notes: TargetNote[] = [];

  for (const voice of voices) {
    const isActiveVoice = activeVoiceId != null && voice.voiceId === activeVoiceId;

    for (const note of voice.notes) {
      const startTimeMs = microbeatColToMs(note.startMicrobeatCol, timeGrid.microbeatsPerMacrobeat, tempo);
      // endMicrobeatCol is inclusive, so duration spans from start to end+1
      const endTimeMs = microbeatColToMs(note.endMicrobeatCol + 1, timeGrid.microbeatsPerMacrobeat, tempo);

      notes.push({
        midi: note.midiPitch,
        voiceId: voice.voiceId,
        startTimeMs,
        durationMs: endTimeMs - startTimeMs,
        lyric: note.lyric,
        label: note.lyric ?? note.pitchName,
        color: voice.color,
        role: isActiveVoice ? 'input' : 'reference',
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
