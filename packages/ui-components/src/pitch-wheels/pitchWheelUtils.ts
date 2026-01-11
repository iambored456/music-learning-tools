import type { PitchRowData } from '@mlt/types';
import type { WheelOption, PitchRangePreset } from './types.js';

const DEFAULT_MIN_SPAN = 7; // Default minimum span

function clampInt(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) {
		return min;
	}
	return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Computes the constrained top index for a wheel picker.
 * Ensures the top index doesn't get too close to the bottom index (maintains minimum span).
 *
 * @param currentBottomIndex - Current bottom wheel index
 * @param requestedTop - Requested top index
 * @param totalOptions - Total number of options
 * @param minSpan - Minimum span between top and bottom (default 7)
 * @returns Constrained top index
 */
export function computeConstrainedTopIndex(
	currentBottomIndex: number,
	requestedTop: number,
	totalOptions: number,
	minSpan = DEFAULT_MIN_SPAN
): number {
	const maxIndex = Math.max(0, totalOptions - 1);
	const bottomIndex = clampInt(currentBottomIndex, 0, maxIndex);
	const normalizedMinSpan = Math.max(1, Math.round(minSpan));
	const maxTop = Math.max(0, bottomIndex - (normalizedMinSpan - 1));
	return clampInt(requestedTop, 0, maxTop);
}

/**
 * Computes the constrained bottom index for a wheel picker.
 * Ensures the bottom index doesn't get too close to the top index (maintains minimum span).
 *
 * @param currentTopIndex - Current top wheel index
 * @param requestedBottom - Requested bottom index
 * @param totalOptions - Total number of options
 * @param minSpan - Minimum span between top and bottom (default 7)
 * @returns Constrained bottom index
 */
export function computeConstrainedBottomIndex(
	currentTopIndex: number,
	requestedBottom: number,
	totalOptions: number,
	minSpan = DEFAULT_MIN_SPAN
): number {
	const maxIndex = Math.max(0, totalOptions - 1);
	const topIndex = clampInt(currentTopIndex, 0, maxIndex);
	const normalizedMinSpan = Math.max(1, Math.round(minSpan));
	const minBottom = Math.min(maxIndex, topIndex + (normalizedMinSpan - 1));
	return clampInt(requestedBottom, minBottom, maxIndex);
}

/**
 * Converts PitchRowData array to WheelOption array for use in wheel pickers.
 *
 * @param pitchRowData - Array of pitch row data
 * @returns Array of wheel options
 */
export function createWheelOptions(pitchRowData: PitchRowData[]): WheelOption[] {
	return pitchRowData.map((row, index) => ({
		index,
		label: row.pitch,
		midi: row.midi,
		toneNote: row.toneNote,
		frequency: row.frequency
	}));
}

/**
 * Finds the index of a pitch by MIDI number in the pitch data array.
 *
 * @param pitchData - Array of pitch row data
 * @param midiNumber - MIDI note number to find
 * @returns Index of the pitch, or 0 if not found
 */
function findMidiIndex(pitchData: readonly PitchRowData[], midiNumber: number): number {
	const index = pitchData.findIndex((p) => p.midi === midiNumber);
	return index >= 0 ? index : 0;
}

/**
 * Creates voice range presets for singing applications.
 * Voice I: A3 to A5 (MIDI 57-81)
 * Voice II: C3 to C5 (MIDI 48-72)
 * Voice III: E2 to E4 (MIDI 40-64)
 *
 * @param pitchData - Array of pitch row data (should be 88-key piano range)
 * @returns Array of voice preset configurations
 */
export function createVoicePresets(pitchData: readonly PitchRowData[]): PitchRangePreset[] {
	return [
		{
			label: 'Voice I',
			topIndex: findMidiIndex(pitchData, 81), // A5
			bottomIndex: findMidiIndex(pitchData, 57) // A3
		},
		{
			label: 'Voice II',
			topIndex: findMidiIndex(pitchData, 72), // C5
			bottomIndex: findMidiIndex(pitchData, 48) // C3
		},
		{
			label: 'Voice III',
			topIndex: findMidiIndex(pitchData, 64), // E4
			bottomIndex: findMidiIndex(pitchData, 40) // E2
		}
	];
}

/**
 * Creates standard clef range presets for notation applications.
 * Full Range: A0 to C8
 * Treble: C4 to G5 (MIDI 60-79)
 * Alto: D3 to A4 (MIDI 62-69)
 * Bass: E2 to C4 (MIDI 40-60)
 *
 * @param pitchData - Array of pitch row data (should be 88-key piano range)
 * @returns Array of clef preset configurations
 */
export function createRangePresets(pitchData: readonly PitchRowData[]): PitchRangePreset[] {
	return [
		{
			label: 'Full Range',
			topIndex: 0,
			bottomIndex: Math.max(0, pitchData.length - 1)
		},
		{
			label: 'Treble',
			topIndex: findMidiIndex(pitchData, 79), // G5
			bottomIndex: findMidiIndex(pitchData, 60) // C4
		},
		{
			label: 'Alto',
			topIndex: findMidiIndex(pitchData, 69), // A4
			bottomIndex: findMidiIndex(pitchData, 62) // D3
		},
		{
			label: 'Bass',
			topIndex: findMidiIndex(pitchData, 60), // C4
			bottomIndex: findMidiIndex(pitchData, 40) // E2
		}
	];
}
