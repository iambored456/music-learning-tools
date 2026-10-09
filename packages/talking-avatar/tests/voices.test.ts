import assert from 'node:assert/strict';
import test from 'node:test';
import { getVoicesAsync } from '../src/voices.ts';

const voice = (name: string) => ({ name, voiceURI: name, lang: 'en-CA', localService: true, default: false }) as SpeechSynthesisVoice;

function mockVoices() {
  const previousWindow = globalThis.window;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const listeners = new Set<() => void>();
  let timerId = 0;
  let voices: SpeechSynthesisVoice[] = [];
  globalThis.setTimeout = ((callback: () => void, delay: number) => {
    const id = ++timerId; timers.set(id, { callback, delay }); return id;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id: number) => { timers.delete(id); }) as typeof clearTimeout;
  globalThis.window = { speechSynthesis: {
    getVoices: () => voices,
    addEventListener: (_name: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_name: string, callback: () => void) => listeners.delete(callback),
  } } as unknown as Window & typeof globalThis;
  return {
    timers, listeners,
    set(next: SpeechSynthesisVoice[]) { voices = next; },
    emit() { [...listeners].forEach(callback => callback()); },
    run(delay: number) {
      const timer = [...timers.entries()].find(([, timer]) => timer.delay === delay);
      assert.ok(timer); timers.delete(timer[0]); timer[1].callback();
    },
    restore() { globalThis.window = previousWindow; globalThis.setTimeout = originalSetTimeout; globalThis.clearTimeout = originalClearTimeout; },
  };
}

test('voice loading waits past partial and empty events for the preferred voice', async () => {
  const mock = mockVoices();
  try {
    const linda = voice('Microsoft Linda');
    const richard = voice('Microsoft Richard');
    mock.set([linda]);
    let done = false;
    const pending = getVoicesAsync({ isReady: voices => voices.some(v => v.name.includes('Richard')) }).then(voices => { done = true; return voices; });
    mock.set([]); mock.emit(); await Promise.resolve();
    assert.equal(done, false);
    mock.set([linda]); mock.emit(); await Promise.resolve();
    assert.equal(done, false);
    mock.set([linda, richard]); mock.emit();
    assert.deepEqual(await pending, [linda, richard]);
    assert.equal(mock.timers.size, 0);
    assert.equal(mock.listeners.size, 0);
  } finally { mock.restore(); }
});

test('voice polling recovers without an event and deadline cleans up missing voices', async () => {
  const mock = mockVoices();
  try {
    const pending = getVoicesAsync();
    mock.set([voice('Microsoft Richard')]); mock.run(50);
    assert.equal((await pending)[0].name, 'Microsoft Richard');
    assert.equal(mock.timers.size, 0);
    mock.set([]);
    const empty = getVoicesAsync(); mock.run(1000);
    assert.deepEqual(await empty, []);
    assert.equal(mock.timers.size, 0);
    assert.equal(mock.listeners.size, 0);
  } finally { mock.restore(); }
});
