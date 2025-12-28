/**
 * Beat Window
 *
 * Emits beat events and tracks the current "beat window" state.
 * A beat window is a timing margin around each beat center where
 * actions are considered "on beat".
 *
 * Used for:
 * - Metronome ticks
 * - Visual beat emphasis
 * - Accompaniment scheduling
 */
import { asSessionTimeMs } from '../types.js';
import { DEFAULT_BEAT_WINDOW_CONFIG } from '../constants.js';
/**
 * Create a beat window instance.
 */
export function createBeatWindow(config = {}) {
    // Merge with defaults
    const fullConfig = {
        ...DEFAULT_BEAT_WINDOW_CONFIG,
        ...config,
    };
    let earlyMarginMs = fullConfig.earlyMarginMs;
    let lateMarginMs = fullConfig.lateMarginMs;
    // All beats in the chart
    let beats = [];
    // Subscribers for beat events
    const subscribers = new Set();
    // Track which beats have been emitted (to avoid duplicate events)
    const emittedBeats = new Set();
    // Track last processed time for detecting beat crossings
    let lastTickTimeMs = null;
    /**
     * Set the beats for this window.
     */
    function setBeats(newBeats) {
        beats = [...newBeats].sort((a, b) => a.timeMs - b.timeMs);
        emittedBeats.clear();
        lastTickTimeMs = null;
    }
    /**
     * Update configuration.
     */
    function setConfig(newConfig) {
        if (newConfig.earlyMarginMs !== undefined) {
            earlyMarginMs = newConfig.earlyMarginMs;
        }
        if (newConfig.lateMarginMs !== undefined) {
            lateMarginMs = newConfig.lateMarginMs;
        }
    }
    /**
     * Find the beat at or before a given time.
     */
    function getBeatAt(timeMs) {
        let result = null;
        for (const beat of beats) {
            if (beat.timeMs <= timeMs) {
                result = beat;
            }
            else {
                break;
            }
        }
        return result;
    }
    /**
     * Find the next beat after a given time.
     */
    function getNextBeat(afterTimeMs) {
        for (const beat of beats) {
            if (beat.timeMs > afterTimeMs) {
                return beat;
            }
        }
        return null;
    }
    /**
     * Get the current beat window state.
     */
    function getState(currentTimeMs) {
        const currentBeat = getBeatAt(currentTimeMs);
        const nextBeat = getNextBeat(currentTimeMs);
        // Check if we're in a beat window
        let inBeatWindow = false;
        let inEarlyWindow = false;
        let inLateWindow = false;
        if (currentBeat) {
            // Check late window of current beat
            const timeSinceBeat = currentTimeMs - currentBeat.timeMs;
            if (timeSinceBeat <= lateMarginMs) {
                inBeatWindow = true;
                inLateWindow = true;
            }
        }
        if (nextBeat) {
            // Check early window of next beat
            const timeToNext = nextBeat.timeMs - currentTimeMs;
            if (timeToNext <= earlyMarginMs) {
                inBeatWindow = true;
                inEarlyWindow = true;
            }
        }
        return {
            currentBeatIndex: currentBeat?.index ?? -1,
            inBeatWindow,
            inEarlyWindow,
            inLateWindow,
            msToNextBeat: nextBeat ? nextBeat.timeMs - currentTimeMs : null,
        };
    }
    /**
     * Subscribe to beat events.
     */
    function subscribeToBeat(callback) {
        subscribers.add(callback);
        return () => {
            subscribers.delete(callback);
        };
    }
    /**
     * Emit a beat event to all subscribers.
     */
    function emitBeatEvent(beat, currentTimeMs) {
        // Determine event type
        let type = 'microbeat';
        if (beat.isMeasureStart) {
            type = 'measure';
        }
        else if (beat.isMacrobeat) {
            type = 'macrobeat';
        }
        // Calculate window state
        const timeDiff = currentTimeMs - beat.timeMs;
        const inEarlyWindow = timeDiff < 0 && Math.abs(timeDiff) <= earlyMarginMs;
        const inLateWindow = timeDiff >= 0 && timeDiff <= lateMarginMs;
        const event = {
            type,
            index: beat.index,
            timeMs: beat.timeMs,
            inEarlyWindow,
            inLateWindow,
        };
        subscribers.forEach(cb => {
            try {
                cb(event);
            }
            catch (error) {
                console.error('BeatWindow: Error in beat callback', error);
            }
        });
    }
    /**
     * Process beat events for the current time.
     * Should be called regularly (e.g., every animation frame).
     */
    function tick(currentTimeMs) {
        // Find beats that should have triggered since last tick
        const startTimeMs = lastTickTimeMs ?? asSessionTimeMs(0);
        for (const beat of beats) {
            // Skip already emitted beats
            if (emittedBeats.has(beat.index)) {
                continue;
            }
            // Skip beats before our start time (already missed)
            if (beat.timeMs < startTimeMs) {
                continue;
            }
            // Emit if beat time has passed
            if (beat.timeMs <= currentTimeMs) {
                emittedBeats.add(beat.index);
                emitBeatEvent(beat, currentTimeMs);
            }
            else {
                // Beats are sorted, so we can stop here
                break;
            }
        }
        lastTickTimeMs = currentTimeMs;
    }
    /**
     * Reset the beat window state.
     */
    function reset() {
        emittedBeats.clear();
        lastTickTimeMs = null;
    }
    return {
        setBeats,
        setConfig,
        getState,
        getBeatAt,
        getNextBeat,
        subscribeToBeat,
        tick,
        reset,
    };
}
