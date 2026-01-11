/**
 * YouTube Player Service
 *
 * Manages the YouTube IFrame Player API for embedding and controlling
 * YouTube videos synchronized with the note highway.
 */

// YouTube IFrame API types
declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }

  namespace YT {
    interface Player {
      playVideo(): void;
      pauseVideo(): void;
      stopVideo(): void;
      seekTo(seconds: number, allowSeekAhead?: boolean): void;
      getCurrentTime(): number;
      getDuration(): number;
      getPlayerState(): PlayerState;
      getVideoUrl(): string;
      destroy(): void;
      setVolume(volume: number): void;
      getVolume(): number;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
    }

    interface PlayerOptions {
      height?: string | number;
      width?: string | number;
      videoId?: string;
      playerVars?: PlayerVars;
      events?: PlayerEvents;
    }

    interface PlayerVars {
      autoplay?: 0 | 1;
      controls?: 0 | 1;
      disablekb?: 0 | 1;
      enablejsapi?: 0 | 1;
      fs?: 0 | 1;
      modestbranding?: 0 | 1;
      origin?: string;
      playsinline?: 0 | 1;
      rel?: 0 | 1;
      start?: number;
    }

    interface PlayerEvents {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
      onError?: (event: OnErrorEvent) => void;
    }

    interface PlayerEvent {
      target: Player;
    }

    interface OnStateChangeEvent {
      target: Player;
      data: PlayerState;
    }

    interface OnErrorEvent {
      target: Player;
      data: PlayerError;
    }

    enum PlayerState {
      UNSTARTED = -1,
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      BUFFERING = 3,
      CUED = 5,
    }

    enum PlayerError {
      InvalidParam = 2,
      Html5Error = 5,
      VideoNotFound = 100,
      NotAllowedEmbedded = 101,
      NotAllowedEmbedded2 = 150,
    }

    const Player: {
      new (elementId: string | HTMLElement, options: PlayerOptions): Player;
    };
  }
}

let apiLoadPromise: Promise<void> | null = null;
let isApiLoaded = false;

/**
 * Load the YouTube IFrame Player API script
 */
export function loadYouTubeAPI(): Promise<void> {
  // Return existing promise if already loading
  if (apiLoadPromise) return apiLoadPromise;

  // Already loaded
  if (isApiLoaded && window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  apiLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.YT && window.YT.Player) {
      isApiLoaded = true;
      resolve();
      return;
    }

    // Set up callback for when API is ready
    window.onYouTubeIframeAPIReady = () => {
      isApiLoaded = true;
      resolve();
    };

    // Create and inject the script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      reject(new Error('Failed to load YouTube IFrame API'));
    };

    document.head.appendChild(script);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!isApiLoaded) {
        reject(new Error('YouTube IFrame API load timeout'));
      }
    }, 10000);
  });

  return apiLoadPromise;
}

/**
 * Check if YouTube API is loaded
 */
export function isYouTubeAPILoaded(): boolean {
  return isApiLoaded && !!window.YT?.Player;
}

/**
 * Create a YouTube player instance
 */
export function createYouTubePlayer(
  elementId: string,
  videoId: string,
  options: {
    width?: number;
    height?: number;
    onReady?: (player: YT.Player) => void;
    onStateChange?: (state: YT.PlayerState) => void;
    onError?: (error: YT.PlayerError) => void;
  } = {}
): YT.Player {
  if (!isApiLoaded || !window.YT?.Player) {
    throw new Error('YouTube API not loaded. Call loadYouTubeAPI() first.');
  }

  const { width = 320, height = 180, onReady, onStateChange, onError } = options;

  return new window.YT.Player(elementId, {
    width,
    height,
    videoId,
    playerVars: {
      autoplay: 0,
      controls: 1,
      disablekb: 1, // Disable keyboard controls (we handle our own)
      enablejsapi: 1,
      fs: 0, // Disable fullscreen button
      modestbranding: 1,
      origin: window.location.origin,
      playsinline: 1,
      rel: 0, // Don't show related videos
    },
    events: {
      onReady: (event) => {
        onReady?.(event.target);
      },
      onStateChange: (event) => {
        onStateChange?.(event.data);
      },
      onError: (event) => {
        onError?.(event.data);
      },
    },
  });
}

/**
 * Get human-readable error message for YouTube player errors
 */
export function getYouTubeErrorMessage(error: YT.PlayerError): string {
  switch (error) {
    case YT.PlayerError.InvalidParam:
      return 'Invalid video ID';
    case YT.PlayerError.Html5Error:
      return 'HTML5 player error';
    case YT.PlayerError.VideoNotFound:
      return 'Video not found';
    case YT.PlayerError.NotAllowedEmbedded:
    case YT.PlayerError.NotAllowedEmbedded2:
      return 'Video cannot be embedded';
    default:
      return 'Unknown player error';
  }
}

/**
 * Get player state name for debugging
 */
export function getPlayerStateName(state: YT.PlayerState): string {
  switch (state) {
    case YT.PlayerState.UNSTARTED:
      return 'unstarted';
    case YT.PlayerState.ENDED:
      return 'ended';
    case YT.PlayerState.PLAYING:
      return 'playing';
    case YT.PlayerState.PAUSED:
      return 'paused';
    case YT.PlayerState.BUFFERING:
      return 'buffering';
    case YT.PlayerState.CUED:
      return 'cued';
    default:
      return 'unknown';
  }
}
