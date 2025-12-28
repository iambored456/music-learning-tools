/**
 * Conductor
 *
 * The authoritative time source for the entire rhythm system.
 * All timing-dependent components derive their time from the Conductor.
 *
 * Supports two modes:
 * - 'playhead-led': Time advances based on wall clock (default)
 * - 'audio-led': Time follows audio playback position
 *
 * The Conductor maintains:
 * - Current session time
 * - Tempo
 * - Play/pause/seek state
 * - Latency offsets for compensation
 */
import { asSessionTimeMs } from '../types.js';
import { DEFAULT_CONDUCTOR_CONFIG } from '../constants.js';
import { createPlayheadTimeSource } from './PlayheadTimeSource.js';
import { createAudioTimeSource } from './AudioTimeSource.js';
/**
 * Create a new Conductor instance.
 *
 * @param config - Configuration options
 * @returns A Conductor instance
 */
export function createConductor(config = {}) {
    // Merge with defaults
    const fullConfig = {
        ...DEFAULT_CONDUCTOR_CONFIG,
        ...config,
        offsets: {
            ...DEFAULT_CONDUCTOR_CONFIG.offsets,
            ...config.offsets,
        },
    };
    // State
    let currentMode = fullConfig.mode;
    let tempo = fullConfig.initialTempo;
    let offsets = { ...fullConfig.offsets };
    // Time sources
    let playheadSource = createPlayheadTimeSource();
    let audioSource = null;
    let externalAudioSource = null;
    // Subscribers
    const subscribers = new Set();
    // Animation frame for state updates
    let animationFrameId = null;
    let lastNotifiedTimeMs = asSessionTimeMs(0);
    /**
     * Get the active time source based on current mode.
     */
    function getActiveTimeSource() {
        if (currentMode === 'audio-led' && audioSource) {
            return audioSource;
        }
        return playheadSource;
    }
    /**
     * Get current session time.
     */
    function getCurrentTimeMs() {
        return getActiveTimeSource().getCurrentTimeMs();
    }
    /**
     * Get time adjusted by a specific latency offset.
     *
     * @param offsetKey - Which offset to apply
     * @returns Adjusted time
     */
    function getAdjustedTimeMs(offsetKey) {
        const baseTime = getCurrentTimeMs();
        const offset = offsets[offsetKey];
        return asSessionTimeMs(baseTime + offset);
    }
    /**
     * Build current state object.
     */
    function getState() {
        const source = getActiveTimeSource();
        return {
            currentTimeMs: source.getCurrentTimeMs(),
            isRunning: source.isRunning(),
            isPaused: source.isPaused(),
            tempo,
            mode: currentMode,
        };
    }
    /**
     * Notify all subscribers of state change.
     */
    function notifySubscribers() {
        const state = getState();
        subscribers.forEach(cb => cb(state));
    }
    /**
     * Animation loop for continuous state updates.
     */
    function tick() {
        const currentTime = getCurrentTimeMs();
        // Only notify if time has changed meaningfully (1ms threshold)
        if (Math.abs(currentTime - lastNotifiedTimeMs) >= 1) {
            lastNotifiedTimeMs = currentTime;
            notifySubscribers();
        }
        if (getActiveTimeSource().isRunning() && !getActiveTimeSource().isPaused()) {
            animationFrameId = requestAnimationFrame(tick);
        }
    }
    /**
     * Start the animation loop.
     */
    function startAnimationLoop() {
        if (animationFrameId === null) {
            animationFrameId = requestAnimationFrame(tick);
        }
    }
    /**
     * Stop the animation loop.
     */
    function stopAnimationLoop() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
    // ============================================================================
    // Public API
    // ============================================================================
    /**
     * Start the conductor.
     */
    function start() {
        getActiveTimeSource().start();
        startAnimationLoop();
        notifySubscribers();
    }
    /**
     * Stop the conductor and reset.
     */
    function stop() {
        stopAnimationLoop();
        getActiveTimeSource().stop();
        lastNotifiedTimeMs = asSessionTimeMs(0);
        notifySubscribers();
    }
    /**
     * Pause the conductor.
     */
    function pause() {
        getActiveTimeSource().pause();
        stopAnimationLoop();
        notifySubscribers();
    }
    /**
     * Resume from pause.
     */
    function resume() {
        getActiveTimeSource().resume();
        startAnimationLoop();
        notifySubscribers();
    }
    /**
     * Seek to a specific time.
     */
    function seek(timeMs) {
        getActiveTimeSource().seek(timeMs);
        lastNotifiedTimeMs = timeMs;
        notifySubscribers();
    }
    /**
     * Switch conductor mode.
     */
    function setMode(mode) {
        if (mode === currentMode)
            return;
        const wasRunning = getActiveTimeSource().isRunning();
        const wasPaused = getActiveTimeSource().isPaused();
        const currentTime = getCurrentTimeMs();
        // Stop current source
        if (wasRunning) {
            getActiveTimeSource().stop();
        }
        currentMode = mode;
        // Start new source at same position
        if (wasRunning) {
            getActiveTimeSource().start();
            getActiveTimeSource().seek(currentTime);
            if (wasPaused) {
                getActiveTimeSource().pause();
            }
        }
        notifySubscribers();
    }
    /**
     * Set the external audio source for audio-led mode.
     */
    function setAudioSource(source) {
        externalAudioSource = source;
        audioSource = createAudioTimeSource({
            audioSource: source,
            offsetMs: 0,
        });
        // If we're in audio-led mode and running, sync up
        if (currentMode === 'audio-led' && playheadSource.isRunning()) {
            audioSource.start();
        }
    }
    /**
     * Set tempo.
     */
    function setTempo(bpm) {
        tempo = Math.max(1, bpm);
        notifySubscribers();
    }
    /**
     * Update latency offsets.
     */
    function setOffsets(newOffsets) {
        offsets = { ...offsets, ...newOffsets };
    }
    /**
     * Subscribe to state changes.
     */
    function subscribe(callback) {
        subscribers.add(callback);
        // Immediately notify with current state
        callback(getState());
        return () => {
            subscribers.delete(callback);
        };
    }
    /**
     * Clean up resources.
     */
    function dispose() {
        stopAnimationLoop();
        subscribers.clear();
        if (audioSource) {
            audioSource.stop();
        }
        playheadSource.stop();
    }
    // Return public interface
    return {
        get state() {
            return getState();
        },
        start,
        stop,
        pause,
        resume,
        seek,
        getCurrentTimeMs,
        getAdjustedTimeMs,
        setMode,
        setAudioSource,
        setTempo,
        setOffsets,
        subscribe,
        dispose,
    };
}
