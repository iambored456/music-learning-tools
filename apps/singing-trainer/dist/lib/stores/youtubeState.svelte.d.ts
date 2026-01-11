/**
 * YouTube State Store - Svelte 5 Runes
 *
 * Manages the YouTube player instance and playback state,
 * including sync with the note highway transport.
 */
export interface YouTubeState {
    isApiLoaded: boolean;
    isApiLoading: boolean;
    isPlayerReady: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    videoId: string | null;
    error: string | null;
    isEmbeddable: boolean;
    volume: number;
    isMuted: boolean;
}
export declare const youtubeState: {
    readonly state: YouTubeState;
    /** Initialize the YouTube IFrame API */
    initAPI(): Promise<boolean>;
    /** Load a video into the player */
    loadVideo(videoId: string, containerId: string): Promise<boolean>;
    /** Play the video */
    play(): void;
    /** Pause the video */
    pause(): void;
    /** Stop the video */
    stop(): void;
    /** Seek to a specific time in seconds */
    seekTo(timeSeconds: number): void;
    /** Get current playback time */
    getCurrentTime(): number;
    /** Set volume (0-100) */
    setVolume(volume: number): void;
    /** Mute the video */
    mute(): void;
    /** Unmute the video */
    unmute(): void;
    /** Toggle mute state */
    toggleMute(): void;
    /** Start the sync loop for drift correction */
    startSyncLoop(onTimeUpdate: (time: number) => void, intervalMs?: number): void;
    /** Stop the sync loop */
    stopSyncLoop(): void;
    /** Check and correct drift if needed */
    correctDrift(expectedTimeSec: number, maxDriftMs?: number): boolean;
    /** Get the YouTube video URL for fallback */
    getVideoUrl(): string | null;
    /** Dispose of the player and clean up */
    dispose(): void;
    /** Reset to initial state */
    reset(): void;
};
