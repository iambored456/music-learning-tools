import type { LessonDefinition, LessonSection } from './lessons';

export type LessonSceneProps = {
  lesson: LessonDefinition;
  currentStep?: number;
  isPlaying?: boolean;
  volume?: number;
  resetSignal?: number;
  onSectionComplete?: () => void;
  onLessonComplete?: () => void;
};
export type LessonSectionProps = {
  section: LessonSection;
  isPlaying: boolean;
  volume: number;
  ensureAudioContext: () => Promise<AudioContext | null>;
  onComplete?: () => void;
};
