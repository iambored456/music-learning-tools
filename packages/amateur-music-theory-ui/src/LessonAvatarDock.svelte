<script lang="ts">
  import { createEventDispatcher, getContext, onDestroy } from 'svelte';
  import { lessonInspectorKey, type LessonInspector } from './lessonInspector.svelte';
  import type { LessonAvatarCharacter } from './lessonAvatar';
  import { disposeLessonAvatar, mountLessonAvatar, showLessonAvatar } from './lessonAvatar';
  import { lessonBubblePromotion } from './lessonBubblePromotion';
  import { lessonBubbleDismissal } from './lessonBubbleDismissal';

  export let character: LessonAvatarCharacter;
  export let speechText = '';
  export let upperSpeechText = '';
  export let departingSpeechText = '';
  export let onSpeechDismissed: (() => void) | undefined = undefined;
  export let underlinedWords: string[] = [];
  export let inlineSpeech = false;
  export let anchoredStage = false;
  export let animateEntrance = true;
  export let animateSpeechPromotion = false;
  export let paused = false;

  const dispatch = createEventDispatcher<{ ready: { character: LessonAvatarCharacter } }>();
  const inspector = getContext<LessonInspector | undefined>(lessonInspectorKey);

  let mount: HTMLDivElement | null = null;
  let mountedCharacter: LessonAvatarCharacter | null = null;
  let disposed = false;

  type SpeechPart = {
    text: string;
    underlined: boolean;
  };

  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildSpeechParts(text: string, words: string[]): SpeechPart[] {
    const normalizedWords = words.map((word) => word.trim()).filter(Boolean);
    if (normalizedWords.length === 0) return [{ text, underlined: false }];

    const matcher = new RegExp(`(${normalizedWords.map(escapeRegExp).join('|')})`, 'gi');
    const underlinedSet = new Set(normalizedWords.map((word) => word.toLocaleLowerCase()));
    return text
      .split(matcher)
      .filter(Boolean)
      .map((part) => ({
        text: part,
        underlined: underlinedSet.has(part.toLocaleLowerCase()),
      }));
  }

  $: speechParts = buildSpeechParts(speechText, underlinedWords);

  async function syncAvatar(): Promise<void> {
    if (!mount) return;
    if (mountedCharacter === character) return;

    const observedSection = inspector?.sectionCode;
    mountLessonAvatar(character, mount, (kind, detail) => inspector?.record(
      kind, detail, inspector.sectionCode === observedSection ? inspector.currentCueId : null, observedSection,
    ));
    mountedCharacter = character;
    await showLessonAvatar(animateEntrance);
    if (!disposed) dispatch('ready', { character });
  }

  $: if (mount && character) {
    void syncAvatar();
  }

  onDestroy(() => {
    disposed = true;
    disposeLessonAvatar();
  });
</script>

<div class="lesson-avatar-dock" class:inline-speech={inlineSpeech} class:anchored-stage={anchoredStage} aria-label="Lesson avatar">
  {#if departingSpeechText.trim() || upperSpeechText.trim() || speechText.trim()}
    <div class="lesson-avatar-bubbles">
      {#if departingSpeechText.trim()}
        <div class="lesson-avatar-bubble" aria-hidden="true"
          use:lessonBubbleDismissal={{ paused, onComplete: onSpeechDismissed }}>
          <p>{departingSpeechText}</p>
        </div>
      {/if}
      {#key upperSpeechText}
        {#if upperSpeechText.trim()}
          <div class="lesson-avatar-bubble" aria-live="polite"
            use:lessonBubblePromotion={{ enabled: animateSpeechPromotion, paused }}>
            <p>{upperSpeechText}</p>
          </div>
        {/if}
      {/key}
      {#if speechText.trim()}
        <div class="lesson-avatar-bubble" aria-live="polite">
          <p>
            {#each speechParts as part}
              {#if part.underlined}
                <u>{part.text}</u>
              {:else}
                {part.text}
              {/if}
            {/each}
          </p>
        </div>
      {/if}
    </div>
  {/if}
  <div class="lesson-avatar-stage" bind:this={mount}></div>
</div>

<style>
  .lesson-avatar-dock {
    position: relative;
    width: min(18rem, 100%);
    display: block;
  }

  .lesson-avatar-bubbles {
    position: absolute;
    inset-inline: 0;
    bottom: calc(100% + 1rem);
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    z-index: 1;
  }

  .lesson-avatar-bubble {
    position: relative;
    padding: 0.9rem 1rem;
    border-radius: 1.15rem;
    border: 1px solid rgba(84, 65, 39, 0.12);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(249, 245, 237, 0.94));
    box-shadow:
      0 16px 32px rgba(74, 54, 33, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.65);
    color: #2e3b43;
    pointer-events: none;
    z-index: 1;
  }

  .lesson-avatar-bubble::after {
    content: '';
    position: absolute;
    left: 1.35rem;
    top: calc(100% - 0.1rem);
    width: 1rem;
    height: 1rem;
    border-right: 1px solid rgba(84, 65, 39, 0.12);
    border-bottom: 1px solid rgba(84, 65, 39, 0.12);
    background: rgba(249, 245, 237, 0.95);
    transform: rotate(45deg);
  }

  .lesson-avatar-bubble p {
    margin: 0;
    font-size: 1.44rem;
    line-height: 1.3;
    font-weight: 600;
  }

  .lesson-avatar-stage {
    width: 80%;
    aspect-ratio: 1 / 1;
    min-height: 12rem;
    margin-inline: auto;
  }

  .inline-speech .lesson-avatar-bubbles {
    position: relative;
    bottom: auto;
    margin-bottom: 0.9rem;
  }

  @media (max-width: 980px) {
    .lesson-avatar-bubbles {
      position: relative;
      bottom: auto;
      margin-bottom: 0.9rem;
    }

    .lesson-avatar-bubble::after {
      display: none;
    }
  }

  @media (max-width: 720px) {
    .lesson-avatar-dock {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) clamp(4.75rem, 22vw, 6rem);
      align-items: end;
      gap: 0.55rem;
    }

    .lesson-avatar-bubbles {
      grid-column: 1;
      grid-row: 1;
      align-self: center;
      margin: 0;
    }

    .lesson-avatar-bubble {
      padding: 0.7rem 0.8rem;
      border-radius: 0.95rem;
    }

    .lesson-avatar-bubble p {
      font-size: clamp(1rem, 4.6vw, 1.18rem);
      line-height: 1.25;
    }

    .lesson-avatar-stage {
      grid-column: 2;
      grid-row: 1;
      width: 100%;
      min-height: 0;
      margin: 0;
    }
  }

  .lesson-avatar-dock.anchored-stage { display: block; width: 100%; }
  .anchored-stage .lesson-avatar-bubbles {
    position: absolute;
    bottom: calc(100% + 1rem);
    margin: 0;
  }
  .anchored-stage .lesson-avatar-stage {
    width: 80%;
    min-height: 0;
    margin-inline: auto;
  }
  @media (max-width: 980px) {
    .anchored-stage .lesson-avatar-bubble p { font-size: clamp(0.8rem, 2vw, 1.3rem); }
  }
</style>
