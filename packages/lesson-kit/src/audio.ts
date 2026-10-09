export interface LessonNoteEnvelope {
  noteIds?: readonly string[];
  frequency: number;
  start: number;
  attackEnd: number;
  releaseStart?: number;
  end?: number;
  peak: number;
}

export function getLessonEnvelopeLevel(envelope: LessonNoteEnvelope, time: number): number {
  if (time < envelope.start || (envelope.end !== undefined && time >= envelope.end)) return 0;
  if (time < envelope.attackEnd) return Math.min(1, (time - envelope.start) / Math.max(0.001, envelope.attackEnd - envelope.start));
  if (envelope.releaseStart !== undefined && envelope.end !== undefined && time > envelope.releaseStart) {
    const progress = (time - envelope.releaseStart) / Math.max(0.001, envelope.end - envelope.releaseStart);
    return Math.pow(0.0001 / envelope.peak, progress);
  }
  return 1;
}

/** One live volume control per scene, after the individual note envelopes. */
export function createLessonAudioOutput() {
  let output: GainNode | null = null;
  const envelopes = new Map<GainNode, { context: AudioContext; envelope: LessonNoteEnvelope }>();
  const listeners = new Set<() => void>();
  let frame: number | null = null;
  function notify(): void { listeners.forEach(listener => listener()); }
  function tick(): void {
    frame = null;
    envelopes.forEach(({ context, envelope }, voice) => {
      if (envelope.end !== undefined && context.currentTime >= envelope.end) envelopes.delete(voice);
    });
    notify();
    if (envelopes.size && listeners.size) frame = requestAnimationFrame(tick);
  }
  function setVolume(percent: number): void {
    if (output) output.gain.value = Number.isFinite(percent) ? Math.max(0, Math.min(1, percent / 100)) : 0;
  }
  return {
    setVolume,
    getFillLevel(frequency?: number | null, noteId?: string): number {
      if (frequency === undefined && noteId === undefined) return 0;
      let level = 0;
      envelopes.forEach(({ context, envelope }) => {
        const matches = noteId !== undefined
          ? envelope.noteIds?.includes(noteId)
          : frequency === null || (frequency !== undefined && Math.abs(envelope.frequency - frequency) < 0.1);
        if (matches) level = Math.max(level, getLessonEnvelopeLevel(envelope, context.currentTime));
      });
      return level;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      if (envelopes.size && frame === null) frame = requestAnimationFrame(tick);
      return () => {
        listeners.delete(listener);
        if (!listeners.size && frame !== null) { cancelAnimationFrame(frame); frame = null; }
      };
    },
    forget(voice: GainNode): void { envelopes.delete(voice); notify(); },
    retune(voice: GainNode, frequency: number): void {
      const tracked = envelopes.get(voice);
      if (tracked) tracked.envelope.frequency = frequency;
    },
    release(voice: GainNode, seconds: number): void {
      const tracked = envelopes.get(voice);
      if (tracked) {
        tracked.envelope.releaseStart = tracked.context.currentTime;
        tracked.envelope.end = tracked.context.currentTime + seconds;
      }
    },
    connect(voice: GainNode, context: AudioContext, volume: number, envelope?: LessonNoteEnvelope): void {
      if (!output || output.context !== context) {
        output = context.createGain();
        output.connect(context.destination);
      }
      setVolume(volume);
      voice.connect(output);
      if (envelope) {
        envelopes.set(voice, { context, envelope });
        if (listeners.size && frame === null) frame = requestAnimationFrame(tick);
      }
    },
  };
}

export type LessonAudioOutput = ReturnType<typeof createLessonAudioOutput>;
