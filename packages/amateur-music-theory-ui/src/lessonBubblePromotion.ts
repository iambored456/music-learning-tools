import { tick } from 'svelte';
import { lessonScreenSlide } from '@mlt/lesson-kit';

/** Lift the retained explanation from its old position above the new bubble. */
export function lessonBubblePromotion(node: HTMLElement, initial: { enabled: boolean; paused: boolean }) {
  let options = initial;
  let disposed = false;
  let slide: ReturnType<typeof lessonScreenSlide> | undefined;
  void tick().then(() => {
    if (disposed || !options.enabled) return;
    const stack = node.parentElement;
    const lower = node.nextElementSibling;
    if (!stack || !lower) return;
    const gap = parseFloat(getComputedStyle(stack).rowGap) || 0;
    slide = lessonScreenSlide(node, {
      direction: 'to-offset', offset: { x: 0, y: lower.getBoundingClientRect().height + gap }, instant: true,
    });
    slide.update({ direction: 'to-offset', offset: { x: 0, y: 0 }, paused: options.paused });
  });
  return {
    update(next: { enabled: boolean; paused: boolean }): void {
      options = next;
      slide?.update({ direction: 'to-offset', offset: { x: 0, y: 0 }, paused: next.paused });
    },
    destroy(): void { disposed = true; slide?.destroy(); },
  };
}
