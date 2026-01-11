/**
 * YouTube Player Service
 *
 * Manages the YouTube IFrame Player API for embedding and controlling
 * YouTube videos synchronized with the note highway.
 */
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
            CUED = 5
        }
        enum PlayerError {
            InvalidParam = 2,
            Html5Error = 5,
            VideoNotFound = 100,
            NotAllowedEmbedded = 101,
            NotAllowedEmbedded2 = 150
        }
        const Player: {
            new (elementId: string | HTMLElement, options: PlayerOptions): Player;
        };
    }
}
/**
 * Load the YouTube IFrame Player API script
 */
export declare function loadYouTubeAPI(): Promise<void>;
/**
 * Check if YouTube API is loaded
 */
export declare function isYouTubeAPILoaded(): boolean;
/**
 * Create a YouTube player instance
 */
export declare function createYouTubePlayer(elementId: string, videoId: string, options?: {
    width?: number;
    height?: number;
    onReady?: (player: YT.Player) => void;
    onStateChange?: (state: YT.PlayerState) => void;
    onError?: (error: YT.PlayerError) => void;
}): YT.Player;
/**
 * Get human-readable error message for YouTube player errors
 */
export declare function getYouTubeErrorMessage(error: YT.PlayerError): string;
/**
 * Get player state name for debugging
 */
export declare function getPlayerStateName(state: YT.PlayerState): string;
