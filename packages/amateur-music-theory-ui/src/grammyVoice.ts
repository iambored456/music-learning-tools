import { findVoiceByURI, pickPreferredVoice } from '@mlt/talking-avatar';

// Web Speech has no gender field. Match known English Windows voice names or
// an explicit "male" label (e.g. Google UK English Male); never match "female".
const masculineVoiceName = /\b(?:richard|david|mark|george|male)\b/i;
export function isGrammyVoice(voice: SpeechSynthesisVoice): boolean {
  return /^en(?:-|$)/i.test(voice.lang) && masculineVoiceName.test(voice.name);
}

/** Keep one voice across narration calls and avatar remounts in this session. */
export function createGrammyVoiceSelection() {
  let selectedURI: string | undefined;
  let fallbackURI: string | undefined;
  return {
    isReady(voices: SpeechSynthesisVoice[]): boolean {
      return Boolean(selectedURI && findVoiceByURI(voices, selectedURI)) || voices.some(isGrammyVoice)
        || Boolean(fallbackURI && findVoiceByURI(voices, fallbackURI));
    },
    select(voices: SpeechSynthesisVoice[], lang = 'en-CA'): SpeechSynthesisVoice | undefined {
      const selected = selectedURI ? findVoiceByURI(voices, selectedURI) : undefined;
      if (selected) return selected;
      const masculine = voices.filter(isGrammyVoice);
      const fallback = fallbackURI ? findVoiceByURI(voices, fallbackURI) : undefined;
      const voice = masculine.length
        ? pickPreferredVoice(masculine, lang)
        : fallback ?? pickPreferredVoice(voices.filter(v => /^en(?:-|$)/i.test(v.lang)), lang);
      // Only pin a matching voice. A temporary fallback can improve when the
      // expected voices finish loading, rather than pinning a female default.
      if (voice && isGrammyVoice(voice)) selectedURI = voice.voiceURI;
      else if (voice) fallbackURI = voice.voiceURI;
      return voice;
    },
  };
}
