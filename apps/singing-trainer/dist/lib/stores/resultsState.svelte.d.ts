import { NotePerformance } from '@mlt/student-notation-engine';
import { TargetNote } from './highwayState.svelte.js';
/** Result for a single phrase/section */
export interface PhraseResult {
    phraseIndex: number;
    notesHit: number;
    totalNotes: number;
    accuracyPercent: number;
    lyricPreview: string;
}
/** Summary of overall performance */
export interface ResultsSummary {
    totalNotes: number;
    notesHit: number;
    notesMissed: number;
    accuracyPercent: number;
    goldenNotesHit: number;
    goldenNotesTotal: number;
    phraseResults: PhraseResult[];
    averagePitchDeviationCents: number;
}
/** State for the results modal */
export interface ResultsState {
    isVisible: boolean;
    summary: ResultsSummary | null;
    songTitle: string;
    artistName: string;
    source: 'demo' | 'ultrastar' | null;
}
export declare const resultsState: {
    readonly state: ResultsState;
    /**
     * Show results modal with calculated summary
     */
    show(summary: ResultsSummary, options?: {
        title?: string;
        artist?: string;
        source?: "demo" | "ultrastar";
    }): void;
    /**
     * Hide results modal
     */
    hide(): void;
    /**
     * Clear results and hide modal
     */
    clear(): void;
    /**
     * Calculate summary from performance data and target notes
     */
    calculateSummary(performances: Map<string, NotePerformance>, targetNotes: TargetNote[]): ResultsSummary;
    /**
     * Get letter grade based on accuracy
     */
    getLetterGrade(accuracy: number): string;
    /**
     * Get color for accuracy display
     */
    getAccuracyColor(accuracy: number): string;
};
