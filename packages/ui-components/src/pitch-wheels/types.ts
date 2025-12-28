import type { PitchRowData } from '@mlt/types';

/**
 * Option displayed in a wheel picker
 */
export interface WheelOption {
	index: number; // Position in full gamut
	label: string; // Display text (e.g., "C4")
	midi?: number; // MIDI note number
	toneNote?: string; // Tone.js format (e.g., "C4")
	frequency?: number; // Hz
}

/**
 * Range selected by the dual pitch wheels
 */
export interface PitchWheelRange {
	topIndex: number; // Index of highest pitch (lower number)
	bottomIndex: number; // Index of lowest pitch (higher number)
	topPitch: PitchRowData; // Pitch data for top of range
	bottomPitch: PitchRowData; // Pitch data for bottom of range
	span: number; // Number of pitches in range
}
