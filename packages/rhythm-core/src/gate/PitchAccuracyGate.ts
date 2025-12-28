/**
 * Pitch Accuracy Gate
 *
 * Controls playhead advancement based on pitch accuracy.
 * When enabled, the gate can pause playback if the singer
 * fails to maintain accurate pitch for too long.
 *
 * Features:
 * - Configurable grace period before gating
 * - Smooth UX by allowing brief inaccuracies
 * - Resume detection when accuracy is restored
 */

import type {
  SessionTimeMs,
  GateConfig,
  GateState,
  GateStateCallback,
  Unsubscribe,
} from '../types.js';
import { asSessionTimeMs } from '../types.js';
import { DEFAULT_GATE_CONFIG } from '../constants.js';

export interface IGateCheckResult {
  /** Should the playhead pause? */
  shouldPause: boolean;
  /** Should the playhead resume (if currently paused)? */
  shouldResume: boolean;
  /** Current gate state */
  state: GateState;
}

export interface IPitchAccuracyGate {
  // Configuration
  setConfig(config: Partial<GateConfig>): void;
  getConfig(): GateConfig;
  enable(): void;
  disable(): void;
  isEnabled(): boolean;

  // State
  getState(): GateState;

  // Accuracy input
  reportAccuracy(isInTolerance: boolean, timeMs: SessionTimeMs): void;

  // Gate control
  checkGate(currentTimeMs: SessionTimeMs): IGateCheckResult;
  forceRelease(): void;
  reset(): void;

  // Subscription
  subscribe(callback: GateStateCallback): Unsubscribe;
}

/**
 * Create a pitch accuracy gate instance.
 */
export function createPitchAccuracyGate(config: Partial<GateConfig> = {}): IPitchAccuracyGate {
  // Merge with defaults
  const fullConfig: GateConfig = {
    ...DEFAULT_GATE_CONFIG,
    ...config,
  };

  let gracePeriodMs = fullConfig.gracePeriodMs;
  let enabled = fullConfig.enabled;

  // Gate state
  let isGated = false;
  let inaccuracyStartMs: SessionTimeMs | null = null;
  let lastAccuracyReport: { isInTolerance: boolean; timeMs: SessionTimeMs } | null = null;

  // Subscribers
  const subscribers: Set<GateStateCallback> = new Set();

  /**
   * Get current gate state.
   */
  function getState(): GateState {
    const gracePeriodRemainingMs = inaccuracyStartMs !== null && lastAccuracyReport !== null
      ? Math.max(0, gracePeriodMs - (lastAccuracyReport.timeMs - inaccuracyStartMs))
      : gracePeriodMs;

    return {
      isGated,
      inaccuracyStartMs,
      gracePeriodRemainingMs,
    };
  }

  /**
   * Notify subscribers of state change.
   */
  function notifySubscribers(): void {
    const state = getState();
    subscribers.forEach(cb => {
      try {
        cb(state);
      } catch (error) {
        console.error('PitchAccuracyGate: Error in state callback', error);
      }
    });
  }

  /**
   * Update configuration.
   */
  function setConfig(newConfig: Partial<GateConfig>): void {
    if (newConfig.gracePeriodMs !== undefined) {
      gracePeriodMs = newConfig.gracePeriodMs;
    }
    if (newConfig.enabled !== undefined) {
      enabled = newConfig.enabled;
    }
  }

  /**
   * Get current configuration.
   */
  function getConfig(): GateConfig {
    return { gracePeriodMs, enabled };
  }

  /**
   * Enable the gate.
   */
  function enable(): void {
    enabled = true;
  }

  /**
   * Disable the gate.
   */
  function disable(): void {
    enabled = false;
    // Release if currently gated
    if (isGated) {
      isGated = false;
      inaccuracyStartMs = null;
      notifySubscribers();
    }
  }

  /**
   * Check if gate is enabled.
   */
  function isEnabled(): boolean {
    return enabled;
  }

  /**
   * Report current pitch accuracy.
   * Call this regularly with the result of pitch matching.
   */
  function reportAccuracy(isInTolerance: boolean, timeMs: SessionTimeMs): void {
    lastAccuracyReport = { isInTolerance, timeMs };

    if (!enabled) {
      return;
    }

    if (isInTolerance) {
      // Accuracy restored - reset inaccuracy tracking
      if (inaccuracyStartMs !== null) {
        inaccuracyStartMs = null;

        // If we were gated, release the gate
        if (isGated) {
          isGated = false;
          notifySubscribers();
        }
      }
    } else {
      // Inaccuracy detected
      if (inaccuracyStartMs === null) {
        // Start tracking inaccuracy
        inaccuracyStartMs = timeMs;
      }
    }
  }

  /**
   * Check if the gate should pause or resume playback.
   * Call this in the main loop to get pause/resume signals.
   */
  function checkGate(currentTimeMs: SessionTimeMs): IGateCheckResult {
    if (!enabled) {
      return {
        shouldPause: false,
        shouldResume: false,
        state: getState(),
      };
    }

    let shouldPause = false;
    let shouldResume = false;

    if (inaccuracyStartMs !== null) {
      // Check if grace period has expired
      const inaccuracyDuration = currentTimeMs - inaccuracyStartMs;

      if (inaccuracyDuration >= gracePeriodMs && !isGated) {
        // Grace period expired - engage gate
        isGated = true;
        shouldPause = true;
        notifySubscribers();
      }
    } else if (isGated) {
      // Accuracy restored while gated - release
      isGated = false;
      shouldResume = true;
      notifySubscribers();
    }

    return {
      shouldPause,
      shouldResume,
      state: getState(),
    };
  }

  /**
   * Force release the gate (e.g., for skip functionality).
   */
  function forceRelease(): void {
    if (isGated) {
      isGated = false;
      inaccuracyStartMs = null;
      notifySubscribers();
    }
  }

  /**
   * Reset gate state.
   */
  function reset(): void {
    isGated = false;
    inaccuracyStartMs = null;
    lastAccuracyReport = null;
    notifySubscribers();
  }

  /**
   * Subscribe to gate state changes.
   */
  function subscribe(callback: GateStateCallback): Unsubscribe {
    subscribers.add(callback);

    // Immediately notify with current state
    callback(getState());

    return () => {
      subscribers.delete(callback);
    };
  }

  return {
    setConfig,
    getConfig,
    enable,
    disable,
    isEnabled,
    getState,
    reportAccuracy,
    checkGate,
    forceRelease,
    reset,
    subscribe,
  };
}
