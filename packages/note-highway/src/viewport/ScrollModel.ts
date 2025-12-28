/**
 * Scroll Model
 *
 * Handles the mapping between time and X coordinates.
 * The highway scrolls from right to left, with the judgment line
 * at a fixed position.
 */

import type { SessionTimeMs, asSessionTimeMs } from '@mlt/rhythm-core';
import type { ScrollConfig } from '../types.js';
import { DEFAULT_SCROLL_CONFIG, calculateScrollConfig } from '../constants.js';

export interface IScrollModel {
  // Configuration
  updateConfig(config: Partial<ScrollConfig>): void;
  getConfig(): ScrollConfig;

  // Setup from chart
  setFromMeasures(
    measuresAhead: number,
    measureDurationMs: number,
    viewportWidth: number,
    judgmentLineFraction: number
  ): void;

  // Coordinate conversion
  timeToX(timeMs: SessionTimeMs, currentTimeMs: SessionTimeMs): number;
  xToTime(x: number, currentTimeMs: SessionTimeMs): SessionTimeMs;

  // Visibility checks
  isTimeVisible(timeMs: SessionTimeMs, currentTimeMs: SessionTimeMs): boolean;
  getVisibleTimeRange(currentTimeMs: SessionTimeMs): {
    startMs: SessionTimeMs;
    endMs: SessionTimeMs;
  };

  // Judgment line
  getJudgmentLineX(viewportWidth: number, judgmentLineFraction: number): number;
}

/**
 * Create a scroll model instance.
 */
export function createScrollModel(
  config: Partial<ScrollConfig> = {},
  viewportWidth: number = 800
): IScrollModel {
  // Merge with defaults
  let scrollConfig: ScrollConfig = {
    ...DEFAULT_SCROLL_CONFIG,
    ...config,
  };

  /**
   * Update configuration.
   */
  function updateConfig(newConfig: Partial<ScrollConfig>): void {
    scrollConfig = { ...scrollConfig, ...newConfig };
  }

  /**
   * Get current configuration.
   */
  function getConfig(): ScrollConfig {
    return { ...scrollConfig };
  }

  /**
   * Set up scroll config from measure-based parameters.
   */
  function setFromMeasures(
    measuresAhead: number,
    measureDurationMs: number,
    vpWidth: number,
    judgmentLineFraction: number
  ): void {
    scrollConfig = calculateScrollConfig(
      measuresAhead,
      measureDurationMs,
      vpWidth,
      judgmentLineFraction,
      scrollConfig.msVisibleBehind
    );
  }

  /**
   * Get the X position of the judgment line.
   */
  function getJudgmentLineX(vpWidth: number, judgmentLineFraction: number): number {
    return vpWidth * judgmentLineFraction;
  }

  /**
   * Convert a time to X coordinate.
   *
   * Notes scroll from right to left:
   * - Future notes are to the right of judgment line
   * - Past notes are to the left of judgment line
   *
   * @param timeMs - Time to convert
   * @param currentTimeMs - Current session time (position of judgment line)
   * @returns X coordinate in pixels
   */
  function timeToX(timeMs: SessionTimeMs, currentTimeMs: SessionTimeMs): number {
    // Time difference from current time
    // Positive = future (to the right)
    // Negative = past (to the left)
    const timeDiffMs = timeMs - currentTimeMs;

    // Judgment line is at a fixed X position
    // We need to calculate based on current viewport width
    // For now, use a default calculation
    const { pixelsPerMs, msVisibleAhead, msVisibleBehind } = scrollConfig;

    // The judgment line is at the left portion of the viewport
    // Future time goes to the right
    // Calculate judgment line X based on behind/ahead ratio
    const totalMs = msVisibleBehind + msVisibleAhead;
    const judgmentFraction = msVisibleBehind / totalMs;
    const judgmentLineX = viewportWidth * judgmentFraction;

    // X = judgmentLineX + (timeDiff * pixelsPerMs)
    return judgmentLineX + timeDiffMs * pixelsPerMs;
  }

  /**
   * Convert an X coordinate to time.
   *
   * @param x - X coordinate in pixels
   * @param currentTimeMs - Current session time
   * @returns Time in milliseconds
   */
  function xToTime(x: number, currentTimeMs: SessionTimeMs): SessionTimeMs {
    const { pixelsPerMs, msVisibleAhead, msVisibleBehind } = scrollConfig;

    const totalMs = msVisibleBehind + msVisibleAhead;
    const judgmentFraction = msVisibleBehind / totalMs;
    const judgmentLineX = viewportWidth * judgmentFraction;

    const timeDiffMs = (x - judgmentLineX) / pixelsPerMs;
    return (currentTimeMs + timeDiffMs) as SessionTimeMs;
  }

  /**
   * Check if a time is within the visible range.
   */
  function isTimeVisible(timeMs: SessionTimeMs, currentTimeMs: SessionTimeMs): boolean {
    const { msVisibleAhead, msVisibleBehind } = scrollConfig;

    const timeDiff = timeMs - currentTimeMs;

    // Visible if within behind..ahead range
    return timeDiff >= -msVisibleBehind && timeDiff <= msVisibleAhead;
  }

  /**
   * Get the visible time range.
   */
  function getVisibleTimeRange(currentTimeMs: SessionTimeMs): {
    startMs: SessionTimeMs;
    endMs: SessionTimeMs;
  } {
    const { msVisibleAhead, msVisibleBehind } = scrollConfig;

    return {
      startMs: (currentTimeMs - msVisibleBehind) as SessionTimeMs,
      endMs: (currentTimeMs + msVisibleAhead) as SessionTimeMs,
    };
  }

  return {
    updateConfig,
    getConfig,
    setFromMeasures,
    timeToX,
    xToTime,
    isTimeVisible,
    getVisibleTimeRange,
    getJudgmentLineX,
  };
}
