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

import type {
  SessionTimeMs,
  ConductorConfig,
  ConductorState,
  ConductorMode,
  ConductorStateCallback,
  LatencyOffsets,
  AudioTimeSource,
  Unsubscribe,
} from '../types.js';
import { asSessionTimeMs } from '../types.js';
import { DEFAULT_CONDUCTOR_CONFIG } from '../constants.js';
import { createPlayheadTimeSource, type PlayheadTimeSource } from './PlayheadTimeSource.js';
import { createAudioTimeSource, type AudioTimeSourceInstance } from './AudioTimeSource.js';

export interface IConductor {
  // State
  readonly state: ConductorState;

  // Lifecycle
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  seek(timeMs: SessionTimeMs): void;

  // Time queries
  getCurrentTimeMs(): SessionTimeMs;
  getAdjustedTimeMs(offsetKey: keyof LatencyOffsets): SessionTimeMs;

  // Mode switching
  setMode(mode: ConductorMode): void;
  setAudioSource(source: AudioTimeSource): void;

  // Tempo
  setTempo(bpm: number): void;

  // Offsets
  setOffsets(offsets: Partial<LatencyOffsets>): void;

  // Subscription
  subscribe(callback: ConductorStateCallback): Unsubscribe;

  // Disposal
  dispose(): void;
}

/**
 * Create a new Conductor instance.
 *
 * @param config - Configuration options
 * @returns A Conductor instance
 */
export function createConductor(config: Partial<ConductorConfig> = {}): IConductor {
  // Merge with defaults
  const fullConfig: ConductorConfig = {
    ...DEFAULT_CONDUCTOR_CONFIG,
    ...config,
    offsets: {
      ...DEFAULT_CONDUCTOR_CONFIG.offsets,
      ...config.offsets,
    },
  };

  // State
  let currentMode: ConductorMode = fullConfig.mode;
  let tempo = fullConfig.initialTempo;
  let offsets: LatencyOffsets = { ...fullConfig.offsets };

  // Time sources
  let playheadSource: PlayheadTimeSource = createPlayheadTimeSource();
  let audioSource: AudioTimeSourceInstance | null = null;
  let externalAudioSource: AudioTimeSource | null = null;

  // Subscribers
  const subscribers: Set<ConductorStateCallback> = new Set();

  // Animation frame for state updates
  let animationFrameId: number | null = null;
  let lastNotifiedTimeMs: SessionTimeMs = asSessionTimeMs(0);

  /**
   * Get the active time source based on current mode.
   */
  function getActiveTimeSource(): PlayheadTimeSource | AudioTimeSourceInstance {
    if (currentMode === 'audio-led' && audioSource) {
      return audioSource;
    }
    return playheadSource;
  }

  /**
   * Get current session time.
   */
  function getCurrentTimeMs(): SessionTimeMs {
    return getActiveTimeSource().getCurrentTimeMs();
  }

  /**
   * Get time adjusted by a specific latency offset.
   *
   * @param offsetKey - Which offset to apply
   * @returns Adjusted time
   */
  function getAdjustedTimeMs(offsetKey: keyof LatencyOffsets): SessionTimeMs {
    const baseTime = getCurrentTimeMs();
    const offset = offsets[offsetKey];
    return asSessionTimeMs(baseTime + offset);
  }

  /**
   * Build current state object.
   */
  function getState(): ConductorState {
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
  function notifySubscribers(): void {
    const state = getState();
    subscribers.forEach(cb => cb(state));
  }

  /**
   * Animation loop for continuous state updates.
   */
  function tick(): void {
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
  function startAnimationLoop(): void {
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(tick);
    }
  }

  /**
   * Stop the animation loop.
   */
  function stopAnimationLoop(): void {
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
  function start(): void {
    getActiveTimeSource().start();
    startAnimationLoop();
    notifySubscribers();
  }

  /**
   * Stop the conductor and reset.
   */
  function stop(): void {
    stopAnimationLoop();
    getActiveTimeSource().stop();
    lastNotifiedTimeMs = asSessionTimeMs(0);
    notifySubscribers();
  }

  /**
   * Pause the conductor.
   */
  function pause(): void {
    getActiveTimeSource().pause();
    stopAnimationLoop();
    notifySubscribers();
  }

  /**
   * Resume from pause.
   */
  function resume(): void {
    getActiveTimeSource().resume();
    startAnimationLoop();
    notifySubscribers();
  }

  /**
   * Seek to a specific time.
   */
  function seek(timeMs: SessionTimeMs): void {
    getActiveTimeSource().seek(timeMs);
    lastNotifiedTimeMs = timeMs;
    notifySubscribers();
  }

  /**
   * Switch conductor mode.
   */
  function setMode(mode: ConductorMode): void {
    if (mode === currentMode) return;

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
  function setAudioSource(source: AudioTimeSource): void {
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
  function setTempo(bpm: number): void {
    tempo = Math.max(1, bpm);
    notifySubscribers();
  }

  /**
   * Update latency offsets.
   */
  function setOffsets(newOffsets: Partial<LatencyOffsets>): void {
    offsets = { ...offsets, ...newOffsets };
  }

  /**
   * Subscribe to state changes.
   */
  function subscribe(callback: ConductorStateCallback): Unsubscribe {
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
  function dispose(): void {
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
