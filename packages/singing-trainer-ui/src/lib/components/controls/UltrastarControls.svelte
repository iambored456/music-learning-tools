<script lang="ts">
  /**
   * Ultrastar Controls Component
   *
   * UI for uploading Ultrastar .txt files, displaying song info,
   * and controlling playback with YouTube video sync.
   */

  import { ultrastarState } from '../../stores/ultrastarState.svelte.js';
  import { youtubeState } from '../../stores/youtubeState.svelte.js';
  import { highwayState } from '../../stores/highwayState.svelte.js';
  import { appState } from '../../stores/appState.svelte.js';
  import { createTransportSync, type TransportSyncInstance } from '../../services/transportSync.js';
  import { parseYouTubeUrl } from '../../services/youtubeUrlParser.js';
  import { onDestroy } from 'svelte';
  import YouTubePlayer from '../youtube/YouTubePlayer.svelte';
  import SyncControls from './SyncControls.svelte';

  // Transport sync instance
  let transportSync: TransportSyncInstance | null = null;
  let syncLoopId: number | null = null;

  // File input ref
  let fileInput: HTMLInputElement;

  // Video linking state
  let videoUrlInput = $state('');
  let videoLinkError = $state<string | null>(null);

  /**
   * Link a YouTube video by URL or ID
   */
  function handleLinkVideo() {
    videoLinkError = null;
    const videoId = parseYouTubeUrl(videoUrlInput);
    if (!videoId) {
      videoLinkError = 'Could not parse a YouTube video ID.';
      return;
    }
    ultrastarState.setYoutubeId(videoId);
    videoUrlInput = '';
  }

  /**
   * Unlink the current YouTube video
   */
  function handleUnlinkVideo() {
    youtubeState.dispose();
    ultrastarState.setYoutubeId(null);
  }

  // Reactive state
  const isActive = $derived(ultrastarState.state.isActive);
  const isLoading = $derived(ultrastarState.state.isLoading);
  const isPlaying = $derived(ultrastarState.state.isPlaying);
  const hasVideo = $derived(ultrastarState.hasVideo);
  const songTitle = $derived(ultrastarState.title);
  const songArtist = $derived(ultrastarState.artist);
  const error = $derived(ultrastarState.state.error);
  const detectedPitchFormat = $derived(ultrastarState.state.detectedPitchFormat);
  const pitchFormatOverride = $derived(ultrastarState.state.pitchFormatOverride);
  const effectivePitchFormat = $derived(ultrastarState.effectivePitchFormat);
  const detectedRange = $derived(ultrastarState.state.detectedRange);
  const bpmInfo = $derived(ultrastarState.state.bpmInfo);

  /**
   * Handle file upload
   */
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const success = await ultrastarState.loadFile(file);

    if (success) {
      // Initialize transport sync with song's sync config
      transportSync = createTransportSync({
        syncConfig: ultrastarState.state.syncConfig,
      });

      // Apply detected pitch range to app
      const range = ultrastarState.state.detectedRange;
      appState.setYAxisRange({ minMidi: range.minMidi, maxMidi: range.maxMidi });

      // Set target notes on highway
      highwayState.setTargetNotes(ultrastarState.state.targetNotes);

      // Debug logging
      const bpmDebug = ultrastarState.state.bpmInfo;
      console.log('[Ultrastar] File loaded:', {
        title: ultrastarState.title,
        artist: ultrastarState.artist,
        youtubeId: ultrastarState.state.youtubeId,
        rawBpm: bpmDebug?.rawBpm,
        effectiveBpm: bpmDebug?.effectiveBpm,
        beatDivisor: bpmDebug?.beatDivisor,
        gap: ultrastarState.state.song?.metadata.gap,
        videoGap: ultrastarState.state.song?.metadata.videoGap,
        noteCount: ultrastarState.state.targetNotes.length,
        firstNotes: ultrastarState.state.targetNotes.slice(0, 3),
        lastNotes: ultrastarState.state.targetNotes.slice(-3),
        totalDurationMs: ultrastarState.state.totalDurationMs,
        pitchRange: range,
        syncConfig: ultrastarState.state.syncConfig,
      });
    }

    // Reset input so same file can be selected again
    input.value = '';
  }

  /**
   * Start playback
   */
  async function handleStart() {
    if (!isActive) return;

    // Switch to highway mode
    appState.setVisualizationMode('highway');

    // Update transport sync config if offset changed
    if (transportSync) {
      transportSync.updateConfig(ultrastarState.state.syncConfig);
    }

    // Set target notes (in case they changed)
    highwayState.setTargetNotes(ultrastarState.state.targetNotes);
    ultrastarState.setPlaying(true);

    // If we have video, YouTube is the master clock
    if (hasVideo && youtubeState.state.isPlayerReady) {
      // Log for debugging
      console.log('[Ultrastar] Starting playback:', {
        noteCount: ultrastarState.state.targetNotes.length,
        firstNote: ultrastarState.state.targetNotes[0],
        gapMs: ultrastarState.state.song?.metadata.gap,
        totalDurationMs: ultrastarState.state.totalDurationMs,
      });

      // Reset highway time to 0
      highwayState.setCurrentTime(0);

      // Start YouTube from the beginning - GAP is now included in note timing
      // so the highway will show blank scrolling for GAP duration before first note
      youtubeState.seekTo(0);
      youtubeState.play();

      // Start sync loop - YouTube drives highway time
      startSyncLoop();
    } else {
      // No video - use highway's internal clock
      highwayState.start();
    }
  }

  /**
   * Stop playback
   */
  function handleStop() {
    // Stop highway
    highwayState.stop();
    ultrastarState.setPlaying(false);

    // Stop YouTube
    youtubeState.pause();

    // Stop sync loop
    stopSyncLoop();
  }

  /**
   * Unload current song
   */
  function handleUnload() {
    handleStop();
    ultrastarState.unload();
    youtubeState.dispose();
    highwayState.reset();
    transportSync = null;
  }

  /**
   * Start the sync loop - YouTube is the master clock for Ultrastar songs
   * We sync the highway to YouTube, not the other way around
   */
  function startSyncLoop() {
    if (syncLoopId !== null) {
      clearInterval(syncLoopId);
    }

    // Get manual offset for fine-tuning (videoGap and manualOffset can still be used)
    const syncConfig = ultrastarState.state.syncConfig;
    const videoOffsetSec = (syncConfig.videoGapSec ?? 0) + (syncConfig.manualOffsetSec ?? 0);

    // Use YouTube as the master clock - update highway time from YouTube position
    youtubeState.startSyncLoop((ytTimeSec) => {
      // Direct conversion: YouTube seconds to transport milliseconds
      // GAP is already included in note timing, so no subtraction needed
      // Only apply videoGap and manualOffset for fine-tuning
      const transportTimeMs = (ytTimeSec + videoOffsetSec) * 1000;

      // Only update if significantly different to avoid jitter
      const currentTransport = highwayState.state.currentTimeMs;
      const diffMs = Math.abs(transportTimeMs - currentTransport);

      // Update highway time to match YouTube (with small threshold to reduce jitter)
      if (diffMs > 50) {
        highwayState.setCurrentTime(Math.max(0, transportTimeMs));
      }

      // Update current lyric phrase for karaoke display
      ultrastarState.updateCurrentPhrase(transportTimeMs);
    }, 100); // Check every 100ms for smoother sync
  }

  /**
   * Stop the sync loop
   */
  function stopSyncLoop() {
    youtubeState.stopSyncLoop();
    if (syncLoopId !== null) {
      clearInterval(syncLoopId);
      syncLoopId = null;
    }
  }

  /**
   * Trigger file input click
   */
  function openFilePicker() {
    fileInput?.click();
  }

  onDestroy(() => {
    stopSyncLoop();
    youtubeState.dispose();
  });
</script>

<div class="ultrastar-panel">
  <h3 class="panel-title">Ultrastar Song</h3>

  <!-- Hidden file input -->
  <input
    type="file"
    accept=".txt"
    bind:this={fileInput}
    onchange={handleFileSelect}
    style="display: none;"
  />

  {#if !isActive}
    <!-- Upload button -->
    <button class="upload-btn" onclick={openFilePicker} disabled={isLoading}>
      {#if isLoading}
        <span class="spinner"></span>
        Loading...
      {:else}
        Upload Ultrastar .txt
      {/if}
    </button>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}
  {:else}
    <!-- Song Info -->
    <div class="song-info">
      <div class="song-title">{songTitle}</div>
      <div class="song-artist">{songArtist}</div>
    </div>

    <!-- Pitch Format Section -->
    <div class="pitch-format-section">
      <div class="format-header">
        <span class="format-label">Pitch Format</span>
        <span class="format-detected">
          Detected: <strong>{detectedPitchFormat}</strong>
        </span>
      </div>
      <div class="format-buttons">
        <button
          class="format-btn"
          class:active={pitchFormatOverride === null}
          onclick={() => ultrastarState.setPitchFormat(null)}
          disabled={isPlaying}
        >
          Auto
        </button>
        <button
          class="format-btn"
          class:active={pitchFormatOverride === 'relative'}
          onclick={() => ultrastarState.setPitchFormat('relative')}
          disabled={isPlaying}
        >
          Relative
        </button>
        <button
          class="format-btn"
          class:active={pitchFormatOverride === 'absolute'}
          onclick={() => ultrastarState.setPitchFormat('absolute')}
          disabled={isPlaying}
        >
          Absolute
        </button>
      </div>
      <div class="range-info">
        Range: {detectedRange.minMidi} - {detectedRange.maxMidi} MIDI
      </div>
      {#if bpmInfo}
        <div class="bpm-info">
          BPM: {bpmInfo.effectiveBpm.toFixed(1)}
          {#if bpmInfo.beatDivisor !== 1}
            <span class="bpm-normalized">(raw: {bpmInfo.rawBpm.toFixed(1)} ÷{bpmInfo.beatDivisor})</span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- YouTube Video Section -->
    <div class="video-section">
      {#if hasVideo}
        <YouTubePlayer />
        <SyncControls />
        <button class="unlink-btn" onclick={handleUnlinkVideo} disabled={isPlaying}>
          Unlink Video
        </button>
      {:else}
        <div class="video-link-form">
          <label class="video-link-label">Link YouTube Video</label>
          <div class="video-link-row">
            <input
              type="text"
              class="video-link-input"
              placeholder="Paste YouTube URL or video ID"
              bind:value={videoUrlInput}
              onkeydown={(e) => e.key === 'Enter' && handleLinkVideo()}
              disabled={isPlaying}
            />
            <button
              class="link-btn"
              onclick={handleLinkVideo}
              disabled={isPlaying || !videoUrlInput.trim()}
            >
              Link
            </button>
          </div>
          {#if videoLinkError}
            <div class="video-link-error">{videoLinkError}</div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Playback Controls -->
    <div class="playback-controls">
      {#if !isPlaying}
        <button class="play-btn" onclick={handleStart}>
          ▶ Play
        </button>
      {:else}
        <button class="stop-btn" onclick={handleStop}>
          ⏹ Stop
        </button>
      {/if}

      <button class="unload-btn" onclick={handleUnload} disabled={isPlaying}>
        Unload
      </button>
    </div>

    <!-- Progress info -->
    {#if isPlaying}
      <div class="progress-info">
        <span class="time-display">
          {Math.floor(highwayState.state.currentTimeMs / 1000)}s
          / {Math.floor(ultrastarState.state.totalDurationMs / 1000)}s
        </span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .ultrastar-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .panel-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .upload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .upload-btn:hover:not(:disabled) {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  .upload-btn:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    padding: var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-error, #dc3545);
    background-color: rgba(220, 53, 69, 0.1);
    border-radius: var(--radius-sm);
  }

  .song-info {
    padding: var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  .song-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
  }

  .song-artist {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .pitch-format-section {
    padding: var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .format-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .format-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .format-detected {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .format-detected strong {
    color: var(--color-primary);
  }

  .format-buttons {
    display: flex;
    gap: var(--spacing-xs);
  }

  .format-btn {
    flex: 1;
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    background-color: var(--color-bg);
    color: var(--color-text-muted);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .format-btn:hover:not(:disabled) {
    background-color: var(--color-bg-light);
    color: var(--color-text);
  }

  .format-btn.active {
    background-color: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .format-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .range-info {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-align: center;
    font-family: monospace;
  }

  .bpm-info {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-align: center;
    font-family: monospace;
  }

  .bpm-normalized {
    color: var(--color-text-muted);
    opacity: 0.7;
    font-size: 0.9em;
  }

  .video-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .video-link-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  .video-link-label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .video-link-row {
    display: flex;
    gap: var(--spacing-xs);
  }

  .video-link-input {
    flex: 1;
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    outline: none;
  }

  .video-link-input:focus {
    border-color: var(--color-primary);
  }

  .video-link-input:disabled {
    opacity: 0.4;
  }

  .link-btn {
    padding: var(--spacing-xs) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .link-btn:hover:not(:disabled) {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  .link-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .video-link-error {
    font-size: var(--font-size-xs);
    color: var(--color-error, #dc3545);
  }

  .unlink-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    background-color: transparent;
    color: var(--color-text-muted);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .unlink-btn:hover:not(:disabled) {
    color: var(--color-error, #dc3545);
    border-color: var(--color-error, #dc3545);
  }

  .unlink-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .playback-controls {
    display: flex;
    gap: var(--spacing-sm);
  }

  .play-btn {
    flex: 1;
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--color-success, #28a745);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .play-btn:hover {
    background-color: #218838;
  }

  .stop-btn {
    flex: 1;
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--color-error, #dc3545);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .stop-btn:hover {
    background-color: #c82333;
  }

  .unload-btn {
    padding: var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    background-color: var(--color-bg);
    color: var(--color-text-muted);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .unload-btn:hover:not(:disabled) {
    background-color: var(--color-surface);
    color: var(--color-text);
  }

  .unload-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .progress-info {
    text-align: center;
    padding: var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  .time-display {
    font-size: var(--font-size-md);
    font-weight: 500;
    font-family: monospace;
    color: var(--color-text);
  }
</style>
