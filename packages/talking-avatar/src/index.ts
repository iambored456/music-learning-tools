/**
 * @mlt/talking-avatar
 *
 * A talking avatar controller combining SVG visual states with native browser TTS.
 *
 * @example
 * ```typescript
 * import { createTalkingAvatarController, defaultAvatarAssets } from '@mlt/talking-avatar';
 *
 * const mount = document.getElementById('avatar-mount')!;
 * const avatar = createTalkingAvatarController({
 *   assets: defaultAvatarAssets,
 *   mount,
 * });
 *
 * await avatar.enter();
 * await avatar.speak('Hello! Welcome to the tutorial.');
 * ```
 */

// Re-export types
export type {
  AvatarAssetSet,
  AvatarVisualState,
  SpeakOptions,
  TalkingAvatarOptions,
  TalkingAvatarController,
  MouthFrameKey,
  AvatarAssetKey,
} from "./types.ts";

// Re-export default assets
export { defaultAvatarAssets } from "./defaultAssets.ts";

// Re-export utilities for advanced usage
export { stripHtml, splitIntoSentenceChunks } from "./chunking.ts";
export { getVoicesAsync, pickPreferredVoice, findVoiceByURI } from "./voices.ts";

// Internal imports
import type {
  TalkingAvatarOptions,
  TalkingAvatarController,
  SpeakOptions,
} from "./types.ts";
import { createAvatarViewDom } from "./avatarViewDom.ts";
import { createAvatarActor } from "./avatarActor.ts";
import { createNarrator } from "./narrator.ts";

/**
 * Create a talking avatar controller.
 *
 * The controller composes:
 * - AvatarViewDom: DOM rendering and SVG swapping
 * - AvatarActor: State machine and mouth animation
 * - Narrator: Speech synthesis with progress signals
 *
 * @param opts - Configuration options
 * @returns TalkingAvatarController instance
 */
export function createTalkingAvatarController(
  opts: TalkingAvatarOptions
): TalkingAvatarController {
  const { assets, mount, onStateChange, debug } = opts;

  // Create view layer
  const view = createAvatarViewDom(assets, mount);

  // Create actor (state machine + animation)
  const actor = createAvatarActor({
    view,
    onStateChange,
    debug,
  });

  // Store current speak options for use in callback
  let currentSpeakOpts: SpeakOptions | undefined;

  // Create narrator with callbacks to actor
  const narrator = createNarrator({
    callbacks: {
      onSpeakingChange: (speaking) => {
        if (speaking) {
          // Start talking animation when speech actually begins (AFTER wave)
          actor.startTalking(currentSpeakOpts);
        } else {
          actor.stopTalking();
        }
      },
      onSpeechPulse: () => {
        actor.speechPulse();
      },
      onPreSpeakWave: async (durationMs) => {
        await actor.startWave(durationMs);
      },
    },
    debug,
  });

  // Preload assets in background
  view.preload().catch((err) => {
    if (debug) {
      console.warn("[TalkingAvatar] Asset preload warning:", err);
    }
  });

  const controller: TalkingAvatarController = {
    el: view.el,

    setVisible(visible: boolean): void {
      if (visible) {
        view.setVisible(true);
      } else {
        actor.hide();
      }
    },

    async enter(): Promise<void> {
      await actor.enter();
    },

    setFeedbackBad(active: boolean): void {
      actor.setFeedbackBad(active);
    },

    async speak(textOrHtml: string, speakOpts?: SpeakOptions): Promise<void> {
      // Store options for use in onSpeakingChange callback
      currentSpeakOpts = speakOpts;

      // Don't call startTalking here - it will be called from onSpeakingChange
      // after the wave animation completes
      await narrator.speak(textOrHtml, speakOpts);
    },

    cancel(): void {
      narrator.cancel();
      actor.stopTalking();
    },

    pause(): void {
      narrator.pause();
    },

    resume(): void {
      narrator.resume();
    },

    listVoices(): Promise<SpeechSynthesisVoice[]> {
      return narrator.listVoices();
    },

    setVoiceURI(uri: string | undefined): void {
      narrator.setVoiceURI(uri);
    },

    setVolume(volume: number): void {
      narrator.setVolume(volume);
    },

    dispose(): void {
      narrator.dispose();
      actor.dispose();
    },
  };

  return controller;
}
