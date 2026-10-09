import { tick } from 'svelte';

/** Float the oldest bubble out as the new bottom bubble occupies its place. */
export function lessonBubbleDismissal(node: HTMLElement, initial: { paused: boolean; onComplete?: () => void }) {
  let options = initial;
  let disposed = false;
  let animation: Animation | null = null;
  void tick().then(() => {
    if (disposed) return;
    const view = node.ownerDocument.defaultView;
    const stack = node.parentElement;
    if (!view || !stack) return;
    const gap = parseFloat(view.getComputedStyle(stack).rowGap) || 0;
    const distance = (stack.lastElementChild?.getBoundingClientRect().height ?? 0) + gap;
    const reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    animation = node.animate([
      { translate: `0px ${distance}px`, opacity: 1 },
      { translate: `0px ${-gap}px`, opacity: 0 },
    ], { duration: reducedMotion ? 0 : 650, easing: 'ease-in-out', fill: 'both' });
    if (options.paused && !reducedMotion) animation.pause();
    animation.finished.then(() => { if (!disposed) options.onComplete?.(); }, () => {});
  });
  return {
    update(next: typeof initial): void {
      options = next;
      if (animation && animation.playState !== 'finished') {
        if (next.paused) animation.pause();
        else if (animation.playState === 'paused') animation.play();
      }
    },
    destroy(): void { disposed = true; animation?.cancel(); },
  };
}
