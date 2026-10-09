import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonBubbleDismissal } from '../src/lessonBubbleDismissal';

async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
function harness(reducedMotion = false) {
  let resolve!: () => void;
  const animation = {
    finished: new Promise<void>(done => { resolve = done; }), playState: 'running',
    pause() { this.playState = 'paused'; }, play() { this.playState = 'running'; },
    cancel() { this.playState = 'idle'; },
  };
  let frames: Keyframe[] = [];
  let duration: number | undefined;
  const node = {
    parentElement: { lastElementChild: { getBoundingClientRect: () => ({ height: 100 }) } },
    ownerDocument: { defaultView: { getComputedStyle: () => ({ rowGap: '12px' }), matchMedia: () => ({ matches: reducedMotion }) } },
    animate(next: Keyframe[], options: KeyframeAnimationOptions) {
      frames = next; duration = options.duration as number; return animation;
    },
  } as unknown as HTMLElement;
  return { node, animation, resolve: () => resolve(), frames: () => frames, duration: () => duration };
}

test('the oldest bubble floats from its previous position and fades while supporting pause', async () => {
  const h = harness();
  let completed = false;
  const action = lessonBubbleDismissal(h.node, { paused: true, onComplete: () => { completed = true; } });
  await flush();
  assert.deepEqual(h.frames(), [{ translate: '0px 112px', opacity: 1 }, { translate: '0px -12px', opacity: 0 }]);
  assert.equal(h.duration(), 650);
  assert.equal(h.animation.playState, 'paused');
  action.update({ paused: false, onComplete: () => { completed = true; } });
  assert.equal(h.animation.playState, 'running');
  h.resolve(); await flush();
  assert.equal(completed, true);
  action.destroy();
});

test('a canceled bubble cannot clear a later bubble', async () => {
  const h = harness();
  let completed = false;
  const action = lessonBubbleDismissal(h.node, { paused: false, onComplete: () => { completed = true; } });
  await flush();
  action.destroy(); h.resolve(); await flush();
  assert.equal(completed, false);
});

test('reduced motion removes the bubble without a timed animation', async () => {
  const h = harness(true);
  const action = lessonBubbleDismissal(h.node, { paused: true });
  await flush();
  assert.equal(h.duration(), 0);
  assert.equal(h.animation.playState, 'running');
  action.destroy();
});
