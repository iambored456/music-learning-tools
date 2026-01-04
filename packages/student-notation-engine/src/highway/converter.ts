/**
 * Highway Data Converter
 *
 * Converts Student Notation state data to Note Highway format.
 */

import type { HighwayTargetNote } from './types.js';

// ============================================================================
// Types for Student Notation Data
// ============================================================================

/**
 * Minimal PlacedNote interface from Student Notation.
 */
export interface PlacedNote {
  uuid?: string;
  row: number;
  globalRow?: number;
  startColumnIndex: number;
  endColumnIndex: number;
  shape: 'circle' | 'oval' | 'diamond';
  color: string;
  isDrum?: boolean;
}

/**
 * Configuration for the converter.
 */
export interface ConverterConfig {
  /** Tempo in BPM */
  tempo: number;
  /** Cell width in pixels */
  cellWidth: number;
  /** Time map: array where index = column, value = time in seconds */
  timeMap?: number[];
  /** Manual microbeat duration in seconds (if timeMap not provided) */
  microbeatDurationSec?: number;
}

// ============================================================================
// Converter Functions
// ============================================================================

/**
 * Calculate microbeat duration from tempo.
 * @param tempo Tempo in BPM
 * @returns Duration of one microbeat (eighth note) in seconds
 */
export function calculateMicrobeatDuration(tempo: number): number {
  // Each microbeat is an eighth note at the given tempo
  // Quarter note = 60/tempo seconds
  // Eighth note = (60/tempo) / 2
  const quarterNoteDuration = 60 / tempo;
  return quarterNoteDuration / 2;
}

/**
 * Convert a single PlacedNote to a HighwayTargetNote.
 */
export function convertNoteToHighway(
  note: PlacedNote,
  config: ConverterConfig
): HighwayTargetNote {
  const { timeMap, tempo, cellWidth } = config;

  let startTimeMs: number;
  let endTimeMs: number;

  if (timeMap && timeMap.length > 0) {
    // Use time map if available
    const startTimeSec = timeMap[note.startColumnIndex] ?? 0;
    const endTimeSec = timeMap[note.endColumnIndex] ?? startTimeSec;
    startTimeMs = startTimeSec * 1000;
    endTimeMs = endTimeSec * 1000;
  } else {
    // Fallback: calculate from tempo
    const microbeatDuration = config.microbeatDurationSec ?? calculateMicrobeatDuration(tempo);
    startTimeMs = note.startColumnIndex * microbeatDuration * 1000;
    endTimeMs = note.endColumnIndex * microbeatDuration * 1000;
  }

  const durationMs = endTimeMs - startTimeMs;

  // Get MIDI pitch from globalRow
  // fullRowData is ordered C8 (MIDI 108, index 0) to A0 (MIDI 21, index 87)
  const midi = note.globalRow !== undefined ? 108 - note.globalRow : 60; // Default to middle C if not available

  return {
    id: note.uuid ?? `note-${note.startColumnIndex}-${note.row}`,
    midi,
    startTimeMs,
    durationMs,
    startColumn: note.startColumnIndex,
    endColumn: note.endColumnIndex,
    color: note.color,
    shape: note.shape,
    globalRow: note.globalRow ?? note.row,
  };
}

/**
 * Convert an array of PlacedNotes to HighwayTargetNotes.
 * Filters out drum notes automatically.
 */
export function convertNotesToHighway(
  notes: PlacedNote[],
  config: ConverterConfig
): HighwayTargetNote[] {
  // Filter out drum notes
  const pitchNotes = notes.filter(note => !note.isDrum);

  // Convert each note
  return pitchNotes.map(note => convertNoteToHighway(note, config));
}

/**
 * Create a simple time map from column widths.
 * Useful when timeMapCalculator is not available.
 */
export function createSimpleTimeMap(
  columnWidths: number[],
  microbeatDurationSec: number
): number[] {
  const timeMap: number[] = [0];
  let currentTime = 0;

  for (let i = 0; i < columnWidths.length; i++) {
    const width = columnWidths[i] ?? 1;
    currentTime += width * microbeatDurationSec;
    timeMap.push(currentTime);
  }

  return timeMap;
}

/**
 * Helper to get default highway configuration from Student Notation state.
 */
export interface StudentNotationState {
  placedNotes: PlacedNote[];
  tempo: number;
  cellWidth: number;
  columnWidths?: number[];
  fullRowData?: Array<{ toneNote: string; midi?: number }>;
}

/**
 * Convert Student Notation state to Highway target notes.
 * This is a convenience function that handles all the conversion logic.
 */
export function convertStateToHighway(
  state: StudentNotationState,
  timeMap?: number[]
): HighwayTargetNote[] {
  const microbeatDuration = calculateMicrobeatDuration(state.tempo);

  const config: ConverterConfig = {
    tempo: state.tempo,
    cellWidth: state.cellWidth,
    timeMap,
    microbeatDurationSec: microbeatDuration,
  };

  return convertNotesToHighway(state.placedNotes, config);
}
