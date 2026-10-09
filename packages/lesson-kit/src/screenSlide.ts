export const lessonScreenSlideMs = 650;

export type LessonScreenSlideOptions = {
  direction: 'enter-left' | 'enter-right' | 'exit-right' | 'to-offset' | null;
  offset?: { x: number; y: number };
  /** Restore a seek checkpoint immediately rather than replaying prior motion. */
  instant?: boolean;
  paused?: boolean;
  /** Change when replaying an entrance on an element that remains mounted. */
  replayKey?: number;
  /** Runs when the active slide reaches its destination; canceled slides do not call it. */
  onComplete?: () => void;
};

/** Slide from/to the viewport edge without replacing the element's transform. */
export function lessonScreenSlide(node: HTMLElement, initial: LessonScreenSlideOptions) {
  let options = initial;
  let animation: Animation | null = null;
  let generation = 0;

  function start(): void {
    const currentGeneration = ++generation;
    const view = node.ownerDocument.defaultView;
    const previousTranslate = animation
      ? view?.getComputedStyle(node).translate : '0px 0px';
    animation?.cancel();
    animation = null;
    if (!options.direction || !view) return;
    const reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const complete = () => {
      if (generation === currentGeneration) options.onComplete?.();
    };
    if ((reducedMotion || options.instant) && options.direction !== 'to-offset') {
      queueMicrotask(complete);
      return;
    }

    if (options.direction === 'to-offset') {
      animation = node.animate([
        { translate: previousTranslate && previousTranslate !== 'none' ? previousTranslate : '0px 0px' },
        { translate: `${options.offset?.x ?? 0}px ${options.offset?.y ?? 0}px` },
      ], { duration: options.instant || reducedMotion ? 0 : lessonScreenSlideMs, easing: 'ease-out', fill: 'both' });
      if (options.paused && !options.instant && !reducedMotion) animation.pause();
      animation.finished.then(complete, () => {});
      return;
    }

    // Measure the resting geometry, including the Hub's gutters and any note
    // centering transform. Individual translate keeps those transforms intact.
    const bounds = node.getBoundingClientRect();
    const viewportWidth = node.ownerDocument.documentElement.clientWidth;
    const offset = options.direction === 'enter-left' ? -bounds.right : viewportWidth - bounds.left;
    const offscreen = `${offset}px 0px`;
    animation = node.animate(
      options.direction !== 'exit-right'
        ? [{ translate: offscreen }, { translate: '0px 0px' }]
        : [{ translate: previousTranslate && previousTranslate !== 'none' ? previousTranslate : '0px 0px' }, { translate: offscreen }],
      { duration: lessonScreenSlideMs, easing: 'ease-out', fill: 'both' },
    );
    if (options.paused) animation.pause();
    animation.finished.then(complete, () => {});
  }

  start();
  return {
    update(next: LessonScreenSlideOptions): void {
      const restart = next.direction !== options.direction || next.replayKey !== options.replayKey
        || next.offset?.x !== options.offset?.x || next.offset?.y !== options.offset?.y
        || next.instant !== options.instant;
      options = next;
      if (restart) start();
      else if (animation && animation.playState !== 'finished') {
        if (options.paused) animation.pause();
        else if (animation.playState === 'paused') animation.play();
      }
    },
    destroy(): void { generation++; animation?.cancel(); },
  };
}
