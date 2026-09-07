export const SOLFEGE_EXERCISES = [
  { id: 'ladukhin-1-2', name: 'Ladukhin 1-2', start: 1 },
  { id: 'ladukhin-1-3', name: 'Ladukhin 1-2-3', start: 51 },
  { id: 'ladukhin-1-4', name: 'Ladukhin 1-2-3-4', start: 101 },
] as const;

export type SolfegeExercise = (typeof SOLFEGE_EXERCISES)[number];
