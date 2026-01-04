/**
 * @mlt/handoff - Snapshot Types
 *
 * Defines the data structures for cross-app handoff between Student Notation
 * and Singing Trainer. This is a COPY SNAPSHOT approach - not live sync.
 *
 * SCHEMA VERSION: 1
 * - Initial implementation with core note data and grid structure
 */

// ============================================================================
// Schema Version
// ============================================================================

export const SNAPSHOT_SCHEMA_VERSION = 1;

// ============================================================================
// Core Types
// ============================================================================

/**
 * A note event within a single voice/color.
 * Represents a monophonic note in the time grid.
 */
export interface SnapshotNote {
  /** Start position in microbeat columns (0-indexed, inclusive) */
  startMicrobeatCol: number;
  /** End position in microbeat columns (inclusive - occupies start through end) */
  endMicrobeatCol: number;
  /** MIDI pitch number (e.g., 60 = C4) */
  midiPitch: number;
  /** Original pitch name for display (e.g., "C4", "Bb3") */
  pitchName: string;
  /** Shape of the note for rendering */
  shape: 'circle' | 'oval' | 'diamond';
}

/**
 * A voice containing monophonic note events.
 * Multiple voices can overlap with each other (polyphony across voices).
 */
export interface SnapshotVoice {
  /** Unique identifier for the voice (typically the color) */
  voiceId: string;
  /** Display color for the voice (hex code) */
  color: string;
  /** Array of notes in this voice (must be monophonic - no overlaps within voice) */
  notes: SnapshotNote[];
}

/**
 * Describes the time grid structure.
 * Includes macrobeat groupings for visual rendering.
 */
export interface TimeGridStructure {
  /** Total number of microbeat columns */
  microbeatCount: number;
  /** Number of microbeats per macrobeat (explicit for redundancy) */
  microbeatsPerMacrobeat: number;
  /**
   * Array of macrobeat groupings (2 or 3 microbeats per macrobeat).
   * Each entry corresponds to one macrobeat.
   * Used to render grid lines:
   * - thin/no lines between microbeats
   * - solid lines between macrobeats
   * - thicker solid lines between measures
   */
  macrobeatGroupings: (2 | 3)[];
  /**
   * Boundary styles for each macrobeat.
   * 'dashed' = dashed line (e.g., between macrobeats within measure)
   * 'solid' = solid line (e.g., measure boundary)
   * 'anacrusis' = pickup measure boundary
   */
  macrobeatBoundaryStyles: ('dashed' | 'solid' | 'anacrusis')[];
}

/**
 * Optional visual overlay/annotation from Student Notation.
 * These are purely visual and do not affect app logic.
 *
 * WARNING: If stored in pixel coordinates, these may not survive zoom/scale changes.
 * Grid-relative coordinates are preferred.
 */
export interface VisualOverlay {
  /** Type of overlay */
  type: 'freehand' | 'text' | 'arrow';
  /** Unique identifier */
  id: string;
  /** Raw annotation data (varies by type) */
  data: unknown;
  /**
   * Coordinate system used.
   * 'pixel' = pixel coordinates (fragile under zoom)
   * 'grid' = grid-relative coordinates (preferred)
   */
  coordinateSystem: 'pixel' | 'grid';
}

/**
 * Optional pitch range hint for initializing a viewport.
 */
export interface SnapshotPitchRange {
  /** Lowest MIDI pitch in the range */
  minMidi: number;
  /** Highest MIDI pitch in the range */
  maxMidi: number;
}

/**
 * Preferred source for pitch range initialization.
 */
export type PitchRangeSource = 'notes' | 'clef';

/**
 * Tonal center information for drone and degree-based display.
 * Used to share key/tonic between Student Notation and Singing Trainer.
 */
export interface TonalCenter {
  /** Pitch class (e.g., "C", "C#", "Db", "F#") */
  pitchClass: string;
  /** Optional octave for drone purposes (e.g., 3, 4) */
  octave?: number;
  /** Optional mode (e.g., "major", "minor", "dorian") */
  mode?: string;
}

// ============================================================================
// Main Snapshot Type
// ============================================================================

/**
 * Complete snapshot for handoff between Student Notation and Singing Trainer.
 *
 * This contains all data needed to reconstruct the pitch grid and target notes
 * in the Singing Trainer.
 */
export interface SingingTrainerSnapshot {
  /** Schema version for forward compatibility */
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;

  /** Timestamp when snapshot was created */
  createdAt: number;

  /** Optional identifier for the source file */
  sourceFileId?: string;

  /** Source app that created the snapshot */
  sourceApp: 'student-notation' | 'singing-trainer';

  // --- Time Grid Structure ---
  timeGrid: TimeGridStructure;

  // --- Voice Data ---
  /** Array of voices, each containing monophonic notes */
  voices: SnapshotVoice[];

  // --- Optional Tempo ---
  /** Tempo in BPM (can be manipulated locally after import) */
  tempo?: number;

  // --- Pitch Range Hints ---
  /** Lowest MIDI pitch in the dataset (for viewport initialization) */
  minMidiPitch?: number;
  /** Highest MIDI pitch in the dataset (for viewport initialization) */
  maxMidiPitch?: number;
  /** Pitch range based on the clef wheel selection (optional) */
  clefPitchRange?: SnapshotPitchRange;
  /** Preferred source for pitch range initialization (optional) */
  preferredPitchRangeSource?: PitchRangeSource;

  // --- Visual Overlays (optional) ---
  /** Visual annotations that don't affect logic */
  visualOverlays?: VisualOverlay[];

  // --- Tonal Center (optional) ---
  /**
   * Tonal center for drone and degree-based display.
   * If provided, Singing Trainer can use this to initialize the drone pitch.
   */
  tonalCenter?: TonalCenter;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Represents an overlap conflict within a single voice.
 */
export interface OverlapConflict {
  /** The voice ID where the conflict occurs */
  voiceId: string;
  /** Display color of the voice */
  color: string;
  /** Microbeat columns where the conflict occurs */
  conflictColumns: number[];
  /** First conflicting note */
  note1: { startMicrobeatCol: number; endMicrobeatCol: number; midiPitch: number };
  /** Second conflicting note */
  note2: { startMicrobeatCol: number; endMicrobeatCol: number; midiPitch: number };
}

/**
 * Result of validating a snapshot for Singing Trainer import.
 */
export interface ValidationResult {
  /** Whether the snapshot is valid for import */
  isValid: boolean;
  /** Array of overlap conflicts (empty if valid) */
  conflicts: OverlapConflict[];
  /** Human-readable error messages */
  errorMessages: string[];
}

// ============================================================================
// Handoff Slot Types
// ============================================================================

/**
 * Wrapper for the handoff slot data with metadata.
 */
export interface HandoffSlotData {
  /** The snapshot data */
  snapshot: SingingTrainerSnapshot;
  /** When the slot was written */
  writtenAt: number;
  /** Unique ID for this handoff */
  handoffId: string;
}

/**
 * Direction of the handoff.
 */
export type HandoffDirection =
  | 'student-notation-to-singing-trainer'
  | 'singing-trainer-to-student-notation';
