import {
  createTalkingAvatarController,
  armsDownAvatarAssets,
  getVoicesAsync,
  findVoiceByURI,
  type SpeakOptions,
  type TalkingAvatarController,
} from '@mlt/talking-avatar';
import { createGrammyVoiceSelection, isGrammyVoice } from './grammyVoice';

export type LessonAvatarCharacter = 'grammy';
type LessonSpeakOptions = SpeakOptions & { wave?: boolean };

let avatar: TalkingAvatarController | null = null;
let mountedCharacter: LessonAvatarCharacter | null = null;
let mountedContainer: HTMLElement | null = null;
let lessonAvatarVolume = 0.72;
type AvatarObserver = (kind: 'speech' | 'avatar' | 'error', detail: string) => void;
let observer: AvatarObserver | undefined;
let cancelSpeechWait: (() => void) | null = null;
const grammyVoice = createGrammyVoiceSelection();
let reportedVoiceURI: string | undefined;

function getAvatarAssets(character: LessonAvatarCharacter) {
  switch (character) {
    case 'grammy':
      return armsDownAvatarAssets;
  }
}

export function mountLessonAvatar(
  character: LessonAvatarCharacter,
  container: HTMLElement,
  onEvent?: AvatarObserver,
): TalkingAvatarController {
  if (avatar && mountedCharacter === character && mountedContainer === container) {
    return avatar;
  }

  disposeLessonAvatar();
  observer = onEvent;
  reportedVoiceURI = undefined;

  avatar = createTalkingAvatarController({
    assets: getAvatarAssets(character),
    mount: container,
    onStateChange: (state) => onEvent?.('avatar', state),
  });
  avatar.setVolume(lessonAvatarVolume);
  mountedCharacter = character;
  mountedContainer = container;

  return avatar;
}

export async function showLessonAvatar(animateEntrance = true): Promise<void> {
  if (!avatar) return;
  const showingAvatar = avatar;
  const transition = showingAvatar.el.style.transition;
  // Use the controller's entrance lifecycle so its actor reaches idle even
  // when a prior scene has already moved Grammy to this resting position.
  if (!animateEntrance) showingAvatar.el.style.transition = 'none';
  try {
    await showingAvatar.enter();
  } finally {
    if (!animateEntrance) showingAvatar.el.style.transition = transition;
  }
}

export function hideLessonAvatar(): void {
  avatar?.setVisible(false);
}

export function setLessonAvatarThinking(waiting: boolean): void {
  avatar?.setThinking(waiting);
}

export async function speakWithLessonAvatar(
  message: string,
  options?: LessonSpeakOptions,
): Promise<void> {
  if (!avatar) return;
  cancelLessonAvatarSpeech();
  const speakingAvatar = avatar;
  const report = observer;
  report?.('speech', `Started: ${message}`);
  let cancel!: () => void;
  const cancelled = new Promise<void>((resolve) => {
    cancel = () => {
      report?.('speech', `Cancelled: ${message}`);
      resolve();
    };
  });
  cancelSpeechWait = cancel;
  try {
    await Promise.race([cancelled, (async () => {
      const voices = await getVoicesAsync({
        isReady: options?.voiceURI
          ? voices => Boolean(findVoiceByURI(voices, options.voiceURI!))
          : grammyVoice.isReady,
        timeoutMs: 2000,
      });
      // A lesson change or replay may cancel us while voices are still loading.
      if (cancelSpeechWait !== cancel || avatar !== speakingAvatar) return;
      const voice = options?.voiceURI
        ? findVoiceByURI(voices, options.voiceURI)
        : grammyVoice.select(voices, options?.lang);
      if (!voice) throw new Error('No English speech voice is available yet.');
      if (voice.voiceURI !== reportedVoiceURI) {
        reportedVoiceURI = voice.voiceURI;
        report?.('speech', `Grammy voice: ${voice.name} (${voice.lang})`);
        if (!options?.voiceURI && !isGrammyVoice(voice)) {
          report?.('error', `Preferred male voice unavailable; using ${voice.name}.`);
        }
      }
      await speakingAvatar.speak(message, {
        ...options,
        voiceURI: voice.voiceURI,
        lang: voice.lang,
        pitch: options?.pitch ?? 1,
        preSpeakWaveMs: options?.wave ? (options.preSpeakWaveMs ?? 450) : 0,
        volume: options?.volume ?? lessonAvatarVolume,
      });
      if (cancelSpeechWait === cancel) report?.('speech', `Finished: ${message}`);
    })()]);
  } catch (error) {
    report?.('error', `Speech failed: ${String(error)}`);
    throw error;
  } finally {
    if (cancelSpeechWait === cancel) cancelSpeechWait = null;
  }
}

export function setLessonAvatarVolume(volumePercent: number): void {
  const normalized = Number.isFinite(volumePercent)
    ? Math.max(0, Math.min(1, volumePercent / 100))
    : 0.72;
  lessonAvatarVolume = normalized;
  avatar?.setVolume(normalized);
}

export function cancelLessonAvatarSpeech(): void {
  cancelSpeechWait?.();
  cancelSpeechWait = null;
  avatar?.cancel();
}

export function pauseLessonAvatar(): void {
  avatar?.pause();
}

export function resumeLessonAvatar(): void {
  avatar?.resume();
}

export function getLessonAvatar(): TalkingAvatarController | null {
  return avatar;
}

export function disposeLessonAvatar(): void {
  if (!avatar) return;
  cancelLessonAvatarSpeech();
  avatar.dispose();
  avatar = null;
  mountedCharacter = null;
  mountedContainer = null;
  observer = undefined;
}
