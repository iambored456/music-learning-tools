/**
 * @mlt/handoff - Converter
 *
 * Converts between Student Notation state and Singing Trainer snapshot format.
 * Handles the translation of coordinate systems and data structures.
 */
import { SNAPSHOT_SCHEMA_VERSION } from './types.js';
// ============================================================================
// Helper: Calculate Microbeat Count
// ============================================================================
/**
 * Calculate the total number of microbeat columns from macrobeat groupings.
 *
 * @param groupings Array of macrobeat groupings (2 or 3)
 * @returns Total microbeat count
 */
export function calculateMicrobeatCount(groupings) {
    return groupings.reduce((sum, g) => sum + g, 0);
}
/**
 * Calculate microbeats per macrobeat.
 * Returns the most common grouping value.
 *
 * @param groupings Array of macrobeat groupings
 * @returns Most common grouping (defaults to 2 if empty)
 */
export function calculateMicrobeatsPerMacrobeat(groupings) {
    if (groupings.length === 0) {
        return 2;
    }
    const count2 = groupings.filter(g => g === 2).length;
    const count3 = groupings.filter(g => g === 3).length;
    return count3 > count2 ? 3 : 2;
}
// ============================================================================
// Helper: Get MIDI from Row
// ============================================================================
/**
 * Get MIDI pitch number from row index.
 *
 * @param row Row index (relative to visible range)
 * @param fullRowData Full pitch gamut
 * @param pitchRange Current pitch viewport
 * @returns MIDI number or -1 if not found
 */
export function getMidiFromRow(row, fullRowData, pitchRange) {
    // Row 0 = top of visible range = pitchRange.topIndex
    const globalRow = pitchRange.topIndex + row;
    if (globalRow < 0 || globalRow >= fullRowData.length) {
        return -1;
    }
    const pitchData = fullRowData[globalRow];
    return pitchData?.midi ?? -1;
}
/**
 * Get pitch name from row index.
 *
 * @param row Row index (relative to visible range)
 * @param fullRowData Full pitch gamut
 * @param pitchRange Current pitch viewport
 * @returns Pitch name (e.g., "C4") or "Unknown"
 */
export function getPitchNameFromRow(row, fullRowData, pitchRange) {
    const globalRow = pitchRange.topIndex + row;
    if (globalRow < 0 || globalRow >= fullRowData.length) {
        return 'Unknown';
    }
    const pitchData = fullRowData[globalRow];
    return pitchData?.toneNote ?? 'Unknown';
}
/**
 * Get clef wheel selection as a MIDI range.
 *
 * @param fullRowData Full pitch gamut
 * @param pitchRange Current pitch viewport
 * @returns MIDI range or null if unavailable
 */
export function getClefPitchRange(fullRowData, pitchRange) {
    const top = fullRowData[pitchRange.topIndex];
    const bottom = fullRowData[pitchRange.bottomIndex];
    const topMidi = top?.midi;
    const bottomMidi = bottom?.midi;
    if (typeof topMidi !== 'number' || typeof bottomMidi !== 'number') {
        return null;
    }
    return {
        minMidi: Math.min(topMidi, bottomMidi),
        maxMidi: Math.max(topMidi, bottomMidi),
    };
}
// ============================================================================
// Main Converter: Student Notation → Snapshot
// ============================================================================
/**
 * Convert Student Notation state to a Singing Trainer snapshot.
 *
 * @param state Student Notation state
 * @param sourceFileId Optional file identifier
 * @returns Singing Trainer snapshot
 */
export function convertToSnapshot(state, sourceFileId, options = {}) {
    // Filter out drum notes - only pitch notes go to Singing Trainer
    const pitchNotes = state.placedNotes.filter(note => !note.isDrum);
    // Group notes by color (voice)
    const voiceMap = new Map();
    for (const note of pitchNotes) {
        const color = note.color;
        if (!voiceMap.has(color)) {
            voiceMap.set(color, []);
        }
        voiceMap.get(color).push(note);
    }
    // Convert each voice
    const voices = [];
    let minMidi = Infinity;
    let maxMidi = -Infinity;
    for (const [color, notes] of voiceMap) {
        const snapshotNotes = [];
        for (const note of notes) {
            const midi = getMidiFromRow(note.row, state.fullRowData, state.pitchRange);
            const pitchName = getPitchNameFromRow(note.row, state.fullRowData, state.pitchRange);
            // Track min/max MIDI for viewport hints
            if (midi > 0) {
                minMidi = Math.min(minMidi, midi);
                maxMidi = Math.max(maxMidi, midi);
            }
            snapshotNotes.push({
                startMicrobeatCol: note.startColumnIndex,
                endMicrobeatCol: note.endColumnIndex,
                midiPitch: midi,
                pitchName,
                shape: note.shape,
            });
        }
        // Sort notes by start column for consistency
        snapshotNotes.sort((a, b) => a.startMicrobeatCol - b.startMicrobeatCol);
        voices.push({
            voiceId: color, // Use color as voice ID
            color,
            notes: snapshotNotes,
        });
    }
    // Build time grid structure
    const timeGrid = {
        microbeatCount: calculateMicrobeatCount(state.macrobeatGroupings),
        microbeatsPerMacrobeat: calculateMicrobeatsPerMacrobeat(state.macrobeatGroupings),
        macrobeatGroupings: [...state.macrobeatGroupings],
        macrobeatBoundaryStyles: [...state.macrobeatBoundaryStyles],
    };
    // Convert annotations to visual overlays (if present)
    const visualOverlays = [];
    if (state.annotations && Array.isArray(state.annotations)) {
        for (const annotation of state.annotations) {
            // For now, include raw annotation data with pixel coordinate warning
            visualOverlays.push({
                type: 'freehand', // TODO: detect actual type
                id: annotation.id ?? `overlay-${Date.now()}`,
                data: annotation,
                coordinateSystem: 'pixel', // WARNING: May not survive zoom
            });
        }
    }
    const clefPitchRange = options.includeClefPitchRange === false
        ? null
        : getClefPitchRange(state.fullRowData, state.pitchRange);
    const snapshot = {
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        createdAt: Date.now(),
        sourceFileId,
        sourceApp: 'student-notation',
        timeGrid,
        voices,
        tempo: state.tempo,
        minMidiPitch: minMidi === Infinity ? undefined : minMidi,
        maxMidiPitch: maxMidi === -Infinity ? undefined : maxMidi,
    };
    if (clefPitchRange) {
        snapshot.clefPitchRange = clefPitchRange;
    }
    if (options.preferredPitchRangeSource) {
        snapshot.preferredPitchRangeSource = options.preferredPitchRangeSource;
    }
    // Only include overlays if there are any
    if (visualOverlays.length > 0) {
        snapshot.visualOverlays = visualOverlays;
    }
    return snapshot;
}
// ============================================================================
// Reverse Converter: Snapshot → Student Notation Format
// ============================================================================
/**
 * Convert a snapshot back to Student Notation note format.
 * Used when bringing data back from Singing Trainer.
 *
 * @param snapshot The snapshot to convert
 * @param fullRowData Full pitch gamut for row lookup
 * @param pitchRange Current pitch viewport
 * @returns Array of notes in Student Notation format
 */
export function convertFromSnapshot(snapshot, fullRowData, pitchRange) {
    const notes = [];
    // Build MIDI to row lookup
    const midiToGlobalRow = new Map();
    fullRowData.forEach((pitch, index) => {
        if (pitch.midi !== undefined) {
            midiToGlobalRow.set(pitch.midi, index);
        }
    });
    for (const voice of snapshot.voices) {
        for (const snapshotNote of voice.notes) {
            const globalRow = midiToGlobalRow.get(snapshotNote.midiPitch);
            if (globalRow === undefined) {
                // Pitch not found in gamut, skip
                continue;
            }
            // Convert global row to visible row
            const row = globalRow - pitchRange.topIndex;
            notes.push({
                uuid: crypto.randomUUID(),
                row,
                globalRow,
                startColumnIndex: snapshotNote.startMicrobeatCol,
                endColumnIndex: snapshotNote.endMicrobeatCol,
                shape: snapshotNote.shape,
                color: voice.color,
                isDrum: false,
            });
        }
    }
    return notes;
}
