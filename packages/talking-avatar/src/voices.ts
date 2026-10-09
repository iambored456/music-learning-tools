/**
 * Get available speech synthesis voices asynchronously.
 * Waits for voiceschanged event if voices aren't immediately available.
 */
export function getVoicesAsync(options: {
  isReady?: (voices: SpeechSynthesisVoice[]) => boolean;
  timeoutMs?: number;
} = {}): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const isReady = options.isReady ?? ((voices) => voices.length > 0);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(deadline);
      synth.removeEventListener("voiceschanged", check);
      resolve(voices);
    };
    const check = () => {
      const voices = synth.getVoices();
      // Some browsers emit an empty/partial list before their other voices load.
      if (voices.length && isReady(voices)) finish(voices);
    };
    check();
    if (settled) return;
    synth.addEventListener("voiceschanged", check);
    const poll = () => {
      check();
      if (!settled) timer = setTimeout(poll, 50);
    };
    timer = setTimeout(poll, 50);
    deadline = setTimeout(() => finish(synth.getVoices()), options.timeoutMs ?? 1000);
    check();
  });
}

/**
 * Quality indicators in voice names that suggest better quality
 */
const QUALITY_KEYWORDS = ["natural", "enhanced", "premium", "neural"];

/**
 * Pick a preferred voice from the available voices.
 * Prefers matching language, with bonus for quality keywords in the name.
 */
export function pickPreferredVoice(
  voices: SpeechSynthesisVoice[],
  lang?: string
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) {
    return undefined;
  }

  // Normalize language for comparison (e.g., "en-CA" -> "en")
  const normalizedLang = typeof lang === "string" && lang.trim().length > 0
    ? lang.trim()
    : "en-CA";
  const langBase = normalizedLang.split("-")[0].toLowerCase();
  const langFull = normalizedLang.toLowerCase();

  // Score each voice
  const scored = voices.map((voice) => {
    let score = 0;
    const voiceLang = (voice.lang || "").toLowerCase();
    const voiceLangBase = voiceLang.split("-")[0];

    // Exact language match (e.g., en-CA matches en-CA)
    if (voiceLang === langFull) {
      score += 100;
    }
    // Base language match (e.g., en-US matches en-CA)
    else if (voiceLangBase === langBase) {
      score += 50;
    }

    // Bonus for quality keywords
    const nameLower = (voice.name || "").toLowerCase();
    for (const keyword of QUALITY_KEYWORDS) {
      if (nameLower.includes(keyword)) {
        score += 10;
        break; // Only count once
      }
    }

    // Slight preference for local voices
    if (voice.localService) {
      score += 5;
    }

    return { voice, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return best match, or first voice if no good matches
  return scored[0]?.voice;
}

/**
 * Find a voice by its URI
 */
export function findVoiceByURI(
  voices: SpeechSynthesisVoice[],
  uri: string
): SpeechSynthesisVoice | undefined {
  return voices.find((v) => v.voiceURI === uri);
}
