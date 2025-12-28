/**
 * Chart Adapter
 *
 * Converts a SingingTrainerSnapshot (pitchGrid representation) into
 * time-based events that can be used by the rhythm system.
 *
 * Key responsibilities:
 * - Convert microbeat columns to milliseconds
 * - Skip tonic columns (they don't consume time)
 * - Extract beat and measure markers
 * - Identify short notes (16ths, triplets) for looser tolerance
 */
import { asSessionTimeMs } from '../types.js';
import { DEFAULT_CHART_ADAPTER_CONFIG, getMicrobeatDurationMs } from '../constants.js';
/**
 * Create a chart adapter instance.
 */
export function createChartAdapter(config = {}) {
    // Merge with defaults
    const fullConfig = {
        ...DEFAULT_CHART_ADAPTER_CONFIG,
        ...config,
    };
    let tempo = fullConfig.tempo;
    let chartData = null;
    // Cached time map: microbeat index -> start time in ms
    let timeMap = [];
    /**
     * Get the duration of one microbeat in milliseconds.
     */
    function getMicrobeatMs() {
        return getMicrobeatDurationMs(tempo);
    }
    /**
     * Build the time map from the grid structure.
     * Each microbeat column maps to a start time.
     * Tonic columns don't advance time.
     *
     * Note: In the snapshot format, tonic columns are already excluded
     * (the snapshot uses time-space, not canvas-space coordinates).
     */
    function buildTimeMap(microbeatCount) {
        timeMap = [];
        const microbeatMs = getMicrobeatMs();
        for (let i = 0; i <= microbeatCount; i++) {
            const timeMs = i * microbeatMs;
            timeMap.push(asSessionTimeMs(timeMs));
        }
    }
    /**
     * Convert a microbeat index to milliseconds.
     */
    function microbeatToMs(microbeatIndex) {
        if (timeMap.length === 0) {
            // Fallback calculation if no chart loaded
            return asSessionTimeMs(microbeatIndex * getMicrobeatMs());
        }
        // Clamp to valid range
        const idx = Math.max(0, Math.min(microbeatIndex, timeMap.length - 1));
        return timeMap[idx];
    }
    /**
     * Convert milliseconds to microbeat index (fractional).
     */
    function msToMicrobeatIndex(timeMs) {
        const microbeatMs = getMicrobeatMs();
        return timeMs / microbeatMs;
    }
    /**
     * Determine if a note is a "short note" (16th or triplet).
     * Short notes get looser pitch tolerance.
     *
     * In the snapshot format:
     * - 16th notes span 1 microbeat column (diamond shape typically)
     * - Triplets also span 1 column but are from triplet stamps
     * - Oval notes span 1 column (8th notes)
     * - Circle notes span 2 columns (quarter notes)
     *
     * We consider notes spanning ≤1 microbeat as "short".
     */
    function isShortNote(note) {
        const span = note.endMicrobeatCol - note.startMicrobeatCol + 1;
        // Diamond shapes are typically stamps (16ths)
        if (note.shape === 'diamond') {
            return true;
        }
        // Single-column notes are short
        if (span <= 1) {
            return true;
        }
        return false;
    }
    /**
     * Convert a snapshot note to a timed note.
     */
    function convertNote(note, voice, noteIndex) {
        const startTimeMs = microbeatToMs(note.startMicrobeatCol);
        // End time is the START of the column AFTER the note ends
        const endTimeMs = microbeatToMs(note.endMicrobeatCol + 1);
        const durationMs = endTimeMs - startTimeMs;
        return {
            id: `${voice.voiceId}-${noteIndex}`,
            midiPitch: note.midiPitch,
            startTimeMs,
            endTimeMs,
            durationMs,
            voiceId: voice.voiceId,
            color: voice.color,
            shape: note.shape,
            isShortNote: isShortNote(note),
            pitchName: note.pitchName,
        };
    }
    /**
     * Build beat markers from the time grid structure.
     */
    function buildBeats(timeGrid) {
        const beats = [];
        let microbeatIndex = 0;
        // Track measure boundaries
        let isNextMeasureStart = true;
        for (let macrobeatIdx = 0; macrobeatIdx < timeGrid.macrobeatGroupings.length; macrobeatIdx++) {
            const grouping = timeGrid.macrobeatGroupings[macrobeatIdx];
            const boundaryStyle = timeGrid.macrobeatBoundaryStyles[macrobeatIdx] || 'none';
            // Is this a measure start?
            const isMeasureStart = isNextMeasureStart;
            // Emit microbeats within this macrobeat
            for (let i = 0; i < grouping; i++) {
                const isMacrobeatStart = i === 0;
                beats.push({
                    index: microbeatIndex,
                    timeMs: microbeatToMs(microbeatIndex),
                    isMacrobeat: isMacrobeatStart,
                    isMeasureStart: isMacrobeatStart && isMeasureStart,
                    grouping,
                    boundaryStyle: isMacrobeatStart ? boundaryStyle : 'none',
                });
                microbeatIndex++;
            }
            // Next macrobeat is a measure start if current boundary is solid
            isNextMeasureStart = boundaryStyle === 'solid';
        }
        return beats;
    }
    /**
     * Load a snapshot and convert to chart data.
     */
    function loadSnapshot(snapshot) {
        // Update tempo if provided
        if (snapshot.tempo !== undefined) {
            tempo = snapshot.tempo;
        }
        // Build time map
        buildTimeMap(snapshot.timeGrid.microbeatCount);
        // Convert all notes
        const notes = [];
        const voiceIds = [];
        for (const voice of snapshot.voices) {
            voiceIds.push(voice.voiceId);
            for (let i = 0; i < voice.notes.length; i++) {
                const note = voice.notes[i];
                notes.push(convertNote(note, voice, i));
            }
        }
        // Sort notes by start time
        notes.sort((a, b) => a.startTimeMs - b.startTimeMs);
        // Build beat markers
        const beats = buildBeats(snapshot.timeGrid);
        // Calculate total duration
        const totalDurationMs = microbeatToMs(snapshot.timeGrid.microbeatCount);
        // Calculate pitch range
        let minMidiPitch = snapshot.minMidiPitch ?? 127;
        let maxMidiPitch = snapshot.maxMidiPitch ?? 0;
        if (minMidiPitch > maxMidiPitch) {
            // Calculate from notes if not provided
            for (const note of notes) {
                minMidiPitch = Math.min(minMidiPitch, note.midiPitch);
                maxMidiPitch = Math.max(maxMidiPitch, note.midiPitch);
            }
        }
        // If still no notes, use reasonable defaults
        if (minMidiPitch > maxMidiPitch) {
            minMidiPitch = 48; // C3
            maxMidiPitch = 72; // C5
        }
        chartData = {
            notes,
            beats,
            tonicIndicators: [], // TODO: Extract from snapshot if available
            totalDurationMs,
            voiceIds,
            tempo,
            minMidiPitch,
            maxMidiPitch,
        };
        return chartData;
    }
    /**
     * Get the loaded chart data.
     */
    function getChartData() {
        return chartData;
    }
    /**
     * Get notes within a time range.
     */
    function getNotesInRange(startMs, endMs) {
        if (!chartData)
            return [];
        return chartData.notes.filter(note => 
        // Note overlaps with range if it starts before range ends and ends after range starts
        note.startTimeMs < endMs && note.endTimeMs > startMs);
    }
    /**
     * Get beats within a time range.
     */
    function getBeatsInRange(startMs, endMs) {
        if (!chartData)
            return [];
        return chartData.beats.filter(beat => beat.timeMs >= startMs && beat.timeMs < endMs);
    }
    /**
     * Get all voice IDs in the chart.
     */
    function getVoiceIds() {
        return chartData?.voiceIds ?? [];
    }
    /**
     * Get notes for a specific voice.
     */
    function getNotesForVoice(voiceId) {
        if (!chartData)
            return [];
        return chartData.notes.filter(note => note.voiceId === voiceId);
    }
    /**
     * Set the tempo (for local adjustment).
     */
    function setTempo(newTempo) {
        tempo = Math.max(1, newTempo);
        // Rebuild time map if chart is loaded
        if (chartData) {
            buildTimeMap(chartData.beats.length > 0
                ? Math.max(...chartData.beats.map(b => b.index)) + 1
                : 0);
            // Update all note times
            // This would require re-converting all notes, which is expensive
            // For now, we'll just note that tempo changes should reload the chart
            console.warn('ChartAdapter: Tempo changed after load. Reload chart for accurate timing.');
        }
    }
    /**
     * Get current tempo.
     */
    function getTempo() {
        return tempo;
    }
    return {
        loadSnapshot,
        microbeatToMs,
        msToMicrobeatIndex,
        getChartData,
        getNotesInRange,
        getBeatsInRange,
        getVoiceIds,
        getNotesForVoice,
        setTempo,
        getTempo,
    };
}
