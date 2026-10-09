import assert from 'node:assert/strict';
import test from 'node:test';
import { createAvatarActor } from '../src/avatarActor.ts';
import type { AvatarViewDom } from '../src/avatarViewDom.ts';
import type { AvatarAssetKey } from '../src/types.ts';

test('thinking is a resting expression; speech and feedback take priority', async () => {
  let shown: AvatarAssetKey | undefined;
  const view: AvatarViewDom = {
    el: {} as HTMLElement,
    setSvg: key => { shown = key; },
    setVisible() {}, enter: async () => {}, preload: async () => {}, dispose() {},
  };
  const actor = createAvatarActor({ view });
  try {
    await actor.enter();
    assert.equal(actor.getState(), 'idle_smile');
    actor.setThinking(true);
    assert.equal(actor.getState(), 'idle_thinking');
    assert.equal(shown, 'thinking_nowave');
    actor.startTalking();
    assert.equal(actor.getState(), 'talking');
    actor.setThinking(true);
    assert.equal(actor.getState(), 'talking');
    actor.stopTalking();
    assert.equal(shown, 'thinking_nowave');
    actor.setFeedbackBad(true);
    assert.equal(shown, 'nosmile_nowave');
    actor.setFeedbackBad(false);
    assert.equal(shown, 'thinking_nowave');
    actor.setThinking(false);
    assert.equal(shown, 'smile_nowave');
  } finally { actor.dispose(); }
});

test('submitting during speech returns to smiling, and thinking never reveals a hidden avatar', async () => {
  const view: AvatarViewDom = {
    el: {} as HTMLElement,
    setSvg() {}, setVisible() {}, enter: async () => {}, preload: async () => {}, dispose() {},
  };
  const actor = createAvatarActor({ view });
  try {
    actor.setThinking(true);
    assert.equal(actor.getState(), 'hidden');
    await actor.enter();
    actor.startTalking();
    actor.setThinking(false);
    actor.stopTalking();
    assert.equal(actor.getState(), 'idle_smile');
    actor.hide();
    actor.setThinking(true);
    assert.equal(actor.getState(), 'hidden');
  } finally { actor.dispose(); }
});
