/**
 * Transport Sync Service
 *
 * Coordinates time synchronization between the note highway transport
 * and YouTube player. Handles offset calculations and drift correction.
 */

import type { YouTubeSyncConfig } from '../types/ultrastar.js';

export interface TransportSyncOptions {
  /** Sync configuration from Ultrastar metadata */
  syncConfig: YouTubeSyncConfig;
  /** Interval for checking drift (ms) */
  driftCheckIntervalMs?: number;
  /** Maximum allowed drift before correction (ms) */
  maxDriftMs?: number;
}

export interface DriftCheckResult {
  /** Drift amount in milliseconds */
  driftMs: number;
  /** Whether drift exceeds threshold and needs correction */
  needsCorrection: boolean;
  /** Suggested corrected transport time (ms) */
  correctedTransportTimeMs?: number;
}

/**
 * Create a transport sync coordinator
 */
export function createTransportSync(options: TransportSyncOptions) {
  let config = { ...options.syncConfig };
  const driftCheckIntervalMs = options.driftCheckIntervalMs ?? 250;
  const maxDriftMs = options.maxDriftMs ?? 150;

  /**
   * Calculate the total YouTube offset in seconds
   * youtubeOffset = (GAP_ms/1000) + VIDEOGAP_sec + manualOffset
   */
  function getYouTubeOffset(): number {
    return config.gapMs / 1000 + config.videoGapSec + config.manualOffsetSec;
  }

  /**
   * Convert transport time (ms) to YouTube time (seconds)
   * When transport is at 0, YouTube should be at youtubeOffset
   */
  function transportToYouTube(transportTimeMs: number): number {
    return transportTimeMs / 1000 + getYouTubeOffset();
  }

  /**
   * Convert YouTube time (seconds) to transport time (ms)
   */
  function youTubeToTransport(youtubeTimeSec: number): number {
    return (youtubeTimeSec - getYouTubeOffset()) * 1000;
  }

  /**
   * Check drift between expected and actual YouTube time
   */
  function checkDrift(
    transportTimeMs: number,
    youtubeTimeSec: number
  ): DriftCheckResult {
    const expectedYouTubeTime = transportToYouTube(transportTimeMs);
    const driftSec = youtubeTimeSec - expectedYouTubeTime;
    const driftMs = Math.abs(driftSec * 1000);

    if (driftMs > maxDriftMs) {
      // Calculate corrected transport time based on actual YouTube position
      const correctedTransportTimeMs = youTubeToTransport(youtubeTimeSec);
      return {
        driftMs,
        needsCorrection: true,
        correctedTransportTimeMs,
      };
    }

    return {
      driftMs,
      needsCorrection: false,
    };
  }

  /**
   * Update sync configuration
   */
  function updateConfig(partial: Partial<YouTubeSyncConfig>) {
    config = { ...config, ...partial };
  }

  /**
   * Adjust manual offset by a delta
   */
  function adjustManualOffset(deltaSec: number) {
    config.manualOffsetSec += deltaSec;
  }

  /**
   * Reset manual offset to zero
   */
  function resetManualOffset() {
    config.manualOffsetSec = 0;
  }

  /**
   * Get the current manual offset
   */
  function getManualOffset(): number {
    return config.manualOffsetSec;
  }

  /**
   * Get total offset in seconds
   */
  function getTotalOffset(): number {
    return getYouTubeOffset();
  }

  /**
   * Format offset for display (e.g., "+0.15s" or "-0.30s")
   */
  function formatOffset(): string {
    const offset = config.manualOffsetSec;
    const sign = offset >= 0 ? '+' : '';
    return `${sign}${offset.toFixed(2)}s`;
  }

  /**
   * Get configuration for creating sync loop
   */
  function getSyncLoopConfig() {
    return {
      intervalMs: driftCheckIntervalMs,
      maxDriftMs,
    };
  }

  return {
    // Getters
    getYouTubeOffset,
    getTotalOffset,
    getManualOffset,
    getSyncLoopConfig,

    // Conversion
    transportToYouTube,
    youTubeToTransport,

    // Drift handling
    checkDrift,

    // Configuration
    updateConfig,
    adjustManualOffset,
    resetManualOffset,

    // Formatting
    formatOffset,

    // Get current config (for persistence)
    getConfig: () => ({ ...config }),
  };
}

/** Type for the transport sync instance */
export type TransportSyncInstance = ReturnType<typeof createTransportSync>;
