type SourceCell = { x: number; y: number; color: string };
export const legendArrivalTiming = { horizontal: 650, vertical: 650, label: 220 } as const;

/** Resting geometry belongs to the legend; translate preserves its row centering. */
export function legendArrivalFrames(source: SourceCell, color: string) {
  const duration = legendArrivalTiming.horizontal + legendArrivalTiming.vertical + legendArrivalTiming.label;
  const across = legendArrivalTiming.horizontal / duration;
  const arrived = (legendArrivalTiming.horizontal + legendArrivalTiming.vertical) / duration;
  return {
    duration,
    cell: [
      { offset: 0, translate: `${source.x}px ${source.y}px`, backgroundColor: source.color },
      { offset: across, translate: `0px ${source.y}px`, backgroundColor: source.color },
      { offset: arrived, translate: '0px 0px', backgroundColor: color },
      { offset: 1, translate: '0px 0px', backgroundColor: color },
    ],
    label: [{ offset: 0, opacity: 0 }, { offset: arrived, opacity: 0 }, { offset: 1, opacity: 1 }],
  };
}

type Options = {
  source?: SourceCell; color: string; instant: boolean; paused: boolean;
  onComplete: () => void;
};

/** Move a blank natural cell across, change pitch/color vertically, then reveal its name. */
export function lesson12LegendMotion(node: HTMLElement, initial: Options) {
  let options = initial;
  let animations: Animation[] = [];
  let generation = 0;
  let completed = false;
  const label = node.querySelector<HTMLElement>('.accidental-legend-text')!;

  function start(currentTime = 0): void {
    const version = ++generation;
    animations.forEach(animation => animation.cancel());
    animations = [];
    const complete = () => {
      if (version !== generation) return;
      completed = true; options.onComplete();
    };
    const view = node.ownerDocument.defaultView;
    if (completed || options.instant || view?.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      label.style.opacity = '1';
      if (!completed) queueMicrotask(complete);
      return;
    }
    label.style.opacity = '0';
    const frames = options.source ? legendArrivalFrames(options.source, options.color) : {
      duration: legendArrivalTiming.horizontal,
      cell: [{ translate: `${-node.getBoundingClientRect().right}px 0px` }, { translate: '0px 0px' }],
      label: [{ opacity: 1 }, { opacity: 1 }],
    };
    const timing: KeyframeAnimationOptions = { duration: frames.duration, easing: 'ease-in-out', fill: 'both' };
    animations = [node.animate(frames.cell, timing), label.animate(frames.label, timing)];
    animations.forEach(animation => {
      animation.currentTime = currentTime;
      if (options.paused) animation.pause();
    });
    void Promise.all(animations.map(animation => animation.finished)).then(complete, () => {});
  }
  start();
  return {
    update(next: Options): void {
      const geometryChanged = next.source?.x !== options.source?.x || next.source?.y !== options.source?.y
        || next.source?.color !== options.source?.color || next.color !== options.color || next.instant !== options.instant;
      options = next;
      if (geometryChanged) start(Number(animations[0]?.currentTime ?? 0));
      else animations.forEach(animation => {
        if (animation.playState === 'finished') return;
        if (options.paused) animation.pause();
        else if (animation.playState === 'paused') animation.play();
      });
    },
    destroy(): void { generation++; animations.forEach(animation => animation.cancel()); },
  };
}
