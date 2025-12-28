import { SingingTrainerSnapshot, SnapshotVoice, TimeGridStructure } from '@mlt/handoff';
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
export declare const handoffState: {
    readonly state: HandoffState;
    /**
     * Check for and consume any pending handoff on app initialization.
     * Should be called once when the app loads.
     */
    checkAndConsumeHandoff(): Promise<boolean>;
    /**
     * Get the imported voices.
     */
    readonly voices: SnapshotVoice[];
    /**
     * Get the time grid structure.
     */
    readonly timeGrid: TimeGridStructure | null;
    /**
     * Get the tempo (with transposition applied to accompaniment).
     */
    readonly tempo: number;
    /**
     * Get the suggested pitch range based on imported notes.
     */
    readonly suggestedPitchRange: {
        minMidi: number;
        maxMidi: number;
    } | null;
    /**
     * Set transposition in semitones.
     */
    setTransposition(semitones: number): void;
    /**
     * Transpose up by one semitone.
     */
    transposeUp(): void;
    /**
     * Transpose down by one semitone.
     */
    transposeDown(): void;
    /**
     * Get a transposed MIDI pitch.
     */
    getTransposedMidi(originalMidi: number): number;
    /**
     * Export current state back to Student Notation.
     * Creates a new snapshot and navigates back.
     */
    bringBackToStudentNotation(): Promise<void>;
    /**
     * Clear the imported snapshot.
     */
    clearSnapshot(): void;
    /**
     * Reset the handoff state.
     */
    reset(): void;
};
