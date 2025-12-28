/**
 * Pitch Matcher
 *
 * Calculates pitch tolerance and determines if a detected pitch
 * matches a target note within acceptable bounds.
 *
 * Features:
 * - Configurable tolerance in cents
 * - Different tolerance for short notes (looser)
 * - Calculates deviation from target
 */
import { CENTS_PER_SEMITONE, DEFAULT_JUDGE_CONFIG } from '../constants.js';
/**
 * Create a pitch matcher instance.
 */
export function createPitchMatcher(config = {}) {
    // Merge with defaults
    const fullConfig = {
        ...DEFAULT_JUDGE_CONFIG,
        ...config,
    };
    let defaultToleranceCents = fullConfig.defaultToleranceCents;
    let shortNoteToleranceCents = fullConfig.shortNoteToleranceCents;
    /**
     * Get the tolerance for a specific note.
     */
    function getToleranceForNote(note) {
        return note.isShortNote ? shortNoteToleranceCents : defaultToleranceCents;
    }
    /**
     * Get the default tolerance.
     */
    function getDefaultTolerance() {
        return defaultToleranceCents;
    }
    /**
     * Get the short note tolerance.
     */
    function getShortNoteTolerance() {
        return shortNoteToleranceCents;
    }
    /**
     * Calculate deviation in cents between two MIDI pitches.
     *
     * @param detectedMidi - Detected MIDI pitch (can be fractional)
     * @param targetMidi - Target MIDI pitch (integer)
     * @returns Deviation in cents (positive = sharp, negative = flat)
     */
    function calculateDeviationCents(detectedMidi, targetMidi) {
        // Each semitone is 100 cents
        const semitoneDiff = detectedMidi - targetMidi;
        return semitoneDiff * CENTS_PER_SEMITONE;
    }
    /**
     * Match a detected pitch to a target MIDI note.
     *
     * @param detectedMidi - Detected MIDI pitch (fractional)
     * @param targetMidi - Target MIDI note (integer)
     * @param isShortNote - Whether this is a short note (uses looser tolerance)
     * @returns Match result
     */
    function matchPitch(detectedMidi, targetMidi, isShortNote) {
        const deviationCents = calculateDeviationCents(detectedMidi, targetMidi);
        const absoluteDeviationCents = Math.abs(deviationCents);
        const toleranceCents = isShortNote ? shortNoteToleranceCents : defaultToleranceCents;
        const isMatch = absoluteDeviationCents <= toleranceCents;
        return {
            isMatch,
            deviationCents,
            absoluteDeviationCents,
            toleranceCents,
        };
    }
    /**
     * Match a pitch sample to a target note.
     *
     * @param sample - Pitch sample from microphone
     * @param targetNote - Target note to match against
     * @returns Match result
     */
    function match(sample, targetNote) {
        // If not voiced, it's definitely not a match
        if (!sample.isVoiced) {
            return {
                isMatch: false,
                deviationCents: 0,
                absoluteDeviationCents: Infinity,
                toleranceCents: getToleranceForNote(targetNote),
            };
        }
        return matchPitch(sample.midiPitch, targetNote.midiPitch, targetNote.isShortNote);
    }
    /**
     * Update configuration.
     */
    function setConfig(newConfig) {
        if (newConfig.defaultToleranceCents !== undefined) {
            defaultToleranceCents = newConfig.defaultToleranceCents;
        }
        if (newConfig.shortNoteToleranceCents !== undefined) {
            shortNoteToleranceCents = newConfig.shortNoteToleranceCents;
        }
    }
    return {
        match,
        matchPitch,
        getToleranceForNote,
        getDefaultTolerance,
        getShortNoteTolerance,
        setConfig,
    };
}
