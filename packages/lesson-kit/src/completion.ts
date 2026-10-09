import { lessonPacing } from './pacing';

/** Finish a locked exercise using the caller's pause-aware, cancellable clock.
 * Playback must resolve after the last note ends, without an extra trailing gap.
 * The caller advances only when this returns true; seeking/restarting invalidates
 * isCurrent so an old completion cannot advance a new exercise.
 */
export async function completeLessonExercise(options: {
  replay?: () => Promise<void>;
  wait: (milliseconds: number) => Promise<boolean>;
  isCurrent: () => boolean;
}): Promise<boolean> {
  if (!options.isCurrent()) return false;
  await options.replay?.();
  if (!options.isCurrent()) return false;
  return await options.wait(lessonPacing.afterExerciseMs) && options.isCurrent();
}
