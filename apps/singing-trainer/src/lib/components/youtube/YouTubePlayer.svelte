<script lang="ts">
  /**
   * YouTube Player Component
   *
   * Embeds a YouTube video player synchronized with the note highway.
   * Shows loading state, error handling, and fallback for non-embeddable videos.
   */

  import { onMount, onDestroy } from 'svelte';
  import { youtubeState } from '../../stores/youtubeState.svelte.js';
  import { ultrastarState } from '../../stores/ultrastarState.svelte.js';

  // Unique ID for the player container
  const playerId = `youtube-player-${Math.random().toString(36).slice(2, 9)}`;

  // Reactive state
  const isLoading = $derived(
    youtubeState.state.isApiLoading ||
    (youtubeState.state.videoId && !youtubeState.state.isPlayerReady)
  );
  const hasError = $derived(!!youtubeState.state.error);
  const isEmbeddable = $derived(youtubeState.state.isEmbeddable);
  const videoId = $derived(ultrastarState.state.youtubeId);

  // Load video when videoId changes
  $effect(() => {
    if (videoId) {
      youtubeState.loadVideo(videoId, playerId);
    }
  });

  onDestroy(() => {
    youtubeState.dispose();
  });

  /**
   * Open video in new tab (fallback for non-embeddable)
   */
  function openOnYouTube() {
    const url = youtubeState.getVideoUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
</script>

<div class="youtube-container">
  <!-- Player container - NEVER hide this div, YouTube API needs it visible -->
  <div
    id={playerId}
    class="youtube-player"
  ></div>

  <!-- Loading overlay (shown on top of player while loading) -->
  {#if isLoading && videoId}
    <div class="youtube-loading">
      <div class="spinner"></div>
      <span>Loading video...</span>
    </div>
  {/if}

  <!-- Error state -->
  {#if hasError}
    <div class="youtube-error">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{youtubeState.state.error}</span>

      {#if !isEmbeddable}
        <button class="fallback-btn" onclick={openOnYouTube}>
          Open on YouTube ↗
        </button>
      {/if}
    </div>
  {/if}

  <!-- No video placeholder -->
  {#if !videoId && !isLoading && !hasError}
    <div class="youtube-placeholder">
      <span class="placeholder-icon">🎬</span>
      <span class="placeholder-text">No video loaded</span>
    </div>
  {/if}
</div>

<style>
  .youtube-container {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background-color: var(--color-bg);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .youtube-player {
    width: 100%;
    height: 100%;
  }

  .youtube-player :global(iframe) {
    width: 100%;
    height: 100%;
    border: none;
  }

  .youtube-loading,
  .youtube-error,
  .youtube-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .youtube-error {
    background-color: rgba(220, 53, 69, 0.1);
  }

  .error-icon {
    font-size: var(--font-size-xl);
  }

  .error-message {
    color: var(--color-error, #dc3545);
    text-align: center;
  }

  .fallback-btn {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .fallback-btn:hover {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  .placeholder-icon {
    font-size: var(--font-size-xl);
    opacity: 0.5;
  }

  .placeholder-text {
    opacity: 0.7;
  }
</style>
