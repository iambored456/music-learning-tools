import type { SpeakOptions } from "./types.ts";
import { stripHtml, splitIntoSentenceChunks } from "./chunking.ts";
import { getVoicesAsync, pickPreferredVoice, findVoiceByURI } from "./voices.ts";

/**
 * Default speak options
 */
const DEFAULT_SPEAK_OPTIONS: Required<
  Pick<SpeakOptions, "lang" | "rate" | "pitch" | "volume" | "chunking" | "preSpeakWaveMs">
> = {
  lang: "en-CA",
  rate: 0.92,
  pitch: 1.18,
  volume: 1.0,
  chunking: "sentence",
  preSpeakWaveMs: 450,
};

export type NarratorCallbacks = {
  onSpeakingChange: (speaking: boolean) => void;
  onSpeechPulse: () => void;
  onPreSpeakWave: (durationMs: number) => Promise<void>;
};

export type Narrator = {
  /** Speak text, returns promise that resolves when done */
  speak(textOrHtml: string, opts?: SpeakOptions): Promise<void>;
  /** Update speech volume, requeueing active speech from its latest boundary. */
  setVolume(volume: number): void;
  /** Cancel current speech */
  cancel(): void;
  /** Pause speech */
  pause(): void;
  /** Resume speech */
  resume(): void;
  /** Get available voices */
  listVoices(): Promise<SpeechSynthesisVoice[]>;
  /** Set preferred voice URI */
  setVoiceURI(uri: string | undefined): void;
  /** Check if currently speaking */
  isSpeaking(): boolean;
  /** Clean up */
  dispose(): void;
};

export type NarratorOptions = {
  callbacks: NarratorCallbacks;
  debug?: boolean;
};

/**
 * Create the narrator (TTS wrapper with progress signals)
 */
export function createNarrator(opts: NarratorOptions): Narrator {
  const { callbacks, debug } = opts;

  let currentVoiceURI: string | undefined;
  let currentVolume = DEFAULT_SPEAK_OPTIONS.volume;
  let speaking = false;
  let requestId = 0;
  let currentUtterance: SpeechSynthesisUtterance | null = null;
  let cancelCurrentChunk: (() => void) | null = null;
  let refreshCurrentChunk: (() => void) | null = null;
  let dispatchCurrentChunk: (() => void) | null = null;
  let paused = false;

  const isCurrentRequest = (id: number) => id === requestId;

  const log = debug
    ? (...args: unknown[]) => console.log("[Narrator]", ...args)
    : () => {};

  const setSpeaking = (value: boolean) => {
    if (speaking !== value) {
      speaking = value;
      callbacks.onSpeakingChange(value);
    }
  };

  /**
   * Speak a single chunk of text
   */
  const speakChunk = (
    text: string,
    voice: SpeechSynthesisVoice | undefined,
    id: number,
    opts: Required<
      Pick<SpeakOptions, "lang" | "rate" | "pitch" | "volume">
    >
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isCurrentRequest(id)) {
        resolve();
        return;
      }

      let utterance: SpeechSynthesisUtterance;
      let settled = false;
      let dispatched = false;
      let offset = 0;
      let resumeOffset = 0;
      let dispatchTimer: ReturnType<typeof setTimeout> | undefined;

      const detach = (item: SpeechSynthesisUtterance) => {
        item.onstart = null;
        item.onend = null;
        item.onerror = null;
        item.onboundary = null;
      };
      const settle = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (dispatchTimer !== undefined) clearTimeout(dispatchTimer);
        detach(utterance);
        if (currentUtterance === utterance) currentUtterance = null;
        if (cancelCurrentChunk === cancelChunk) cancelCurrentChunk = null;
        if (refreshCurrentChunk === refreshChunk) refreshCurrentChunk = null;
        if (dispatchCurrentChunk === scheduleDispatch) dispatchCurrentChunk = null;
        if (error) reject(error);
        else resolve();
      };
      const cancelChunk = () => settle();
      cancelCurrentChunk = cancelChunk;

      const scheduleDispatch = () => {
        if (settled || dispatched || paused || dispatchTimer !== undefined) return;
        // Small delay before speaking (browser workaround). Slider updates
        // during this delay change the pending object without restarting it.
        dispatchTimer = setTimeout(() => {
          dispatchTimer = undefined;
          if (!isCurrentRequest(id) || settled) { settle(); return; }
          if (paused) return;
          try {
            dispatched = true;
            window.speechSynthesis.speak(utterance);
          } catch (error) {
            settle(error instanceof Error ? error : new Error(String(error)));
          }
        }, 50);
      };

      const createSegment = () => {
        const segmentOffset = offset;
        const segment = new SpeechSynthesisUtterance(text.slice(segmentOffset));
        utterance = segment;
        currentUtterance = segment;
        dispatched = false;
        if (voice) segment.voice = voice;
        segment.lang = opts.lang;
        segment.rate = opts.rate;
        segment.pitch = opts.pitch;
        segment.volume = currentVolume;
        const active = () => isCurrentRequest(id) && !settled && utterance === segment;

        segment.onstart = () => {
          if (active()) log("Chunk started:", segment.text.substring(0, 30) + "...");
        };
        segment.onend = () => {
          if (!active()) return;
          log("Chunk ended");
          settle();
        };
        segment.onerror = (event) => {
          if (!active()) return;
          log("Chunk error:", event.error);
          if (event.error === "interrupted" || event.error === "canceled") settle();
          else settle(new Error(`Speech error: ${event.error}`));
        };
        segment.onboundary = (event) => {
          if (!active()) return;
          if (event.name === "word" || event.name === "sentence") {
            if (Number.isInteger(event.charIndex) && event.charIndex >= 0 && event.charIndex < segment.text.length) {
              resumeOffset = Math.max(resumeOffset, segmentOffset + event.charIndex);
            }
            callbacks.onSpeechPulse();
          }
        };
        scheduleDispatch();
      };

      const refreshChunk = () => {
        if (!isCurrentRequest(id) || settled) return;
        if (!dispatched) { utterance.volume = currentVolume; return; }
        // Native speech engines may snapshot volume at speak(). Requeue the
        // remaining text without resolving the lesson's narration promise.
        // A voice without boundary events restarts this sentence-sized chunk.
        detach(utterance);
        window.speechSynthesis.cancel();
        offset = resumeOffset;
        createSegment();
      };
      refreshCurrentChunk = refreshChunk;
      dispatchCurrentChunk = scheduleDispatch;
      createSegment();
    });
  };

  const speak = async (textOrHtml: string, opts?: SpeakOptions): Promise<void> => {
    // Cancel any existing speech
    cancel();
    const id = requestId;

    // Merge options with defaults
    const mergedOpts = {
      ...DEFAULT_SPEAK_OPTIONS,
      ...opts,
      lang: opts?.lang || DEFAULT_SPEAK_OPTIONS.lang,
      rate: opts?.rate ?? DEFAULT_SPEAK_OPTIONS.rate,
      pitch: opts?.pitch ?? DEFAULT_SPEAK_OPTIONS.pitch,
      volume: opts?.volume ?? currentVolume,
      chunking: opts?.chunking ?? DEFAULT_SPEAK_OPTIONS.chunking,
      preSpeakWaveMs: opts?.preSpeakWaveMs ?? DEFAULT_SPEAK_OPTIONS.preSpeakWaveMs,
    };
    currentVolume = mergedOpts.volume;

    // Strip HTML and get clean text
    const cleanText = stripHtml(textOrHtml);
    if (!cleanText.trim()) {
      return;
    }

    // Get voice
    const voices = await getVoicesAsync();
    if (!isCurrentRequest(id)) return;
    let voice: SpeechSynthesisVoice | undefined;

    if (mergedOpts.voiceURI || currentVoiceURI) {
      voice = findVoiceByURI(voices, mergedOpts.voiceURI || currentVoiceURI!);
    }
    if (!voice) {
      voice = pickPreferredVoice(voices, mergedOpts.lang);
    }

    log("Using voice:", voice?.name || "default");

    // Pre-speak wave animation
    await callbacks.onPreSpeakWave(mergedOpts.preSpeakWaveMs);

    if (!isCurrentRequest(id)) return;

    // Split into chunks if configured
    const chunks =
      mergedOpts.chunking === "sentence"
        ? splitIntoSentenceChunks(cleanText)
        : [cleanText];

    log(`Speaking ${chunks.length} chunk(s)`);

    // Start speaking
    setSpeaking(true);

    try {
      for (const chunk of chunks) {
        if (!isCurrentRequest(id)) break;
        await speakChunk(chunk, voice, id, {
          lang: mergedOpts.lang,
          rate: mergedOpts.rate,
          pitch: mergedOpts.pitch,
          volume: currentVolume,
        });
      }
    } finally {
      if (isCurrentRequest(id)) setSpeaking(false);
    }
  };

  const cancel = () => {
    requestId += 1;
    cancelCurrentChunk?.();
    window.speechSynthesis.cancel();
    currentUtterance = null;
    setSpeaking(false);
  };

  const pause = () => {
    paused = true;
    window.speechSynthesis.pause();
  };

  const resume = () => {
    paused = false;
    window.speechSynthesis.resume();
    dispatchCurrentChunk?.();
  };

  const listVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return getVoicesAsync();
  };

  const setVoiceURI = (uri: string | undefined) => {
    currentVoiceURI = uri;
  };

  const setVolume = (volume: number) => {
    const normalizedVolume = Number.isFinite(volume)
      ? Math.max(0, Math.min(1, volume))
      : DEFAULT_SPEAK_OPTIONS.volume;
    if (currentVolume === normalizedVolume) return;
    currentVolume = normalizedVolume;
    refreshCurrentChunk?.();
  };

  const isSpeaking = (): boolean => speaking;

  const dispose = () => {
    cancel();
  };

  return {
    speak,
    cancel,
    pause,
    resume,
    listVoices,
    setVoiceURI,
    setVolume,
    isSpeaking,
    dispose,
  };
}
