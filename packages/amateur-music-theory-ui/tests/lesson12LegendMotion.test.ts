import assert from 'node:assert/strict';
import test from 'node:test';
import { legendArrivalFrames, lesson12LegendMotion } from '../src/lesson12LegendMotion';

function harness(reducedMotion = false) {
  const animations: Array<ReturnType<typeof animate>> = [];
  const frames: Keyframe[][] = [];
  function animate(keyframes: Keyframe[]) {
    let resolve!: () => void;
    let reject!: () => void;
    const animation = {
      currentTime: 0, playState: 'running',
      finished: new Promise<void>((yes, no) => { resolve = yes; reject = no; }),
      pause() { animation.playState = 'paused'; },
      play() { animation.playState = 'running'; },
      cancel() { animation.playState = 'idle'; reject(); },
      finish() { animation.playState = 'finished'; resolve(); },
    };
    frames.push(keyframes); animations.push(animation);
    return animation;
  }
  const label = { style: { opacity: '' }, animate };
  const node = {
    ownerDocument: { defaultView: { matchMedia: () => ({ matches: reducedMotion }) } },
    querySelector: () => label, getBoundingClientRect: () => ({ right: 300 }), animate,
  } as unknown as HTMLElement;
  let arrivals = 0;
  const options = { source: { x: -70, y: -20, color: '#7d94e0' }, color: '#4c9fd5', instant: false,
    paused: false, onComplete: () => { arrivals++; } };
  return { node, label, options, animations, frames, arrivals: () => arrivals };
}
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

test('natural cells cross at their original pitch before moving down or up and revealing text', () => {
  for (const y of [-20, 20]) {
    const frames = legendArrivalFrames({ x: -70, y, color: '#7d94e0' }, '#4c9fd5');
    assert.equal(frames.cell[0].translate, `-70px ${y}px`);
    assert.equal(frames.cell[1].translate, `0px ${y}px`);
    assert.equal(frames.cell[1].backgroundColor, '#7d94e0');
    assert.equal(frames.cell[2].translate, '0px 0px');
    assert.equal(frames.cell[2].backgroundColor, '#4c9fd5');
    assert.equal(frames.label[1].offset, frames.cell[2].offset);
    assert.deepEqual(frames.label.map(frame => frame.opacity), [0, 0, 1]);
  }
});

test('both cell movement and label fading pause, resume, and settle before the arrival callback', async () => {
  const h = harness();
  const motion = lesson12LegendMotion(h.node, h.options);
  motion.update({ ...h.options, paused: true });
  assert.ok(h.animations.every(animation => animation.playState === 'paused'));
  motion.update(h.options);
  assert.ok(h.animations.every(animation => animation.playState === 'running'));
  h.animations[0].finish(); await flush();
  assert.equal(h.arrivals(), 0);
  h.animations[1].finish(); await flush();
  assert.equal(h.arrivals(), 1);
  motion.destroy();
});

test('resizing keeps animation progress; cancelled animations cannot announce arrival', async () => {
  const h = harness();
  const motion = lesson12LegendMotion(h.node, h.options);
  h.animations.forEach(animation => { animation.currentTime = 450; });
  motion.update({ ...h.options, source: { ...h.options.source, x: -35, y: -10 } });
  assert.ok(h.animations.slice(2).every(animation => animation.currentTime === 450));
  motion.destroy();
  h.animations.forEach(animation => animation.finish()); await flush();
  assert.equal(h.arrivals(), 0);
});

test('reduced motion and restored checkpoints display the final cell and label immediately', async () => {
  for (const reducedMotion of [false, true]) {
    const h = harness(reducedMotion);
    const motion = lesson12LegendMotion(h.node, { ...h.options, instant: !reducedMotion });
    await flush();
    assert.equal(h.animations.length, 0);
    assert.equal(h.label.style.opacity, '1');
    assert.equal(h.arrivals(), 1);
    motion.destroy();
  }
});
