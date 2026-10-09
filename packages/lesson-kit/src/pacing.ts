/** Shared lesson pacing in milliseconds. Placement defaults come from 1.2.1.c.
 * Keep pedagogical exceptions in lesson definitions, with a reason for the override.
 * These are separate phases: answer feedback, next question, then exercise completion.
 */
export const lessonPacing = Object.freeze({
  noteMs: 430,
  comparisonNoteMs: 650,
  betweenComparisonNotesMs: 280,
  betweenNotesMs: 130,
  afterCorrectPlacementMs: 780,
  betweenPlacementQuestionsMs: 300,
  afterExerciseMs: 320,
  afterRetryMs: 420,
  afterCelebrationMs: 650,
});
