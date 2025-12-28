/**
 * @mlt/handoff - Validation
 *
 * Validates snapshots for Singing Trainer import.
 * Enforces monophonic requirements within each voice.
 */
import type { SingingTrainerSnapshot, SnapshotNote, SnapshotVoice, OverlapConflict, ValidationResult } from './types.js';
/**
 * Check if two notes overlap in time.
 *
 * OVERLAP RULE (per spec):
 * - Endpoints are considered inclusive.
 * - If one note ends at column X and another starts at column X, this IS an overlap.
 * - This prevents "touching" notes from being valid.
 *
 * Example: Note A ends at 12, Note B starts at 12 → OVERLAP (columns 12 is shared)
 *
 * @param note1 First note
 * @param note2 Second note
 * @returns True if notes overlap
 */
export declare function notesOverlap(note1: SnapshotNote, note2: SnapshotNote): boolean;
/**
 * Get the columns where two notes overlap.
 *
 * @param note1 First note
 * @param note2 Second note
 * @returns Array of column indices where overlap occurs
 */
export declare function getOverlapColumns(note1: SnapshotNote, note2: SnapshotNote): number[];
/**
 * Validate a single voice for monophonic requirements.
 *
 * Rules:
 * 1. No two notes may overlap in time within the same voice.
 * 2. Chords (multiple notes at same start time) are disallowed.
 *
 * @param voice The voice to validate
 * @returns Array of conflicts found (empty if valid)
 */
export declare function validateVoiceMonophonic(voice: SnapshotVoice): OverlapConflict[];
/**
 * Format a conflict into a human-readable message.
 *
 * @param conflict The overlap conflict
 * @returns Formatted error message
 */
export declare function formatConflictMessage(conflict: OverlapConflict): string;
/**
 * Validate a complete snapshot for Singing Trainer import.
 *
 * Checks:
 * 1. All voices must be monophonic (no overlaps within a voice).
 * 2. Schema version must be supported.
 * 3. Required fields must be present.
 *
 * Note: Polyphony ACROSS voices is allowed (multiple voices can overlap).
 *
 * @param snapshot The snapshot to validate
 * @returns Validation result with conflicts and error messages
 */
export declare function validateSnapshot(snapshot: SingingTrainerSnapshot): ValidationResult;
/**
 * Validate and provide a summary for UI display.
 *
 * @param snapshot The snapshot to validate
 * @returns Object with validation status and formatted summary
 */
export declare function validateForExport(snapshot: SingingTrainerSnapshot): {
    isValid: boolean;
    summary: string;
    details: ValidationResult;
};
//# sourceMappingURL=validation.d.ts.map