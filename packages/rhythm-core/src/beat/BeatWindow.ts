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

import type {
  SessionTimeMs,
  TimedBeat,
  BeatWindowConfig,
  BeatEvent,
  BeatEventType,
  BeatEventCallback,
  Unsubscribe,
} from '../types.js';
import { asSessionTimeMs } from '../types.js';
import { DEFAULT_BEAT_WINDOW_CONFIG } from '../constants.js';

export interface BeatWindowState {
  /** Current beat index (or -1 if before first beat) */
  currentBeatIndex: number;
  /** Whether we're currently in a beat window */
  inBeatWindow: boolean;
  /** Whether we're in the early part of the window */
  inEarlyWindow: boolean;
  /** Whether we're in the late part of the window */
  inLateWindow: boolean;
  /** Time until next beat (ms, or null if no more beats) */
  msToNextBeat: number | null;
}

export interface IBeatWindow {
  // Setup
  setBeats(beats: TimedBeat[]): void;
  setConfig(config: Partial<BeatWindowConfig>): void;

  // Queries
  getState(currentTimeMs: SessionTimeMs): BeatWindowState;
  getBeatAt(timeMs: SessionTimeMs): TimedBeat | null;
  getNextBeat(afterTimeMs: SessionTimeMs): TimedBeat | null;

  // Subscriptions
  subscribeToBeat(callback: BeatEventCallback): Unsubscribe;

  // Processing
  tick(currentTimeMs: SessionTimeMs): void;

  // Reset
  reset(): void;
}

/**
 * Create a beat window instance.
 */
export function createBeatWindow(config: Partial<BeatWindowConfig> = {}): IBeatWindow {
  // Merge with defaults
  const fullConfig: BeatWindowConfig = {
    ...DEFAULT_BEAT_WINDOW_CONFIG,
    ...config,
  };

  let earlyMarginMs = fullConfig.earlyMarginMs;
  let lateMarginMs = fullConfig.lateMarginMs;

  // All beats in the chart
  let beats: TimedBeat[] = [];

  // Subscribers for beat events
  const subscribers: Set<BeatEventCallback> = new Set();

  // Track which beats have been emitted (to avoid duplicate events)
  const emittedBeats: Set<number> = new Set();

  // Track last processed time for detecting beat crossings
  let lastTickTimeMs: SessionTimeMs | null = null;

  /**
   * Set the beats for this window.
   */
  function setBeats(newBeats: TimedBeat[]): void {
    beats = [...newBeats].sort((a, b) => a.timeMs - b.timeMs);
    emittedBeats.clear();
    lastTickTimeMs = null;
  }

  /**
   * Update configuration.
   */
  function setConfig(newConfig: Partial<BeatWindowConfig>): void {
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
  function getBeatAt(timeMs: SessionTimeMs): TimedBeat | null {
    let result: TimedBeat | null = null;

    for (const beat of beats) {
      if (beat.timeMs <= timeMs) {
        result = beat;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Find the next beat after a given time.
   */
  function getNextBeat(afterTimeMs: SessionTimeMs): TimedBeat | null {
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
  function getState(currentTimeMs: SessionTimeMs): BeatWindowState {
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
  function subscribeToBeat(callback: BeatEventCallback): Unsubscribe {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }

  /**
   * Emit a beat event to all subscribers.
   */
  function emitBeatEvent(beat: TimedBeat, currentTimeMs: SessionTimeMs): void {
    // Determine event type
    let type: BeatEventType = 'microbeat';
    if (beat.isMeasureStart) {
      type = 'measure';
    } else if (beat.isMacrobeat) {
      type = 'macrobeat';
    }

    // Calculate window state
    const timeDiff = currentTimeMs - beat.timeMs;
    const inEarlyWindow = timeDiff < 0 && Math.abs(timeDiff) <= earlyMarginMs;
    const inLateWindow = timeDiff >= 0 && timeDiff <= lateMarginMs;

    const event: BeatEvent = {
      type,
      index: beat.index,
      timeMs: beat.timeMs,
      inEarlyWindow,
      inLateWindow,
    };

    subscribers.forEach(cb => {
      try {
        cb(event);
      } catch (error) {
        console.error('BeatWindow: Error in beat callback', error);
      }
    });
  }

  /**
   * Process beat events for the current time.
   * Should be called regularly (e.g., every animation frame).
   */
  function tick(currentTimeMs: SessionTimeMs): void {
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
      } else {
        // Beats are sorted, so we can stop here
        break;
      }
    }

    lastTickTimeMs = currentTimeMs;
  }

  /**
   * Reset the beat window state.
   */
  function reset(): void {
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
