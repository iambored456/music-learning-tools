import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonScreenSlide, lessonScreenSlideMs } from '../src/index';

function fakeElement(reducedMotion = false) {
  const animations: {
    frames: Keyframe[];
    timing: KeyframeAnimationOptions;
    playState: AnimationPlayState;
    cancelled: boolean;
    finished: Promise<void>;
    finish(): void;
    pause(): void;
    play(): void;
    cancel(): void;
  }[] = [];
  // Deliberately no style/class API: the action must leave centering transforms
  // and lessonNoteAppearance's stroke/fill properties entirely alone.
  const node = {
    ownerDocument: {
      documentElement: { clientWidth: 1200 },
      defaultView: {
        matchMedia: () => ({ matches: reducedMotion }),
        getComputedStyle: () => ({ translate: animations.at(-1)?.frames.at(-1)?.translate ?? 'none' }),
      },
    },
    getBoundingClientRect: () => ({ left: 340, right: 380 }),
    animate(frames: Keyframe[], timing: KeyframeAnimationOptions) {
      let resolveFinished!: () => void;
      const finished = new Promise<void>(resolve => { resolveFinished = resolve; });
      const animation = {
        frames, timing, playState: 'running' as AnimationPlayState, cancelled: false,
        finished,
        finish() { this.playState = 'finished'; resolveFinished(); },
        pause() { this.playState = 'paused'; },
        play() { this.playState = 'running'; },
        cancel() { this.cancelled = true; },
      };
      animations.push(animation);
      return animation;
    },
  } as unknown as HTMLElement;
  return { node, animations };
}

test('entrances start at the left viewport edge and exits end at the right viewport edge', () => {
  const { node, animations } = fakeElement();
  const slide = lessonScreenSlide(node, { direction: 'enter-left' });
  assert.deepEqual(animations[0].frames, [{ translate: '-380px 0px' }, { translate: '0px 0px' }]);
  assert.deepEqual(animations[0].timing, { duration: lessonScreenSlideMs, easing: 'ease-out', fill: 'both' });
  slide.update({ direction: 'exit-right' });
  assert.equal(animations[0].cancelled, true);
  assert.deepEqual(animations[1].frames, [{ translate: '0px 0px' }, { translate: '860px 0px' }]);
  slide.destroy();
  assert.equal(animations[1].cancelled, true);
});

test('pause and resume retain the same animation; replay replaces it and clearing cancels it', () => {
  const { node, animations } = fakeElement();
  const slide = lessonScreenSlide(node, { direction: 'enter-left', paused: true, replayKey: 1 });
  assert.equal(animations[0].playState, 'paused');
  slide.update({ direction: 'enter-left', paused: false, replayKey: 1 });
  assert.equal(animations[0].playState, 'running');
  slide.update({ direction: 'enter-left', paused: true, replayKey: 1 });
  assert.equal(animations[0].playState, 'paused');
  assert.equal(animations.length, 1);
  slide.update({ direction: 'enter-left', paused: true, replayKey: 2 });
  assert.equal(animations[0].cancelled, true);
  assert.equal(animations[1].playState, 'paused');
  slide.update({ direction: null, replayKey: 2 });
  assert.equal(animations[1].cancelled, true);
  assert.equal(animations.length, 2);
});

test('completed entrances do not restart when a lesson pauses or chart rows change', () => {
  const { node, animations } = fakeElement();
  const slide = lessonScreenSlide(node, { direction: 'enter-left' });
  animations[0].playState = 'finished';
  slide.update({ direction: 'enter-left', paused: true });
  slide.update({ direction: 'enter-left', paused: false });
  assert.equal(animations[0].playState, 'finished');
  assert.equal(animations.length, 1);
});

test('reduced-motion preferences skip both directions', () => {
  const { node, animations } = fakeElement(true);
  const slide = lessonScreenSlide(node, { direction: 'enter-left' });
  slide.update({ direction: 'exit-right' });
  slide.destroy();
  assert.equal(animations.length, 0);
});

test('moving to a canvas center and back preserves the current translation and pauses', () => {
  const { node, animations } = fakeElement();
  const slide = lessonScreenSlide(node, { direction: 'to-offset', offset: { x: 0, y: 0 }, instant: true });
  assert.equal(animations[0].timing.duration, 0);
  slide.update({ direction: 'to-offset', offset: { x: 500, y: 20 }, paused: true });
  assert.deepEqual(animations[1].frames, [{ translate: '0px 0px' }, { translate: '500px 20px' }]);
  assert.equal(animations[1].timing.duration, lessonScreenSlideMs);
  assert.equal(animations[1].playState, 'paused');
  slide.update({ direction: 'to-offset', offset: { x: 500, y: 20 }, paused: false });
  assert.equal(animations[1].playState, 'running');
  // Interrupt halfway through: returning must start from what is displayed.
  node.ownerDocument.defaultView!.getComputedStyle = () => ({ translate: '230px 15px' } as CSSStyleDeclaration);
  slide.update({ direction: 'to-offset', offset: { x: 0, y: 0 } });
  assert.deepEqual(animations[2].frames, [{ translate: '230px 15px' }, { translate: '0px 0px' }]);
  assert.equal(animations[1].cancelled, true);
  slide.destroy();
  assert.equal(animations[2].cancelled, true);
});

test('reduced motion restores the centered avatar immediately', () => {
  const { node, animations } = fakeElement(true);
  lessonScreenSlide(node, { direction: 'to-offset', offset: { x: 500, y: 20 } });
  assert.equal(animations[0].timing.duration, 0);
  assert.deepEqual(animations[0].frames.at(-1), { translate: '500px 20px' });
});

test('slide completion follows actual arrival and ignores canceled or replaced animations', async () => {
  const { node, animations } = fakeElement();
  let arrivals = 0;
  const options = { direction: 'enter-left' as const, onComplete: () => { arrivals++; } };
  const slide = lessonScreenSlide(node, options);
  slide.update({ ...options, paused: true });
  assert.equal(arrivals, 0);
  slide.update({ ...options, paused: false, replayKey: 1 });
  animations[0].finish();
  await Promise.resolve();
  assert.equal(arrivals, 0);
  animations[1].finish();
  await Promise.resolve();
  assert.equal(arrivals, 1);
  slide.update({ ...options, replayKey: 2 });
  slide.destroy();
  animations[2].finish();
  await Promise.resolve();
  assert.equal(arrivals, 1);
});

test('reduced-motion and seek arrivals complete without animation and can still be canceled', async () => {
  const { node } = fakeElement(true);
  let arrivals = 0;
  lessonScreenSlide(node, { direction: 'enter-left', onComplete: () => { arrivals++; } });
  await Promise.resolve();
  assert.equal(arrivals, 1);
  const pending = lessonScreenSlide(node, { direction: 'enter-left', onComplete: () => { arrivals++; } });
  pending.destroy();
  await Promise.resolve();
  assert.equal(arrivals, 1);
  const instant = fakeElement();
  lessonScreenSlide(instant.node, { direction: 'enter-left', instant: true, onComplete: () => { arrivals++; } });
  await Promise.resolve();
  assert.equal(arrivals, 2);
  assert.equal(instant.animations.length, 0);
});

test('a right entrance starts beyond the right screen edge and pauses until resumed', async () => {
  const { node, animations } = fakeElement();
  let arrivals = 0;
  const options = { direction: 'enter-right' as const, paused: true, onComplete: () => arrivals++ };
  const slide = lessonScreenSlide(node, options);
  assert.deepEqual(animations[0].frames, [{ translate: '860px 0px' }, { translate: '0px 0px' }]);
  assert.equal(animations[0].playState, 'paused');
  assert.equal(arrivals, 0);
  slide.update({ ...options, paused: false });
  assert.equal(animations[0].playState, 'running');
  assert.equal(animations.length, 1);
  animations[0].finish(); await Promise.resolve();
  assert.equal(arrivals, 1);
  slide.destroy();
});

test('right entrances arrive immediately for reduced motion or restored checkpoints', async () => {
  for (const reducedMotion of [false, true]) {
    const { node, animations } = fakeElement(reducedMotion);
    let arrivals = 0;
    lessonScreenSlide(node, { direction: 'enter-right', instant: !reducedMotion, onComplete: () => arrivals++ });
    await Promise.resolve();
    assert.equal(animations.length, 0);
    assert.equal(arrivals, 1);
  }
});

test('a shifted note exits from its current offset without jumping back to its original column', () => {
  const { node, animations } = fakeElement();
  const slide = lessonScreenSlide(node, { direction: 'to-offset', offset: { x: 24, y: 0 } });
  animations[0].finish();
  slide.update({ direction: 'exit-right', offset: { x: 24, y: 0 } });
  assert.deepEqual(animations[1].frames, [{ translate: '24px 0px' }, { translate: '860px 0px' }]);
  slide.destroy();
});
