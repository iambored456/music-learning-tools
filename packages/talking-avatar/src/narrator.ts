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
  /** Set default speech volume for current and future utterances */
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
  let cancelled = false;
  let currentUtterance: SpeechSynthesisUtterance | null = null;

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
    opts: Required<
      Pick<SpeakOptions, "lang" | "rate" | "pitch" | "volume">
    >
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (cancelled) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      currentUtterance = utterance;

      if (voice) {
        utterance.voice = voice;
      }
      utterance.lang = opts.lang;
      utterance.rate = opts.rate;
      utterance.pitch = opts.pitch;
      utterance.volume = opts.volume;

      utterance.onstart = () => {
        log("Chunk started:", text.substring(0, 30) + "...");
      };

      utterance.onend = () => {
        log("Chunk ended");
        currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        log("Chunk error:", event.error);
        currentUtterance = null;
        // Don't reject on 'interrupted' or 'cancelled' errors
        if (event.error === "interrupted" || event.error === "canceled") {
          resolve();
        } else {
          reject(new Error(`Speech error: ${event.error}`));
        }
      };

      // Boundary events for speech progress
      utterance.onboundary = (event) => {
        if (event.name === "word" || event.name === "sentence") {
          callbacks.onSpeechPulse();
        }
      };

      // Small delay before speaking (browser workaround)
      setTimeout(() => {
        if (!cancelled) {
          window.speechSynthesis.speak(utterance);
        } else {
          resolve();
        }
      }, 50);
    });
  };

  const speak = async (textOrHtml: string, opts?: SpeakOptions): Promise<void> => {
    // Cancel any existing speech
    cancel();
    cancelled = false;

    // Merge options with defaults
    const mergedOpts = {
      ...DEFAULT_SPEAK_OPTIONS,
      ...opts,
      lang: opts?.lang || DEFAULT_SPEAK_OPTIONS.lang,
      rate: opts?.rate ?? DEFAULT_SPEAK_OPTIONS.rate,
      pitch: opts?.pitch ?? DEFAULT_SPEAK_OPTIONS.pitch,
      volume: opts?.volume ?? DEFAULT_SPEAK_OPTIONS.volume,
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

    if (cancelled) return;

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
        if (cancelled) break;
        await speakChunk(chunk, voice, {
          lang: mergedOpts.lang,
          rate: mergedOpts.rate,
          pitch: mergedOpts.pitch,
          volume: currentVolume,
        });
      }
    } finally {
      setSpeaking(false);
    }
  };

  const cancel = () => {
    cancelled = true;
    window.speechSynthesis.cancel();
    currentUtterance = null;
    setSpeaking(false);
  };

  const pause = () => {
    window.speechSynthesis.pause();
  };

  const resume = () => {
    window.speechSynthesis.resume();
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
    currentVolume = normalizedVolume;
    if (currentUtterance) {
      currentUtterance.volume = normalizedVolume;
    }
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
