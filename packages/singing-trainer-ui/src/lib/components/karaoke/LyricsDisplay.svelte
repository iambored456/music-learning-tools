<script lang="ts">
  /**
   * LyricsDisplay Component
   *
   * Karaoke-style lyrics display that shows:
   * - Current phrase at the bottom of the screen
   * - Syllable-by-syllable highlighting as time progresses
   * - Upcoming phrase preview (smaller, faded)
   * - Golden note syllables with special glow effect
   */

  import { ultrastarState } from '../../stores/ultrastarState.svelte.js';
  import { highwayState } from '../../stores/highwayState.svelte.js';
  import type { LyricPhrase } from '../../types/ultrastar.js';

  // Reactive state from stores
  const currentTimeMs = $derived(highwayState.state.currentTimeMs);
  const isPlaying = $derived(ultrastarState.state.isPlaying);
  const lyricPhrases = $derived(ultrastarState.state.lyricPhrases);

  // Find current phrase based on time
  const currentPhrase: LyricPhrase | null = $derived.by(() => {
    if (!isPlaying || lyricPhrases.length === 0) return null;

    // Find phrase that contains current time, or upcoming phrase
    const activePhrase = lyricPhrases.find(
      (p) => currentTimeMs >= p.startTimeMs - 500 && currentTimeMs < p.endTimeMs + 200
    );

    return activePhrase ?? null;
  });

  // Find next phrase for preview
  const nextPhrase: LyricPhrase | null = $derived.by(() => {
    if (!currentPhrase || !isPlaying) return null;

    const currentIndex = lyricPhrases.findIndex((p) => p.index === currentPhrase.index);
    if (currentIndex === -1 || currentIndex >= lyricPhrases.length - 1) return null;

    return lyricPhrases[currentIndex + 1];
  });

  // Find current syllable index within the phrase
  function getCurrentSyllableIndex(phrase: LyricPhrase): number {
    if (!phrase) return -1;

    return phrase.syllables.findIndex(
      (s) => currentTimeMs >= s.startTimeMs && currentTimeMs < s.endTimeMs
    );
  }

  // Check if a syllable has been sung (past)
  function isSyllableSung(phrase: LyricPhrase, syllableIndex: number): boolean {
    if (!phrase || syllableIndex < 0) return false;

    const syllable = phrase.syllables[syllableIndex];
    return currentTimeMs >= syllable.endTimeMs;
  }

  // Check if a syllable is currently being sung
  function isSyllableActive(phrase: LyricPhrase, syllableIndex: number): boolean {
    if (!phrase || syllableIndex < 0) return false;

    const syllable = phrase.syllables[syllableIndex];
    return currentTimeMs >= syllable.startTimeMs && currentTimeMs < syllable.endTimeMs;
  }
</script>

{#if isPlaying && currentPhrase}
  <div class="lyrics-display">
    <!-- Current phrase -->
    <div class="current-phrase">
      {#each currentPhrase.syllables as syllable, i}
        {@const isActive = isSyllableActive(currentPhrase, i)}
        {@const isSung = isSyllableSung(currentPhrase, i)}
        <span
          class="syllable"
          class:active={isActive}
          class:sung={isSung}
          class:golden={syllable.isGolden}
          class:rap={syllable.isRap}
        >
          {syllable.text}
        </span>
      {/each}
    </div>

    <!-- Next phrase preview -->
    {#if nextPhrase}
      <div class="next-phrase">
        {nextPhrase.fullText}
      </div>
    {/if}
  </div>
{/if}

<style>
  .lyrics-display {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    z-index: 10;
    pointer-events: none;
    max-width: 90%;
  }

  .current-phrase {
    font-size: 28px;
    font-weight: 600;
    color: white;
    text-shadow:
      2px 2px 4px rgba(0, 0, 0, 0.9),
      -1px -1px 2px rgba(0, 0, 0, 0.5);
    margin-bottom: 8px;
    line-height: 1.3;
  }

  .syllable {
    transition: all 0.1s ease;
    display: inline;
  }

  .syllable.active {
    color: #FFD700;
    font-size: 1.15em;
    text-shadow:
      0 0 10px rgba(255, 215, 0, 0.8),
      2px 2px 4px rgba(0, 0, 0, 0.9);
  }

  .syllable.sung {
    opacity: 0.5;
  }

  .syllable.golden {
    text-shadow:
      0 0 8px rgba(255, 215, 0, 0.6),
      2px 2px 4px rgba(0, 0, 0, 0.9);
  }

  .syllable.golden.active {
    color: #FFEB3B;
    text-shadow:
      0 0 15px rgba(255, 235, 59, 1),
      0 0 25px rgba(255, 215, 0, 0.8),
      2px 2px 4px rgba(0, 0, 0, 0.9);
    font-size: 1.2em;
  }

  .syllable.rap {
    font-style: italic;
    color: #CE93D8;
  }

  .syllable.rap.active {
    color: #E1BEE7;
    text-shadow:
      0 0 10px rgba(156, 39, 176, 0.8),
      2px 2px 4px rgba(0, 0, 0, 0.9);
  }

  .next-phrase {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
