<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import type { LessonAvatarCharacter } from './lessonAvatar';
  import { disposeLessonAvatar, mountLessonAvatar, showLessonAvatar } from './lessonAvatar';

  export let character: LessonAvatarCharacter;
  export let speechText = '';
  export let underlinedWords: string[] = [];

  const dispatch = createEventDispatcher<{ ready: { character: LessonAvatarCharacter } }>();

  let mount: HTMLDivElement | null = null;
  let mountedCharacter: LessonAvatarCharacter | null = null;

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

    mountLessonAvatar(character, mount);
    mountedCharacter = character;
    await showLessonAvatar();
    dispatch('ready', { character });
  }

  $: if (mount && character) {
    void syncAvatar();
  }

  onDestroy(() => {
    disposeLessonAvatar();
  });
</script>

<div class="lesson-avatar-dock" aria-label="Lesson avatar">
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
  <div class="lesson-avatar-stage" bind:this={mount}></div>
</div>

<style>
  .lesson-avatar-dock {
    position: relative;
    width: min(18rem, 100%);
    display: block;
  }

  .lesson-avatar-bubble {
    position: absolute;
    inset-inline: 0;
    bottom: calc(100% + 1rem);
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

  @media (max-width: 980px) {
    .lesson-avatar-bubble {
      position: relative;
      bottom: auto;
      margin-bottom: 0.9rem;
    }

    .lesson-avatar-bubble::after {
      display: none;
    }
  }
</style>
