import type { PitchRowData } from '@mlt/types';
import type { WheelOption } from './types.js';

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
