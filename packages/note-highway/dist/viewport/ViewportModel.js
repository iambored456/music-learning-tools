/**
 * Viewport Model
 *
 * Handles the mapping between MIDI pitch values and Y coordinates.
 * The viewport defines which pitch range is visible and how pitches
 * are positioned vertically.
 */
import { DEFAULT_VIEWPORT, calculateMidiRange } from '../constants.js';
/**
 * Create a viewport model instance.
 */
export function createViewportModel(config = {}) {
    // Merge with defaults
    const fullConfig = {
        ...DEFAULT_VIEWPORT,
        ...config,
    };
    let { width, height, minMidi, maxMidi, pitchMarginSemitones } = fullConfig;
    /**
     * Get the number of visible rows (semitones).
     */
    function getRowCount() {
        return maxMidi - minMidi + 1;
    }
    /**
     * Get the height of a single pitch row in pixels.
     */
    function getRowHeight() {
        return height / getRowCount();
    }
    /**
     * Convert MIDI pitch to Y coordinate.
     * Higher pitches are at the top (lower Y values).
     *
     * @param midi - MIDI pitch number (can be fractional)
     * @returns Y coordinate in pixels
     */
    function midiToY(midi) {
        // Invert: higher pitch = lower Y (top of screen)
        const rowHeight = getRowHeight();
        const rowsFromTop = maxMidi - midi;
        return rowsFromTop * rowHeight + rowHeight / 2;
    }
    /**
     * Convert Y coordinate to MIDI pitch.
     *
     * @param y - Y coordinate in pixels
     * @returns MIDI pitch (fractional)
     */
    function yToMidi(y) {
        const rowHeight = getRowHeight();
        const rowsFromTop = (y - rowHeight / 2) / rowHeight;
        return maxMidi - rowsFromTop;
    }
    /**
     * Update configuration.
     */
    function updateConfig(newConfig) {
        if (newConfig.width !== undefined)
            width = newConfig.width;
        if (newConfig.height !== undefined)
            height = newConfig.height;
        if (newConfig.minMidi !== undefined)
            minMidi = newConfig.minMidi;
        if (newConfig.maxMidi !== undefined)
            maxMidi = newConfig.maxMidi;
        if (newConfig.pitchMarginSemitones !== undefined) {
            pitchMarginSemitones = newConfig.pitchMarginSemitones;
        }
    }
    /**
     * Get current configuration.
     */
    function getConfig() {
        return { width, height, minMidi, maxMidi, pitchMarginSemitones };
    }
    /**
     * Set the MIDI range directly.
     */
    function setMidiRange(newMinMidi, newMaxMidi) {
        minMidi = Math.max(0, newMinMidi);
        maxMidi = Math.min(127, newMaxMidi);
        // Ensure min < max
        if (minMidi >= maxMidi) {
            maxMidi = minMidi + 1;
        }
    }
    /**
     * Calculate MIDI range from notes.
     */
    function calculateMidiRangeFromNotes(notes, marginSemitones) {
        const margin = marginSemitones ?? pitchMarginSemitones;
        const range = calculateMidiRange(notes, margin);
        setMidiRange(range.minMidi, range.maxMidi);
    }
    /**
     * Get the current visible MIDI range.
     */
    function getVisibleMidiRange() {
        return { minMidi, maxMidi };
    }
    return {
        updateConfig,
        getConfig,
        setMidiRange,
        calculateMidiRangeFromNotes,
        getVisibleMidiRange,
        midiToY,
        yToMidi,
        getRowHeight,
        getRowCount,
    };
}
