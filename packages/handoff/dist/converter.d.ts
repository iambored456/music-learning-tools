/**
 * @mlt/handoff - Converter
 *
 * Converts between Student Notation state and Singing Trainer snapshot format.
 * Handles the translation of coordinate systems and data structures.
 */
import type { SingingTrainerSnapshot, SnapshotPitchRange, PitchRangeSource } from './types.js';
/**
 * Minimal interface for Student Notation placed note.
 * This mirrors the PlacedNote type from @mlt/types.
 */
export interface StudentNotationNote {
    uuid?: string;
    row: number;
    globalRow?: number;
    startColumnIndex: number;
    endColumnIndex: number;
    shape: 'circle' | 'oval' | 'diamond';
    color: string;
    isDrum?: boolean;
    drumTrack?: number | string | null;
    tonicNumber?: number | null;
}
/**
 * Minimal interface for Student Notation pitch row data.
 */
export interface PitchRowData {
    toneNote: string;
    midi?: number;
    pitch?: string;
    frequency?: number;
}
/**
 * Minimal interface for Student Notation state.
 */
export interface StudentNotationState {
    placedNotes: StudentNotationNote[];
    macrobeatGroupings: (2 | 3)[];
    macrobeatBoundaryStyles: ('dashed' | 'solid' | 'anacrusis')[];
    fullRowData: PitchRowData[];
    pitchRange: {
        topIndex: number;
        bottomIndex: number;
    };
    tempo: number;
    annotations?: unknown[];
}
/**
 * Options for converting Student Notation state to a snapshot.
 */
export interface SnapshotConversionOptions {
    /** Include clef wheel selection as a range hint (default: true) */
    includeClefPitchRange?: boolean;
    /** Optional preference for which range source to use on import */
    preferredPitchRangeSource?: PitchRangeSource;
}
/**
 * Calculate the total number of microbeat columns from macrobeat groupings.
 *
 * @param groupings Array of macrobeat groupings (2 or 3)
 * @returns Total microbeat count
 */
export declare function calculateMicrobeatCount(groupings: (2 | 3)[]): number;
/**
 * Calculate microbeats per macrobeat.
 * Returns the most common grouping value.
 *
 * @param groupings Array of macrobeat groupings
 * @returns Most common grouping (defaults to 2 if empty)
 */
export declare function calculateMicrobeatsPerMacrobeat(groupings: (2 | 3)[]): number;
/**
 * Get MIDI pitch number from row index.
 *
 * @param row Row index (relative to visible range)
 * @param fullRowData Full pitch gamut
 * @param pitchRange Current pitch viewport
 * @returns MIDI number or -1 if not found
 */
export declare function getMidiFromRow(row: number, fullRowData: PitchRowData[], pitchRange: {
    topIndex: number;
    bottomIndex: number;
}): number;
/**
 * Get pitch name from row index.
 *
 * @param row Row index (relative to visible range)
 * @param fullRowData Full pitch gamut
 * @param pitchRange Current pitch viewport
 * @returns Pitch name (e.g., "C4") or "Unknown"
 */
export declare function getPitchNameFromRow(row: number, fullRowData: PitchRowData[], pitchRange: {
    topIndex: number;
    bottomIndex: number;
}): string;
/**
 * Get clef wheel selection as a MIDI range.
 *
 * @param fullRowData Full pitch gamut
 * @param pitchRange Current pitch viewport
 * @returns MIDI range or null if unavailable
 */
export declare function getClefPitchRange(fullRowData: PitchRowData[], pitchRange: {
    topIndex: number;
    bottomIndex: number;
}): SnapshotPitchRange | null;
/**
 * Convert Student Notation state to a Singing Trainer snapshot.
 *
 * @param state Student Notation state
 * @param sourceFileId Optional file identifier
 * @returns Singing Trainer snapshot
 */
export declare function convertToSnapshot(state: StudentNotationState, sourceFileId?: string, options?: SnapshotConversionOptions): SingingTrainerSnapshot;
/**
 * Convert a snapshot back to Student Notation note format.
 * Used when bringing data back from Singing Trainer.
 *
 * @param snapshot The snapshot to convert
 * @param fullRowData Full pitch gamut for row lookup
 * @param pitchRange Current pitch viewport
 * @returns Array of notes in Student Notation format
 */
export declare function convertFromSnapshot(snapshot: SingingTrainerSnapshot, fullRowData: PitchRowData[], pitchRange: {
    topIndex: number;
    bottomIndex: number;
}): StudentNotationNote[];
//# sourceMappingURL=converter.d.ts.map