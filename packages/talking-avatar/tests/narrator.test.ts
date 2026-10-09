import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { createNarrator } from '../src/narrator.ts';

class MockUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onboundary: ((event: { name: string; charIndex?: number }) => void) | null = null;

  constructor(public text: string) {}
}

const voice = {
  voiceURI: 'test-voice', name: 'Test Voice', lang: 'en-CA', localService: true, default: false,
} as SpeechSynthesisVoice;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

const flushMicrotasks = async () => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
};
const waitForDispatch = () => new Promise<void>((resolve) => setTimeout(resolve, 70));

function makeHarness(t: TestContext, onPreSpeakWave = async (_durationMs: number) => {}) {
  const globals = globalThis as unknown as Record<string, unknown>;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const utterances: MockUtterance[] = [];
  const dispatchedVolumes: number[] = [];
  const speakingChanges: boolean[] = [];
  const listeners = new Set<() => void>();
  let voices = [voice];
  let pulses = 0;
  const speechSynthesis = {
    getVoices: () => voices,
    speak: (utterance: MockUtterance) => {
      utterances.push(utterance);
      // Native engines can snapshot volume here and ignore later mutations.
      dispatchedVolumes.push(utterance.volume);
      utterance.onstart?.();
    },
    // Deliberately send no events: browsers need not finish a canceled utterance.
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    addEventListener: (_event: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_event: string, callback: () => void) => listeners.delete(callback),
  };
  globals.window = { speechSynthesis };
  globals.SpeechSynthesisUtterance = MockUtterance;
  globals.document = {
    createElement: () => ({
      innerHTML: '',
      get textContent() { return this.innerHTML; },
    }),
  };

  const narrator = createNarrator({
    callbacks: {
      onSpeakingChange: (speaking) => speakingChanges.push(speaking),
      onSpeechPulse: () => { pulses += 1; },
      onPreSpeakWave,
    },
  });
  t.after(() => {
    narrator.dispose();
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globals.window;
    if (originalUtterance) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', originalUtterance);
    else delete globals.SpeechSynthesisUtterance;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globals.document;
  });

  return {
    narrator, utterances, dispatchedVolumes, speakingChanges,
    get pulses() { return pulses; },
    setVoices: (next: SpeechSynthesisVoice[], announce = false) => {
      voices = next;
      if (announce) for (const listener of [...listeners]) listener();
    },
  };
}

test('replacing speech while voices load never queues the old request', async (t) => {
  const h = makeHarness(t);
  h.setVoices([]);
  const oldSpeech = h.narrator.speak('Old request.', { chunking: 'none' });
  h.setVoices([voice]);
  const newSpeech = h.narrator.speak('New request.', { chunking: 'none' });
  await flushMicrotasks();
  h.setVoices([voice], true);
  await oldSpeech;
  await waitForDispatch();
  assert.deepEqual(h.utterances.map((utterance) => utterance.text), ['New request.']);
  h.utterances[0].onend?.();
  await newSpeech;
});

test('replacing speech during a wave leaves only the new request active', async (t) => {
  const oldWave = deferred();
  const newWave = deferred();
  let waveCount = 0;
  const h = makeHarness(t, () => (++waveCount === 1 ? oldWave.promise : newWave.promise));
  const oldSpeech = h.narrator.speak('Old request.');
  await flushMicrotasks();
  const newSpeech = h.narrator.speak('New request.');
  await flushMicrotasks();
  oldWave.resolve();
  await oldSpeech;
  assert.equal(h.narrator.isSpeaking(), false);
  newWave.resolve();
  await waitForDispatch();
  assert.deepEqual(h.utterances.map((utterance) => utterance.text), ['New request.']);
  assert.equal(h.narrator.isSpeaking(), true);
  h.utterances[0].onend?.();
  await newSpeech;
});

test('replacing a queued utterance clears its delayed dispatch and settles it', async (t) => {
  const h = makeHarness(t);
  const oldSpeech = h.narrator.speak('Old request.');
  await flushMicrotasks();
  const newSpeech = h.narrator.speak('New request.');
  await oldSpeech;
  await waitForDispatch();
  assert.deepEqual(h.utterances.map((utterance) => utterance.text), ['New request.']);
  assert.equal(h.narrator.isSpeaking(), true);
  h.utterances[0].onend?.();
  await newSpeech;
});

test('cancel settles dispatched speech without browser events and stops remaining chunks', async (t) => {
  const h = makeHarness(t);
  const speech = h.narrator.speak('First sentence. Second sentence.');
  await waitForDispatch();
  assert.deepEqual(h.utterances.map((utterance) => utterance.text), ['First sentence.']);
  h.narrator.cancel();
  await speech;
  await waitForDispatch();
  assert.equal(h.utterances.length, 1);
  assert.equal(h.narrator.isSpeaking(), false);
  assert.equal(h.utterances[0].onend, null);
  assert.equal(h.utterances[0].onboundary, null);
});

test('stale utterance callbacks cannot pulse or finish the replacement', async (t) => {
  const h = makeHarness(t);
  const oldSpeech = h.narrator.speak('Old request.');
  await waitForDispatch();
  const oldEnd = h.utterances[0].onend;
  const oldError = h.utterances[0].onerror;
  const oldBoundary = h.utterances[0].onboundary;
  const newSpeech = h.narrator.speak('New request.');
  await oldSpeech;
  await waitForDispatch();
  oldBoundary?.({ name: 'word' });
  oldError?.({ error: 'canceled' });
  oldEnd?.();
  assert.equal(h.pulses, 0);
  assert.equal(h.narrator.isSpeaking(), true);
  assert.deepEqual(h.speakingChanges, [true, false, true]);
  h.utterances[1].onboundary?.({ name: 'word' });
  assert.equal(h.pulses, 1);
  h.utterances[1].onend?.();
  await newSpeech;
  assert.equal(h.narrator.isSpeaking(), false);
});

test('disposing during a pending wave never queues speech', async (t) => {
  const wave = deferred();
  const h = makeHarness(t, () => wave.promise);
  const speech = h.narrator.speak('Canceled request.');
  await flushMicrotasks();
  h.narrator.dispose();
  wave.resolve();
  await speech;
  await waitForDispatch();
  assert.equal(h.utterances.length, 0);
  assert.equal(h.narrator.isSpeaking(), false);
});

test('active speech errors still reject and clear its speaking state', async (t) => {
  const h = makeHarness(t);
  const speech = h.narrator.speak('Failing request.');
  const rejected = assert.rejects(speech, /Speech error: synthesis-failed/);
  await waitForDispatch();
  h.utterances[0].onerror?.({ error: 'synthesis-failed' });
  await rejected;
  assert.equal(h.narrator.isSpeaking(), false);
});

test('volume changes requeue remaining speech without completing the lesson narration', async (t) => {
  const h = makeHarness(t);
  let finished = false;
  const speech = h.narrator.speak('First second third.', { rate: 0.8, pitch: 1, volume: 0.72 })
    .then(() => { finished = true; });
  await waitForDispatch();
  const first = h.utterances[0];
  first.onboundary?.({ name: 'word', charIndex: 6 });
  const staleEnd = first.onend;
  const staleError = first.onerror;
  const staleBoundary = first.onboundary;
  h.narrator.setVolume(0.3);
  staleEnd?.(); staleError?.({ error: 'canceled' });
  staleBoundary?.({ name: 'word', charIndex: 13 });
  await waitForDispatch();
  assert.deepEqual(h.dispatchedVolumes, [0.72, 0.3]);
  assert.equal(first.volume, 0.72, 'a dispatched object must not be mutated');
  const remaining = h.utterances[1];
  assert.equal(remaining.text, 'second third.');
  assert.equal(remaining.voice, voice);
  assert.equal(remaining.rate, 0.8);
  assert.equal(remaining.pitch, 1);
  assert.equal(finished, false);
  assert.equal(h.pulses, 1, 'callbacks from replaced utterances must be ignored');
  assert.deepEqual(h.speakingChanges, [true], 'volume changes keep the avatar speaking');
  remaining.onboundary?.({ name: 'word', charIndex: 7 });
  h.narrator.setVolume(0.5);
  await waitForDispatch();
  assert.equal(h.utterances[2].text, 'third.', 'boundary indices are relative to the requeued text');
  h.utterances[2].onend?.();
  await speech;
  assert.deepEqual(h.speakingChanges, [true, false]);
});

test('rapid slider changes coalesce and mute speech at dispatch', async (t) => {
  const h = makeHarness(t);
  const speech = h.narrator.speak('First second.');
  await waitForDispatch();
  h.utterances[0].onboundary?.({ name: 'word', charIndex: 6 });
  h.narrator.setVolume(0.5);
  h.narrator.setVolume(0.2);
  h.narrator.setVolume(0);
  await waitForDispatch();
  assert.deepEqual(h.dispatchedVolumes, [1, 0]);
  assert.equal(h.utterances[1].text, 'second.');
  h.utterances[1].onend?.();
  await speech;
});

test('changing volume while paused waits for resume before requeueing speech', async (t) => {
  const h = makeHarness(t);
  const speech = h.narrator.speak('First second.');
  await waitForDispatch();
  h.utterances[0].onboundary?.({ name: 'word', charIndex: 6 });
  h.narrator.pause();
  h.narrator.setVolume(0.4);
  await waitForDispatch();
  assert.equal(h.utterances.length, 1);
  assert.equal(h.narrator.isSpeaking(), true);
  h.narrator.resume();
  await waitForDispatch();
  assert.deepEqual(h.dispatchedVolumes, [1, 0.4]);
  assert.equal(h.utterances[1].text, 'second.');
  h.utterances[1].onend?.();
  await speech;
});

test('canceling after a volume change prevents the pending replacement from reviving speech', async (t) => {
  const h = makeHarness(t);
  const speech = h.narrator.speak('First sentence. Second sentence.');
  await waitForDispatch();
  h.narrator.setVolume(0.4);
  h.narrator.cancel();
  await speech;
  await waitForDispatch();
  assert.equal(h.utterances.length, 1);
  assert.equal(h.narrator.isSpeaking(), false);
});

test('volume set before speech persists across sentences and future narration', async (t) => {
  const h = makeHarness(t);
  h.narrator.setVolume(0.25);
  const speech = h.narrator.speak('First sentence. Second sentence.');
  await waitForDispatch();
  h.utterances[0].onend?.();
  await waitForDispatch();
  h.utterances[1].onend?.();
  await speech;
  const next = h.narrator.speak('Next narration.');
  await waitForDispatch();
  assert.deepEqual(h.dispatchedVolumes, [0.25, 0.25, 0.25]);
  h.utterances[2].onend?.();
  await next;
});

test('volume updates during the pre-speech wave apply to the first dispatched utterance', async (t) => {
  const wave = deferred();
  const h = makeHarness(t, () => wave.promise);
  const speech = h.narrator.speak('First sentence.', { volume: 0.72 });
  await flushMicrotasks();
  h.narrator.setVolume(0.2);
  wave.resolve();
  await waitForDispatch();
  assert.deepEqual(h.dispatchedVolumes, [0.2]);
  h.utterances[0].onend?.();
  await speech;
});

test('voices without progress boundaries requeue the current sentence at the new volume', async (t) => {
  const h = makeHarness(t);
  const speech = h.narrator.speak('First sentence. Second sentence.');
  await waitForDispatch();
  h.narrator.setVolume(0.3);
  await waitForDispatch();
  assert.equal(h.utterances[1].text, 'First sentence.');
  assert.equal(h.dispatchedVolumes[1], 0.3);
  h.utterances[1].onend?.();
  await waitForDispatch();
  assert.equal(h.utterances[2].text, 'Second sentence.');
  h.utterances[2].onend?.();
  await speech;
});
