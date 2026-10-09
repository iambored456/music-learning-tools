import { lessonScreenSlideMs } from './screenSlide';

export type LessonGridMaskOptions = {
  enabled: boolean;
  top: number;
  bottom: number;
  paused?: boolean;
  instant?: boolean;
  durationMs?: number;
  replayKey?: number;
  onComplete?: () => void;
};

/** Reveal or trim fixed grid rows without moving their pitch coordinates. */
export function lessonGridMask(node: HTMLElement, initial: LessonGridMaskOptions) {
  let options = initial;
  let animation: Animation | null = null;
  let generation = 0;
  let ownsMask = false;

  function start(animate: boolean): void {
    const current = ++generation;
    const view = node.ownerDocument.defaultView;
    const from = view?.getComputedStyle(node).clipPath;
    animation?.cancel();
    animation = null;
    if (!options.enabled) {
      if (ownsMask) node.style.removeProperty('clip-path');
      ownsMask = false;
      return;
    }
    ownsMask = true;
    const target = `inset(${options.top}px 0px ${options.bottom}px 0px round 22px)`;
    node.style.clipPath = target;
    const complete = () => { if (generation === current) options.onComplete?.(); };
    if (!animate || options.instant || !view || view.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(complete);
      return;
    }
    animation = node.animate([
      { clipPath: from && from !== 'none' ? from : 'inset(0px 0px 0px 0px round 22px)' }, { clipPath: target },
    ], { duration: options.durationMs ?? lessonScreenSlideMs, easing: 'ease-in-out', fill: 'both' });
    if (options.paused) animation.pause();
    animation.finished.then(complete, () => {});
  }

  start(false);
  return {
    update(next: LessonGridMaskOptions): void {
      const restart = next.enabled !== options.enabled || next.top !== options.top || next.bottom !== options.bottom
        || next.instant !== options.instant || next.replayKey !== options.replayKey;
      options = next;
      if (restart) start(true);
      else if (animation && animation.playState !== 'finished') {
        if (options.paused) animation.pause();
        else if (animation.playState === 'paused') animation.play();
      }
    },
    destroy(): void {
      generation++;
      animation?.cancel();
      if (ownsMask) node.style.removeProperty('clip-path');
    },
  };
}
