/**
 * Audio Time Source
 *
 * Provides time synchronized with an external audio source.
 * This can be Tone.Transport, an AudioContext, or any other
 * audio timing source.
 *
 * In audio-led mode, the session time follows the audio playback
 * position, ensuring perfect sync between visuals and audio.
 */
import type { SessionTimeMs, AudioTimeSource as IAudioTimeSource, Unsubscribe } from '../types.js';
export interface AudioTimeSourceState {
    isRunning: boolean;
    isPaused: boolean;
    currentTimeMs: SessionTimeMs;
}
export interface AudioTimeSourceConfig {
    /** The external audio time source to sync with */
    audioSource: IAudioTimeSource;
    /** Offset to apply to audio time (for calibration) */
    offsetMs?: number;
}
/**
 * Creates an audio-led time source.
 *
 * In this mode, session time is derived from the audio playback position.
 * This ensures perfect synchronization between visuals and audio.
 *
 * The audio source must implement the AudioTimeSource interface,
 * which is a minimal abstraction that can wrap Tone.Transport,
 * AudioContext, or other audio timing systems.
 */
export declare function createAudioTimeSource(config: AudioTimeSourceConfig): {
    getCurrentTimeMs: () => SessionTimeMs;
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    seek: (_timeMs: SessionTimeMs) => void;
    isRunning: () => boolean;
    isPaused: () => boolean;
    getState: () => AudioTimeSourceState;
    onStateChange: (callback: (isPlaying: boolean) => void) => Unsubscribe;
    setOffset: (newOffsetMs: number) => void;
};
export type AudioTimeSourceInstance = ReturnType<typeof createAudioTimeSource>;
//# sourceMappingURL=AudioTimeSource.d.ts.map