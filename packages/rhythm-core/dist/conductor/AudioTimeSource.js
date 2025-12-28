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
import { asSessionTimeMs } from '../types.js';
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
export function createAudioTimeSource(config) {
    const { audioSource, offsetMs = 0 } = config;
    let isStarted = false;
    let stateChangeUnsubscribe = null;
    // Store callbacks for state changes
    const stateChangeCallbacks = new Set();
    /**
     * Get the current session time from the audio source.
     */
    function getCurrentTimeMs() {
        if (!isStarted) {
            return asSessionTimeMs(0);
        }
        // Convert audio time (seconds) to session time (ms)
        const audioSeconds = audioSource.getCurrentTimeSeconds();
        const timeMs = audioSeconds * 1000 + offsetMs;
        return asSessionTimeMs(Math.max(0, timeMs));
    }
    /**
     * Start syncing with the audio source.
     */
    function start() {
        isStarted = true;
        // Subscribe to audio source state changes if available
        if (audioSource.onStateChange && !stateChangeUnsubscribe) {
            stateChangeUnsubscribe = audioSource.onStateChange((isPlaying) => {
                stateChangeCallbacks.forEach(cb => cb(isPlaying));
            });
        }
    }
    /**
     * Stop syncing with the audio source.
     */
    function stop() {
        isStarted = false;
        if (stateChangeUnsubscribe) {
            stateChangeUnsubscribe();
            stateChangeUnsubscribe = null;
        }
    }
    /**
     * Pause is handled by the audio source itself.
     * This is a no-op since we follow the audio source's state.
     */
    function pause() {
        // Audio-led mode follows the audio source
        // Pause should be triggered on the audio source directly
    }
    /**
     * Resume is handled by the audio source itself.
     */
    function resume() {
        // Audio-led mode follows the audio source
        // Resume should be triggered on the audio source directly
    }
    /**
     * Seek is handled by the audio source itself.
     */
    function seek(_timeMs) {
        // Audio-led mode follows the audio source
        // Seek should be triggered on the audio source directly
    }
    /**
     * Check if we're synced to the audio source.
     */
    function isRunning() {
        return isStarted;
    }
    /**
     * Check if the audio source is paused.
     */
    function isPaused() {
        return isStarted && !audioSource.isPlaying();
    }
    /**
     * Get the current state.
     */
    function getState() {
        return {
            isRunning: isRunning(),
            isPaused: isPaused(),
            currentTimeMs: getCurrentTimeMs(),
        };
    }
    /**
     * Subscribe to state changes from the audio source.
     */
    function onStateChange(callback) {
        stateChangeCallbacks.add(callback);
        return () => {
            stateChangeCallbacks.delete(callback);
        };
    }
    /**
     * Update the offset (for calibration).
     */
    function setOffset(newOffsetMs) {
        config.offsetMs = newOffsetMs;
    }
    return {
        getCurrentTimeMs,
        start,
        stop,
        pause,
        resume,
        seek,
        isRunning,
        isPaused,
        getState,
        onStateChange,
        setOffset,
    };
}
