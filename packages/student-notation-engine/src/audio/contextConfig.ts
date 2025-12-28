/**
 * Audio Context Configuration
 *
 * Utilities for configuring Tone.js AudioContext with optimal performance settings.
 *
 * Key settings:
 * - latencyHint: Controls the trade-off between latency and stability
 *   - "interactive": Lowest latency (default), best for real-time instruments
 *   - "playback": Prioritizes sustained playback stability
 *   - "balanced": Balance between latency and performance
 *   - number: Custom latency in seconds
 *
 * - lookAhead: How far in advance events are scheduled (default 0.1s)
 *   - Higher values = better stability, worse latency
 *   - Lower values = better latency, may cause glitches
 */

import * as Tone from 'tone';

/**
 * Standard Web Audio API latency hints
 */
export type LatencyHint = 'interactive' | 'playback' | 'balanced';

/**
 * Options for configuring the audio context
 */
export interface ContextOptions {
  /**
   * Latency hint for the audio context.
   * - "interactive": Low latency, may have glitches under load
   * - "playback": Stable playback, higher latency
   * - "balanced": Balance between latency and stability
   * @default "playback"
   */
  latencyHint?: LatencyHint;

  /**
   * How far in advance to schedule events (in seconds).
   * Higher values improve stability but increase latency.
   * @default 0.1
   */
  lookAhead?: number;
}

/**
 * Default context options optimized for playback applications
 */
export const DEFAULT_CONTEXT_OPTIONS: ContextOptions = {
  latencyHint: 'playback',
  lookAhead: 0.1
};

/**
 * Configure the Tone.js audio context with performance-optimized settings.
 *
 * IMPORTANT: This should be called early in app initialization, before any
 * audio nodes are created. If the context has already started, only lookAhead
 * can be adjusted.
 *
 * @param options - Configuration options
 * @returns true if a new context was created, false if existing context was configured
 *
 * @example
 * ```ts
 * // Call early in app startup
 * configureAudioContext({ latencyHint: 'playback' });
 *
 * // Later, after user gesture
 * await Tone.start();
 * ```
 */
export function configureAudioContext(options: ContextOptions = {}): boolean {
  const { latencyHint, lookAhead } = { ...DEFAULT_CONTEXT_OPTIONS, ...options };

  let createdNewContext = false;

  // Only create new context if the current one hasn't started yet
  // Once started, we can't replace the context without breaking existing audio nodes
  if (Tone.context.state === 'suspended') {
    try {
      // Cast latencyHint to satisfy Tone.js type expectations
      // The Web Audio API accepts these string values
      Tone.setContext(new Tone.Context({
        latencyHint: latencyHint as AudioContextLatencyCategory
      }));
      createdNewContext = true;
    } catch (error) {
      // Context creation can fail in some environments
      // Fall back to configuring the existing context
      console.warn('Failed to create new AudioContext, using default:', error);
    }
  }

  // lookAhead can be adjusted on any context
  if (lookAhead !== undefined) {
    Tone.context.lookAhead = lookAhead;
  }

  return createdNewContext;
}

/**
 * Get the current audio context state and configuration.
 * Useful for debugging and diagnostics.
 */
export function getContextInfo(): {
  state: AudioContextState;
  sampleRate: number;
  baseLatency: number | undefined;
  lookAhead: number;
} {
  // baseLatency is available on the raw AudioContext but not on Tone.Context wrapper
  const rawContext = Tone.context.rawContext;
  const baseLatency = rawContext && 'baseLatency' in rawContext
    ? (rawContext as AudioContext).baseLatency
    : undefined;

  return {
    state: Tone.context.state,
    sampleRate: Tone.context.sampleRate,
    baseLatency,
    lookAhead: Tone.context.lookAhead
  };
}
