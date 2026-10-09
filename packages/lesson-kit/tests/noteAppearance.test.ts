import assert from 'node:assert/strict';
import test from 'node:test';
import { createLessonAudioOutput, getLessonEnvelopeLevel } from '../src/audio';
import { calculateLessonNoteAppearance, lessonNoteAppearance } from '../src/noteAppearance';

test('notes and extended capsules keep the same stroke at the same grid scale', () => {
  const circle = calculateLessonNoteAppearance(60, 60, 'circle', 30);
  const oval = calculateLessonNoteAppearance(30, 60, 'oval', 30);
  const capsule = calculateLessonNoteAppearance(240, 60, 'capsule', 30);
  assert.equal(circle.stroke, oval.stroke);
  assert.equal(circle.stroke, capsule.stroke);
  assert.equal(calculateLessonNoteAppearance(120, 120, 'circle', 60).stroke, circle.stroke * 2);
  assert.equal(calculateLessonNoteAppearance(120, 120, 'circle', 30).stroke, circle.stroke);
  for (const invalidScale of [0, -1, NaN, Infinity]) {
    assert.throws(() => calculateLessonNoteAppearance(60, 60, 'circle', invalidScale), RangeError);
  }
});

test('playback fills follow attack, sustain, exponential release, and completion', () => {
  const envelope = { frequency: 440, start: 1, attackEnd: 1.025, releaseStart: 1.4, end: 1.5, peak: 0.2 };
  assert.equal(getLessonEnvelopeLevel(envelope, 0.9), 0);
  assert.ok(Math.abs(getLessonEnvelopeLevel(envelope, 1.0125) - 0.5) < 0.00001);
  assert.equal(getLessonEnvelopeLevel(envelope, 1.2), 1);
  assert.ok(Math.abs(getLessonEnvelopeLevel(envelope, 1.45) - Math.sqrt(0.0001 / 0.2)) < 0.00001);
  assert.equal(getLessonEnvelopeLevel(envelope, 1.5), 0);
});

test('simultaneous pitches, drag retuning, cancellation, and subscriptions stay isolated', () => {
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  let pending: FrameRequestCallback | null = null;
  globalThis.requestAnimationFrame = callback => { pending = callback; return 1; };
  globalThis.cancelAnimationFrame = () => { pending = null; };
  try {
    const context = { currentTime: 1.2, destination: {}, createGain: () => ({ gain: { value: 1 }, connect() {} }) };
    const voiceA = { connect() {} } as unknown as GainNode;
    const voiceB = { connect() {} } as unknown as GainNode;
    const audio = createLessonAudioOutput();
    let notifications = 0;
    const unsubscribe = audio.subscribe(() => notifications++);
    for (const [voice, frequency] of [[voiceA, 440], [voiceB, 660]] as const) {
      audio.connect(voice, context as unknown as AudioContext, 50, { frequency, start: 1, attackEnd: 1.025, peak: 0.05 });
    }
    assert.equal(audio.getFillLevel(440), 1);
    assert.equal(audio.getFillLevel(880), 0);
    audio.retune(voiceA, 880);
    assert.equal(audio.getFillLevel(440), 0);
    assert.equal(audio.getFillLevel(880), 1);
    audio.release(voiceA, 0.045);
    context.currentTime = 1.25;
    assert.equal(audio.getFillLevel(880), 0);
    assert.equal(audio.getFillLevel(660), 1);
    audio.forget(voiceB);
    assert.equal(audio.getFillLevel(null), 0);
    assert.ok(notifications > 0);
    unsubscribe();
    assert.equal(pending, null);
  } finally {
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancel;
  }
});

test('repeated score pitches fill only their own event, including overlapping releases', () => {
  const context = { currentTime: 1.2, destination: {}, createGain: () => ({ gain: { value: 1 }, connect() {} }) };
  const audio = createLessonAudioOutput();
  const first = { connect() {} } as unknown as GainNode;
  const later = { connect() {} } as unknown as GainNode;
  audio.connect(first, context as unknown as AudioContext, 50, {
    frequency: 440, noteIds: ['first'], start: 1, attackEnd: 1.025, releaseStart: 1.3, end: 1.5, peak: 0.05,
  });
  audio.connect(later, context as unknown as AudioContext, 50, {
    frequency: 440, noteIds: ['later'], start: 1.4, attackEnd: 1.425, end: 1.9, peak: 0.05,
  });
  assert.equal(audio.getFillLevel(440, 'first'), 1);
  assert.equal(audio.getFillLevel(440, 'later'), 0);
  assert.equal(audio.getFillLevel(440, 'unplayed'), 0);
  context.currentTime = 1.45;
  assert.ok(audio.getFillLevel(440, 'first') < 1);
  assert.equal(audio.getFillLevel(440, 'later'), 1);
  audio.forget(first);
  assert.equal(audio.getFillLevel(440, 'first'), 0);
  assert.equal(audio.getFillLevel(440, 'later'), 1);
  audio.forget(later);
  assert.equal(audio.getFillLevel(440, 'later'), 0);
});


test('changing A to A4 refits the label without a note resize and cleans up observation', async () => {
  const keys = ['SVGSVGElement', 'ResizeObserver', 'MutationObserver', 'getComputedStyle', 'document'] as const;
  const originals = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  let textChanged!: () => void;
  let disconnected = false;
  let glyphSize = '40px';
  const label = { textContent: 'A' };
  const properties = new Map<string, string>();
  const attributes = new Map<string, string>();
  const node = {
    classList: { contains: () => true },
    style: { setProperty: (key: string, value: string) => properties.set(key, value) },
    setAttribute: (key: string, value: string) => attributes.set(key, value), querySelector: () => label, isConnected: false,
  };
  const ctx = { font: '', measureText(text: string) {
    return { width: text.length * Number(this.font.match(/([\d.]+)px/)![1]) * 0.7 };
  } };
  const mocks = {
    SVGSVGElement: class {},
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: class {
      constructor(callback: () => void) { textChanged = callback; }
      observe() {} disconnect() { disconnected = true; }
    },
    getComputedStyle: () => ({ width: glyphSize, height: glyphSize, fontWeight: '700', fontFamily: 'sans-serif' }),
    document: { fonts: { ready: Promise.resolve() }, createElement: () => ({ getContext: () => ctx }) },
  };
  try {
    keys.forEach(key => Object.defineProperty(globalThis, key, { configurable: true, value: mocks[key] }));
    const action = lessonNoteAppearance(node as unknown as HTMLElement, { audioOutput: createLessonAudioOutput(), cellWidth: 20 });
    const initial = parseFloat(properties.get('--mlt-lesson-note-label-size')!);
    label.textContent = 'A4';
    textChanged();
    const fitted = parseFloat(properties.get('--mlt-lesson-note-label-size')!);
    assert.ok(fitted < initial);
    assert.ok(fitted * 2 * 0.7 <= 37 * 0.82 + 0.00001);
    assert.ok(fitted <= 37 * 0.78);
    // A hidden or not-yet-sized pseudo-element must still get the standard
    // outline, including grid-scale updates without a hit-target resize.
    glyphSize = 'auto';
    action.update({ audioOutput: createLessonAudioOutput(), cellWidth: 30 });
    assert.equal(properties.get('--mlt-lesson-note-stroke-width'), '4.5px');
    action.update({ audioOutput: createLessonAudioOutput(), cellWidth: 40 });
    assert.equal(properties.get('--mlt-lesson-note-stroke-width'), '6px');
    action.update({ audioOutput: createLessonAudioOutput(), cellWidth: 40, highlighted: true });
    assert.equal(properties.get('--mlt-lesson-fill-level'), '1', 'teaching highlights hold the standard note fill');
    assert.equal(properties.get('--mlt-lesson-note-stroke-width'), '6px', 'holding a fill preserves the standard outline');
    assert.equal(attributes.get('data-mlt-highlighted'), 'true');
    assert.equal(attributes.get('data-mlt-sounding'), 'false', 'visual highlights do not pretend audio is sustained');
    action.update({ audioOutput: createLessonAudioOutput(), cellWidth: 40 });
    assert.equal(properties.get('--mlt-lesson-fill-level'), '0', 'ending the highlight returns to the audio envelope');
    assert.equal(attributes.get('data-mlt-highlighted'), 'false');
    action.destroy();
    assert.equal(disconnected, true);
    await Promise.resolve();
  } finally {
    keys.forEach((key, index) => {
      if (originals[index]) Object.defineProperty(globalThis, key, originals[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
