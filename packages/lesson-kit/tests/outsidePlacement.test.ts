import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonOutsidePlacement, type LessonOutsidePlacementOptions } from '../src/index';

class EventSource {
  listeners = new Map<string, Set<(event: PointerEvent) => void>>();
  addEventListener(type: string, callback: (event: PointerEvent) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(callback); this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, callback: (event: PointerEvent) => void) { this.listeners.get(type)?.delete(callback); }
  emit(type: string, overrides: Partial<PointerEvent> = {}, path: unknown[] = []) {
    let prevented = false;
    const event = { pointerId: 1, button: 0, buttons: 1, isPrimary: true, pointerType: 'mouse',
      clientX: 10, clientY: 200, preventDefault() { prevented = true; }, composedPath: () => path,
      ...overrides } as PointerEvent;
    for (const callback of this.listeners.get(type) ?? []) callback(event);
    return { event, prevented };
  }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}

function harness(overrides: Partial<LessonOutsidePlacementOptions> = {}) {
  const document = new EventSource();
  const view = new EventSource();
  const moves: Array<[number, number]> = [];
  const drops: Array<[number, number]> = [];
  let cancellations = 0;
  const node = { ownerDocument: Object.assign(document, { defaultView: view }),
    getBoundingClientRect: () => ({ left: 100, top: 100, right: 500, bottom: 400, width: 400, height: 300 }),
  } as unknown as HTMLElement;
  const options: LessonOutsidePlacementOptions = { enabled: true, questionKey: 'first',
    onMove: event => moves.push([event.clientX, event.clientY]),
    onDrop: event => drops.push([event.clientX, event.clientY]), onCancel: () => { cancellations++; }, ...overrides };
  const action = lessonOutsidePlacement(node, options);
  return { document, view, moves, drops, options, action, get cancellations() { return cancellations; } };
}

test('a drag from outside previews on entry and submits once at the actual release position', () => {
  const h = harness();
  h.document.emit('pointerdown');
  assert.equal(h.document.emit('pointermove', { clientX: 240, clientY: 170 }).prevented, true);
  h.document.emit('pointerup', { clientX: 350, clientY: 230 });
  h.document.emit('pointerup', { clientX: 350, clientY: 230 });
  assert.deepEqual(h.moves, [[240, 170]]);
  assert.deepEqual(h.drops, [[350, 230]]);
  assert.equal(h.cancellations, 0);
  h.action.destroy();
});

test('legend starts are allowed, legend releases are rejected, and leaving clears the preview', () => {
  const h = harness({ leftInset: 60 });
  h.document.emit('pointerdown', { clientX: 125 });
  h.document.emit('pointermove', { clientX: 250 });
  h.document.emit('pointermove', { clientX: 125 });
  assert.equal(h.cancellations, 1);
  h.document.emit('pointerup', { clientX: 125 });
  assert.deepEqual(h.drops, []);
  h.document.emit('pointerdown', { clientX: 125 });
  h.document.emit('pointerup', { clientX: 250 });
  assert.deepEqual(h.drops, [[250, 200]]);
  h.action.destroy();
});

test('releases outside the musical area never submit, even after entering', () => {
  for (const point of [{ clientX: 50 }, { clientX: 550 }, { clientX: 250, clientY: 50 }, { clientX: 250, clientY: 450 }]) {
    const h = harness();
    h.document.emit('pointerdown');
    h.document.emit('pointermove', { clientX: 250 });
    h.document.emit('pointerup', point);
    assert.deepEqual(h.drops, []);
    assert.equal(h.cancellations, 1);
    h.action.destroy();
  }
});

test('local grid presses stay with existing handlers and controls in the composed path are excluded', () => {
  const h = harness();
  h.document.emit('pointerdown', { clientX: 250 });
  h.document.emit('pointerup', { clientX: 250 });
  const decorativeChild = { matches: () => false };
  for (const tag of ['button', 'input', 'a', '[role="slider"]', '[contenteditable]:not([contenteditable="false"])']) {
    const control = { matches: (selector: string) => selector.includes(tag) };
    h.document.emit('pointerdown', {}, [decorativeChild, control, h.document]);
    h.document.emit('pointerup', { clientX: 250 });
  }
  assert.deepEqual(h.drops, []);
  assert.equal(h.cancellations, 0);
  h.action.destroy();
});

test('pause, feedback locks, and new question checkpoints cancel a pending gesture', () => {
  for (const update of [{ enabled: false }, { questionKey: 'next' }]) {
    const h = harness();
    h.document.emit('pointerdown');
    h.action.update({ ...h.options, ...update });
    h.document.emit('pointerup', { clientX: 250 });
    assert.deepEqual(h.drops, []);
    assert.equal(h.cancellations, 1);
    h.action.destroy();
  }
  const h = harness({ enabled: false });
  h.document.emit('pointerdown');
  h.action.update({ ...h.options, enabled: true });
  h.document.emit('pointerup', { clientX: 250 });
  assert.deepEqual(h.drops, []);
  h.action.destroy();
});

test('secondary buttons and other pointers cannot start or finish the primary drag', () => {
  const h = harness();
  h.document.emit('pointerdown', { button: 2 });
  h.document.emit('pointerup', { clientX: 250 });
  h.document.emit('pointerdown', { isPrimary: false });
  h.document.emit('pointerup', { clientX: 250 });
  assert.deepEqual(h.drops, []);
  h.document.emit('pointerdown');
  h.document.emit('pointerdown', { pointerId: 2 });
  h.document.emit('pointerup', { pointerId: 2, clientX: 300 });
  assert.deepEqual(h.drops, []);
  h.document.emit('pointerup', { clientX: 250 });
  assert.deepEqual(h.drops, [[250, 200]]);
  h.action.destroy();
});

test('pointer cancellation, lost mouse button, window blur, and destruction prevent stale placements', () => {
  for (const reason of ['pointercancel', 'buttons', 'blur', 'destroy']) {
    const h = harness();
    h.document.emit('pointerdown');
    if (reason === 'pointercancel') h.document.emit('pointercancel');
    if (reason === 'buttons') h.document.emit('pointermove', { buttons: 0, clientX: 250 });
    if (reason === 'blur') h.view.emit('blur');
    if (reason === 'destroy') h.action.destroy();
    h.document.emit('pointerup', { clientX: 250 });
    assert.deepEqual(h.drops, []);
    assert.equal(h.cancellations, 1);
    if (reason !== 'destroy') h.action.destroy();
    assert.equal(h.document.listenerCount, 0);
    assert.equal(h.view.listenerCount, 0);
  }
});
