/**
 * YouTube State Store - Svelte 5 Runes
 *
 * Manages the YouTube player instance and playback state,
 * including sync with the note highway transport.
 */

import {
  loadYouTubeAPI,
  createYouTubePlayer,
  isYouTubeAPILoaded,
  getYouTubeErrorMessage,
} from '../services/youtubePlayer.js';

export interface YouTubeState {
  isApiLoaded: boolean;
  isApiLoading: boolean;
  isPlayerReady: boolean;
  isPlaying: boolean;
  currentTime: number; // seconds
  duration: number; // seconds
  videoId: string | null;
  error: string | null;
  isEmbeddable: boolean;
  volume: number; // 0-100
  isMuted: boolean;
}

const DEFAULT_STATE: YouTubeState = {
  isApiLoaded: false,
  isApiLoading: false,
  isPlayerReady: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  videoId: null,
  error: null,
  isEmbeddable: true,
  volume: 100,
  isMuted: false,
};

function createYouTubeState() {
  let state = $state<YouTubeState>({ ...DEFAULT_STATE });
  let player: YT.Player | null = null;
  let syncIntervalId: number | null = null;
  let timeUpdateCallback: ((time: number) => void) | null = null;

  return {
    get state() {
      return state;
    },

    /** Initialize the YouTube IFrame API */
    async initAPI(): Promise<boolean> {
      if (state.isApiLoaded) return true;
      if (state.isApiLoading) return false;

      state.isApiLoading = true;
      state.error = null;

      try {
        await loadYouTubeAPI();
        state.isApiLoaded = true;
        state.isApiLoading = false;
        return true;
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to load YouTube API';
        state.isApiLoading = false;
        return false;
      }
    },

    /** Load a video into the player */
    async loadVideo(videoId: string, containerId: string): Promise<boolean> {
      // Ensure API is loaded
      if (!state.isApiLoaded) {
        const loaded = await this.initAPI();
        if (!loaded) return false;
      }

      // Dispose existing player
      if (player) {
        try {
          player.destroy();
        } catch {
          // Player may already be destroyed
        }
        player = null;
      }

      state.isPlayerReady = false;
      state.error = null;
      state.isEmbeddable = true;
      state.videoId = videoId;

      return new Promise((resolve) => {
        try {
          player = createYouTubePlayer(containerId, videoId, {
            onReady: (p) => {
              state.isPlayerReady = true;
              state.duration = p.getDuration();
              state.volume = p.getVolume();
              state.isMuted = p.isMuted();
              resolve(true);
            },
            onStateChange: (playerState) => {
              // Update playing state
              state.isPlaying = playerState === YT.PlayerState.PLAYING;

              // Check for video ended
              if (playerState === YT.PlayerState.ENDED) {
                state.isPlaying = false;
                this.stopSyncLoop();
              }
            },
            onError: (error) => {
              state.error = getYouTubeErrorMessage(error);
              state.isEmbeddable =
                error !== YT.PlayerError.NotAllowedEmbedded &&
                error !== YT.PlayerError.NotAllowedEmbedded2;
              state.isPlayerReady = false;
              resolve(false);
            },
          });
        } catch (error) {
          state.error = error instanceof Error ? error.message : 'Failed to create player';
          resolve(false);
        }
      });
    },

    /** Play the video */
    play() {
      if (player && state.isPlayerReady) {
        player.playVideo();
      }
    },

    /** Pause the video */
    pause() {
      if (player && state.isPlayerReady) {
        player.pauseVideo();
      }
    },

    /** Stop the video */
    stop() {
      if (player && state.isPlayerReady) {
        player.stopVideo();
        state.isPlaying = false;
      }
      this.stopSyncLoop();
    },

    /** Seek to a specific time in seconds */
    seekTo(timeSeconds: number) {
      if (player && state.isPlayerReady) {
        player.seekTo(Math.max(0, timeSeconds), true);
        state.currentTime = Math.max(0, timeSeconds);
      }
    },

    /** Get current playback time */
    getCurrentTime(): number {
      if (player && state.isPlayerReady) {
        return player.getCurrentTime();
      }
      return state.currentTime;
    },

    /** Set volume (0-100) */
    setVolume(volume: number) {
      const v = Math.max(0, Math.min(100, volume));
      if (player && state.isPlayerReady) {
        player.setVolume(v);
      }
      state.volume = v;
    },

    /** Mute the video */
    mute() {
      if (player && state.isPlayerReady) {
        player.mute();
      }
      state.isMuted = true;
    },

    /** Unmute the video */
    unmute() {
      if (player && state.isPlayerReady) {
        player.unMute();
      }
      state.isMuted = false;
    },

    /** Toggle mute state */
    toggleMute() {
      if (state.isMuted) {
        this.unmute();
      } else {
        this.mute();
      }
    },

    /** Start the sync loop for drift correction */
    startSyncLoop(onTimeUpdate: (time: number) => void, intervalMs = 250) {
      timeUpdateCallback = onTimeUpdate;

      if (syncIntervalId !== null) {
        clearInterval(syncIntervalId);
      }

      syncIntervalId = window.setInterval(() => {
        if (player && state.isPlayerReady && state.isPlaying) {
          const currentTime = player.getCurrentTime();
          state.currentTime = currentTime;
          timeUpdateCallback?.(currentTime);
        }
      }, intervalMs);
    },

    /** Stop the sync loop */
    stopSyncLoop() {
      if (syncIntervalId !== null) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
      }
      timeUpdateCallback = null;
    },

    /** Check and correct drift if needed */
    correctDrift(expectedTimeSec: number, maxDriftMs = 150): boolean {
      if (!player || !state.isPlayerReady || !state.isPlaying) return false;

      const actualTime = player.getCurrentTime();
      const driftMs = Math.abs(actualTime - expectedTimeSec) * 1000;

      if (driftMs > maxDriftMs) {
        player.seekTo(expectedTimeSec, true);
        return true;
      }

      return false;
    },

    /** Get the YouTube video URL for fallback */
    getVideoUrl(): string | null {
      if (!state.videoId) return null;
      return `https://www.youtube.com/watch?v=${state.videoId}`;
    },

    /** Dispose of the player and clean up */
    dispose() {
      this.stopSyncLoop();

      if (player) {
        try {
          player.destroy();
        } catch {
          // Player may already be destroyed
        }
        player = null;
      }

      state = { ...DEFAULT_STATE, isApiLoaded: state.isApiLoaded };
    },

    /** Reset to initial state */
    reset() {
      this.dispose();
      state = { ...DEFAULT_STATE };
    },
  };
}

export const youtubeState = createYouTubeState();
