import { NoteFillAnimator } from '@mlt/singing-trainer-core/services/noteFill.js';

/** Only redraw during attack/decay/release; held fills remain at their sustain level. */
export function createNoteFillFeedback() {
  const animator = new NoteFillAnimator();
  let levels = $state<ReadonlyMap<string, number>>(new Map());
  let frame = 0;

  function tick(now: number) {
    frame = 0;
    levels = animator.levels(now);
    if (animator.isAnimating(now)) frame = requestAnimationFrame(tick);
  }

  return {
    get levels() { return levels; },
    setActiveNotes(ids: readonly string[]) {
      const now = performance.now();
      if (!animator.setActiveNotes(ids, now)) return;
      cancelAnimationFrame(frame);
      tick(now);
    },
    clear() {
      cancelAnimationFrame(frame);
      frame = 0;
      animator.clear();
      levels = new Map();
    },
  };
}
