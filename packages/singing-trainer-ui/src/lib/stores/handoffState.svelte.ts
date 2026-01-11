/**
 * Handoff State Store - Svelte 5 Runes
 *
 * Manages imported snapshot data from Student Notation.
 * This store handles the handoff lifecycle:
 * 1. Check for handoff on app load
 * 2. Import snapshot data
 * 3. Provide access to imported voices and grid structure
 * 4. Support "Bring Back to Student Notation" flow
 */

import {
  consumeHandoffSlot,
  checkForHandoff,
  clearHandoffParams,
  writeHandoffSlot,
  navigateToStudentNotation,
  type SingingTrainerSnapshot,
  type SnapshotVoice,
  type TimeGridStructure,
  SNAPSHOT_SCHEMA_VERSION,
} from '@mlt/handoff';

export interface HandoffState {
  /** Whether a snapshot has been imported */
  hasImportedSnapshot: boolean;
  /** The imported snapshot (if any) */
  snapshot: SingingTrainerSnapshot | null;
  /** Loading state during handoff processing */
  isLoading: boolean;
  /** Error message if handoff failed */
  error: string | null;
  /** Transposition offset in semitones (positive = up) */
  transpositionSemitones: number;
}

const DEFAULT_STATE: HandoffState = {
  hasImportedSnapshot: false,
  snapshot: null,
  isLoading: false,
  error: null,
  transpositionSemitones: 0,
};

function createHandoffState() {
  let state = $state<HandoffState>({ ...DEFAULT_STATE });

  return {
    get state() {
      return state;
    },

    /**
     * Check for and consume any pending handoff on app initialization.
     * Should be called once when the app loads.
     */
    async checkAndConsumeHandoff(): Promise<boolean> {
      // First check URL params to see if we came from a handoff
      const handoffInfo = checkForHandoff();

      if (!handoffInfo) {
        return false;
      }

      state.isLoading = true;
      state.error = null;

      try {
        // Try to read and consume the snapshot from the handoff slot
        const snapshot = await consumeHandoffSlot();

        if (!snapshot) {
          state.error = 'Handoff data expired or not found. Please try exporting again.';
          state.isLoading = false;
          clearHandoffParams();
          return false;
        }

        // Validate schema version
        if (snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
          state.error = `Incompatible snapshot version: ${snapshot.schemaVersion}. Expected: ${SNAPSHOT_SCHEMA_VERSION}`;
          state.isLoading = false;
          clearHandoffParams();
          return false;
        }

        // Successfully imported
        state.snapshot = snapshot;
        state.hasImportedSnapshot = true;
        state.isLoading = false;

        // Clear URL params to keep the URL clean
        clearHandoffParams();

        console.log('[HandoffState] Successfully imported snapshot', {
          voices: snapshot.voices.length,
          microbeatCount: snapshot.timeGrid.microbeatCount,
          tempo: snapshot.tempo,
        });

        return true;
      } catch (error) {
        console.error('[HandoffState] Failed to process handoff', error);
        state.error = 'Failed to import data from Student Notation.';
        state.isLoading = false;
        clearHandoffParams();
        return false;
      }
    },

    /**
     * Get the imported voices.
     */
    get voices(): SnapshotVoice[] {
      return state.snapshot?.voices ?? [];
    },

    /**
     * Get the time grid structure.
     */
    get timeGrid(): TimeGridStructure | null {
      return state.snapshot?.timeGrid ?? null;
    },

    /**
     * Get the tempo (with transposition applied to accompaniment).
     */
    get tempo(): number {
      return state.snapshot?.tempo ?? 90;
    },

    /**
     * Get the suggested pitch range based on imported notes.
     */
    get suggestedPitchRange(): { minMidi: number; maxMidi: number } | null {
      if (!state.snapshot) {
        return null;
      }

      const margin = 3; // Add a few semitones margin
      const minMidi = state.snapshot.minMidiPitch;
      const maxMidi = state.snapshot.maxMidiPitch;

      if (minMidi === undefined || maxMidi === undefined) {
        return null;
      }

      return {
        minMidi: Math.max(21, minMidi - margin + state.transpositionSemitones),
        maxMidi: Math.min(108, maxMidi + margin + state.transpositionSemitones),
      };
    },

    /**
     * Set transposition in semitones.
     */
    setTransposition(semitones: number) {
      state.transpositionSemitones = semitones;
    },

    /**
     * Transpose up by one semitone.
     */
    transposeUp() {
      state.transpositionSemitones += 1;
    },

    /**
     * Transpose down by one semitone.
     */
    transposeDown() {
      state.transpositionSemitones -= 1;
    },

    /**
     * Get a transposed MIDI pitch.
     */
    getTransposedMidi(originalMidi: number): number {
      return originalMidi + state.transpositionSemitones;
    },

    /**
     * Export current state back to Student Notation.
     * Creates a new snapshot and navigates back.
     */
    async bringBackToStudentNotation(): Promise<void> {
      if (!state.snapshot) {
        console.warn('[HandoffState] No snapshot to bring back');
        return;
      }

      // Create a modified snapshot for return
      const returnSnapshot: SingingTrainerSnapshot = {
        ...state.snapshot,
        sourceApp: 'singing-trainer',
        createdAt: Date.now(),
        // Apply transposition to all voices
        voices: state.snapshot.voices.map(voice => ({
          ...voice,
          notes: voice.notes.map(note => ({
            ...note,
            midiPitch: note.midiPitch + state.transpositionSemitones,
          })),
        })),
      };

      try {
        const handoffId = await writeHandoffSlot(returnSnapshot);
        console.log('[HandoffState] Handoff slot written for return', handoffId);
        navigateToStudentNotation(handoffId);
      } catch (error) {
        console.error('[HandoffState] Failed to write return handoff', error);
      }
    },

    /**
     * Clear the imported snapshot.
     */
    clearSnapshot() {
      state = { ...DEFAULT_STATE };
    },

    /**
     * Reset the handoff state.
     */
    reset() {
      state = { ...DEFAULT_STATE };
    },
  };
}

export const handoffState = createHandoffState();
