import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonGridMask } from '../src/index';

function element(reducedMotion = false) {
  const animations: any[] = [];
  const style = { clipPath: '', removeProperty() { this.clipPath = ''; } };
  const node = {
    style,
    ownerDocument: { defaultView: {
      getComputedStyle: () => ({ clipPath: style.clipPath || 'none' }),
      matchMedia: () => ({ matches: reducedMotion }),
    } },
    animate(frames: Keyframe[], timing: KeyframeAnimationOptions) {
      let finish!: () => void;
      const animation = {
        frames, timing, playState: 'running', cancelled: false,
        finished: new Promise<void>(resolve => { finish = resolve; }),
        pause() { this.playState = 'paused'; }, play() { this.playState = 'running'; },
        cancel() { this.cancelled = true; }, finish() { this.playState = 'finished'; finish(); },
      };
      animations.push(animation);
      return animation;
    },
  } as unknown as HTMLElement;
  return { node, style, animations };
}

test('trimming from the bottom waits for actual completion and pauses the same mask animation', async () => {
  const h = element(); let arrivals = 0;
  const mask = lessonGridMask(h.node, { enabled: false, top: 0, bottom: 0 });
  assert.equal(h.style.clipPath, '', 'inactive masks leave other reveal styles alone');
  const options = { enabled: true, top: 0, bottom: 60, onComplete: () => arrivals++ };
  mask.update(options);
  assert.deepEqual(h.animations[0].frames, [
    { clipPath: 'inset(0px 0px 0px 0px round 22px)' },
    { clipPath: 'inset(0px 0px 60px 0px round 22px)' },
  ]);
  mask.update({ ...options, paused: true });
  assert.equal(h.animations[0].playState, 'paused');
  assert.equal(arrivals, 0);
  mask.update(options);
  assert.equal(h.animations.length, 1);
  h.animations[0].finish(); await Promise.resolve();
  assert.equal(arrivals, 1);
  mask.destroy();
});

test('restoring a new range is immediate; canceled masks cannot complete a newer reveal', async () => {
  const h = element(); let arrivals = 0;
  const mask = lessonGridMask(h.node, { enabled: true, top: 0, bottom: 0 });
  await Promise.resolve();
  mask.update({ enabled: true, top: 0, bottom: 60, onComplete: () => arrivals++ });
  const old = h.animations[0];
  mask.update({ enabled: true, top: 240, bottom: 0, instant: true, onComplete: () => arrivals++ });
  await Promise.resolve();
  assert.equal(old.cancelled, true);
  assert.equal(h.style.clipPath, 'inset(240px 0px 0px 0px round 22px)');
  assert.equal(arrivals, 1);
  old.finish(); await Promise.resolve();
  assert.equal(arrivals, 1);
  mask.update({ enabled: true, top: 0, bottom: 0, durationMs: 1200, onComplete: () => arrivals++ });
  assert.equal(h.animations[1].timing.duration, 1200);
  mask.destroy(); h.animations[1].finish(); await Promise.resolve();
  assert.equal(arrivals, 1);
});

test('reduced motion applies the final mask without an animation', async () => {
  const h = element(true); let arrivals = 0;
  const mask = lessonGridMask(h.node, { enabled: false, top: 0, bottom: 0 });
  mask.update({ enabled: true, top: 120, bottom: 0, onComplete: () => arrivals++ });
  await Promise.resolve();
  assert.equal(h.animations.length, 0);
  assert.equal(arrivals, 1);
  assert.equal(h.style.clipPath, 'inset(120px 0px 0px 0px round 22px)');
});
