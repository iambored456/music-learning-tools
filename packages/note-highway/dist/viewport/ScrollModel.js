/**
 * Scroll Model
 *
 * Handles the mapping between time and X coordinates.
 * The highway scrolls from right to left, with the judgment line
 * at a fixed position.
 */
import { DEFAULT_SCROLL_CONFIG, calculateScrollConfig } from '../constants.js';
/**
 * Create a scroll model instance.
 */
export function createScrollModel(config = {}, viewportWidth = 800) {
    // Merge with defaults
    let scrollConfig = {
        ...DEFAULT_SCROLL_CONFIG,
        ...config,
    };
    /**
     * Update configuration.
     */
    function updateConfig(newConfig) {
        scrollConfig = { ...scrollConfig, ...newConfig };
    }
    /**
     * Get current configuration.
     */
    function getConfig() {
        return { ...scrollConfig };
    }
    /**
     * Set up scroll config from measure-based parameters.
     */
    function setFromMeasures(measuresAhead, measureDurationMs, vpWidth, judgmentLineFraction) {
        scrollConfig = calculateScrollConfig(measuresAhead, measureDurationMs, vpWidth, judgmentLineFraction, scrollConfig.msVisibleBehind);
    }
    /**
     * Get the X position of the judgment line.
     */
    function getJudgmentLineX(vpWidth, judgmentLineFraction) {
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
    function timeToX(timeMs, currentTimeMs) {
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
    function xToTime(x, currentTimeMs) {
        const { pixelsPerMs, msVisibleAhead, msVisibleBehind } = scrollConfig;
        const totalMs = msVisibleBehind + msVisibleAhead;
        const judgmentFraction = msVisibleBehind / totalMs;
        const judgmentLineX = viewportWidth * judgmentFraction;
        const timeDiffMs = (x - judgmentLineX) / pixelsPerMs;
        return (currentTimeMs + timeDiffMs);
    }
    /**
     * Check if a time is within the visible range.
     */
    function isTimeVisible(timeMs, currentTimeMs) {
        const { msVisibleAhead, msVisibleBehind } = scrollConfig;
        const timeDiff = timeMs - currentTimeMs;
        // Visible if within behind..ahead range
        return timeDiff >= -msVisibleBehind && timeDiff <= msVisibleAhead;
    }
    /**
     * Get the visible time range.
     */
    function getVisibleTimeRange(currentTimeMs) {
        const { msVisibleAhead, msVisibleBehind } = scrollConfig;
        return {
            startMs: (currentTimeMs - msVisibleBehind),
            endMs: (currentTimeMs + msVisibleAhead),
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
