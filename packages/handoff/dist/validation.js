/**
 * @mlt/handoff - Validation
 *
 * Validates snapshots for Singing Trainer import.
 * Enforces monophonic requirements within each voice.
 */
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
export function notesOverlap(note1, note2) {
    // Notes overlap if their ranges intersect (both endpoints inclusive)
    // No overlap only if one note entirely precedes the other
    const note1EndsBeforeNote2Starts = note1.endMicrobeatCol < note2.startMicrobeatCol;
    const note2EndsBeforeNote1Starts = note2.endMicrobeatCol < note1.startMicrobeatCol;
    // Overlap exists if neither note entirely precedes the other
    return !note1EndsBeforeNote2Starts && !note2EndsBeforeNote1Starts;
}
/**
 * Get the columns where two notes overlap.
 *
 * @param note1 First note
 * @param note2 Second note
 * @returns Array of column indices where overlap occurs
 */
export function getOverlapColumns(note1, note2) {
    const start = Math.max(note1.startMicrobeatCol, note2.startMicrobeatCol);
    const end = Math.min(note1.endMicrobeatCol, note2.endMicrobeatCol);
    if (start > end) {
        return [];
    }
    const columns = [];
    for (let col = start; col <= end; col++) {
        columns.push(col);
    }
    return columns;
}
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
export function validateVoiceMonophonic(voice) {
    const conflicts = [];
    const notes = voice.notes;
    // Compare each pair of notes
    for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
            const note1 = notes[i];
            const note2 = notes[j];
            if (notesOverlap(note1, note2)) {
                const conflictColumns = getOverlapColumns(note1, note2);
                conflicts.push({
                    voiceId: voice.voiceId,
                    color: voice.color,
                    conflictColumns,
                    note1: {
                        startMicrobeatCol: note1.startMicrobeatCol,
                        endMicrobeatCol: note1.endMicrobeatCol,
                        midiPitch: note1.midiPitch,
                    },
                    note2: {
                        startMicrobeatCol: note2.startMicrobeatCol,
                        endMicrobeatCol: note2.endMicrobeatCol,
                        midiPitch: note2.midiPitch,
                    },
                });
            }
        }
    }
    return conflicts;
}
/**
 * Format a conflict into a human-readable message.
 *
 * @param conflict The overlap conflict
 * @returns Formatted error message
 */
export function formatConflictMessage(conflict) {
    const note1Str = `Note 1: cols ${conflict.note1.startMicrobeatCol}-${conflict.note1.endMicrobeatCol}, MIDI ${conflict.note1.midiPitch}`;
    const note2Str = `Note 2: cols ${conflict.note2.startMicrobeatCol}-${conflict.note2.endMicrobeatCol}, MIDI ${conflict.note2.midiPitch}`;
    const colStr = conflict.conflictColumns.length === 1
        ? `column ${conflict.conflictColumns[0]}`
        : `columns ${conflict.conflictColumns[0]}-${conflict.conflictColumns[conflict.conflictColumns.length - 1]}`;
    return `Voice "${conflict.voiceId}" (${conflict.color}): Overlap at ${colStr}\n  ${note1Str}\n  ${note2Str}`;
}
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
export function validateSnapshot(snapshot) {
    const conflicts = [];
    const errorMessages = [];
    // Check schema version
    if (snapshot.schemaVersion !== 1) {
        errorMessages.push(`Unsupported schema version: ${snapshot.schemaVersion}. Expected: 1`);
    }
    // Check required fields
    if (!snapshot.timeGrid) {
        errorMessages.push('Missing required field: timeGrid');
    }
    if (!snapshot.voices || !Array.isArray(snapshot.voices)) {
        errorMessages.push('Missing or invalid field: voices');
    }
    if (snapshot.clefPitchRange) {
        const { minMidi, maxMidi } = snapshot.clefPitchRange;
        if (!Number.isFinite(minMidi) || !Number.isFinite(maxMidi)) {
            errorMessages.push('Invalid clefPitchRange: MIDI values must be finite numbers');
        }
        else if (minMidi > maxMidi) {
            errorMessages.push('Invalid clefPitchRange: minMidi exceeds maxMidi');
        }
    }
    // Validate each voice for monophonic requirements
    if (snapshot.voices) {
        for (const voice of snapshot.voices) {
            const voiceConflicts = validateVoiceMonophonic(voice);
            conflicts.push(...voiceConflicts);
        }
    }
    // Format conflict messages
    for (const conflict of conflicts) {
        errorMessages.push(formatConflictMessage(conflict));
    }
    return {
        isValid: conflicts.length === 0 && errorMessages.length === 0,
        conflicts,
        errorMessages,
    };
}
/**
 * Validate and provide a summary for UI display.
 *
 * @param snapshot The snapshot to validate
 * @returns Object with validation status and formatted summary
 */
export function validateForExport(snapshot) {
    const result = validateSnapshot(snapshot);
    if (result.isValid) {
        return {
            isValid: true,
            summary: 'Validation passed. Ready to export to Singing Trainer.',
            details: result,
        };
    }
    const voicesWithIssues = new Set(result.conflicts.map(c => c.voiceId));
    const summary = `Cannot export: ${result.conflicts.length} overlap(s) found in ${voicesWithIssues.size} voice(s).`;
    return {
        isValid: false,
        summary,
        details: result,
    };
}
