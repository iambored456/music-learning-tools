import {
  createTalkingAvatarController,
  defaultAvatarAssets,
  type SpeakOptions,
  type TalkingAvatarController,
} from '@mlt/talking-avatar';

export type LessonAvatarCharacter = 'grammy';

let avatar: TalkingAvatarController | null = null;
let mountedCharacter: LessonAvatarCharacter | null = null;
let mountedContainer: HTMLElement | null = null;
let lessonAvatarVolume = 0.72;

function getAvatarAssets(character: LessonAvatarCharacter) {
  switch (character) {
    case 'grammy':
      // The default talking-avatar asset pack is Grammy from Diatonic Compass.
      return defaultAvatarAssets;
  }
}

export function mountLessonAvatar(
  character: LessonAvatarCharacter,
  container: HTMLElement,
): TalkingAvatarController {
  if (avatar && mountedCharacter === character && mountedContainer === container) {
    return avatar;
  }

  disposeLessonAvatar();

  avatar = createTalkingAvatarController({
    assets: getAvatarAssets(character),
    mount: container,
  });
  avatar.setVolume(lessonAvatarVolume);
  mountedCharacter = character;
  mountedContainer = container;

  return avatar;
}

export async function showLessonAvatar(): Promise<void> {
  if (!avatar) return;
  await avatar.enter();
}

export function hideLessonAvatar(): void {
  avatar?.setVisible(false);
}

export async function speakWithLessonAvatar(
  message: string,
  options?: SpeakOptions,
): Promise<void> {
  if (!avatar) return;
  await avatar.speak(message, {
    ...options,
    volume: options?.volume ?? lessonAvatarVolume,
  });
}

export function setLessonAvatarVolume(volumePercent: number): void {
  const normalized = Number.isFinite(volumePercent)
    ? Math.max(0, Math.min(1, volumePercent / 100))
    : 0.72;
  lessonAvatarVolume = normalized;
  avatar?.setVolume(normalized);
}

export function cancelLessonAvatarSpeech(): void {
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
  avatar.cancel();
  avatar.dispose();
  avatar = null;
  mountedCharacter = null;
  mountedContainer = null;
}
