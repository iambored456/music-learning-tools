/**
 * Exercise Voice Converter
 *
 * Converts overdub exercise voices (microbeat-column-based) to
 * TargetNote[] (millisecond-based) for highway display.
 */

import type { ExerciseVoice, ExerciseTimeGrid } from '@mlt/lesson-templates';
import type { TargetNote } from '../stores/highwayState.svelte.js';

export type VoiceRoleFilter = 'all' | 'guide' | 'student';

/**
 * Converts microbeat column positions to milliseconds.
 * Each macrobeat = one beat at the given tempo.
 * microbeatsPerMacrobeat subdivisions per beat.
 */
function microbeatColToMs(col: number, microbeatsPerMacrobeat: number, tempo: number): number {
  const msPerMacrobeat = 60000 / tempo;
  const msPerMicrobeat = msPerMacrobeat / microbeatsPerMacrobeat;
  return col * msPerMicrobeat;
}

/**
 * Convert exercise voices to highway TargetNotes.
 *
 * @param voices - Exercise voices with microbeat-column-based notes
 * @param timeGrid - Time grid structure (microbeats, groupings)
 * @param tempo - Tempo in BPM
 * @param roleFilter - Which voice roles to include ('all', 'guide', 'student')
 * @returns Array of TargetNotes with per-voice colors, sorted by startTimeMs
 */
export function convertExerciseVoicesToTargetNotes(
  voices: ExerciseVoice[],
  timeGrid: ExerciseTimeGrid,
  tempo: number,
  roleFilter: VoiceRoleFilter = 'all',
): TargetNote[] {
  const notes: TargetNote[] = [];

  for (const voice of voices) {
    if (roleFilter !== 'all' && voice.role !== roleFilter) continue;

    for (const note of voice.notes) {
      const startTimeMs = microbeatColToMs(note.startMicrobeatCol, timeGrid.microbeatsPerMacrobeat, tempo);
      // endMicrobeatCol is inclusive, so duration spans from start to end+1
      const endTimeMs = microbeatColToMs(note.endMicrobeatCol + 1, timeGrid.microbeatsPerMacrobeat, tempo);

      notes.push({
        midi: note.midiPitch,
        startTimeMs,
        durationMs: endTimeMs - startTimeMs,
        label: note.pitchName,
        color: voice.color,
        role: voice.role === 'student' ? 'input' : 'reference',
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
