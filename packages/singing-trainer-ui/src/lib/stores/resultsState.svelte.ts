/**
 * Results State Store - Svelte 5 Runes
 *
 * Manages the display of performance results after song/exercise completion.
 * Calculates statistics and controls the results modal visibility.
 */

import type { NotePerformance } from '@mlt/student-notation-engine';
import type { TargetNote } from './highwayState.svelte.js';

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

const DEFAULT_STATE: ResultsState = {
  isVisible: false,
  summary: null,
  songTitle: '',
  artistName: '',
  source: null,
};

const EMPTY_SUMMARY: ResultsSummary = {
  totalNotes: 0,
  notesHit: 0,
  notesMissed: 0,
  accuracyPercent: 0,
  goldenNotesHit: 0,
  goldenNotesTotal: 0,
  phraseResults: [],
  averagePitchDeviationCents: 0,
};

function createResultsState() {
  let state = $state<ResultsState>({ ...DEFAULT_STATE });

  return {
    get state() {
      return state;
    },

    /**
     * Show results modal with calculated summary
     */
    show(
      summary: ResultsSummary,
      options: {
        title?: string;
        artist?: string;
        source?: 'demo' | 'ultrastar';
      } = {}
    ) {
      state.summary = summary;
      state.songTitle = options.title || '';
      state.artistName = options.artist || '';
      state.source = options.source || null;
      state.isVisible = true;
    },

    /**
     * Hide results modal
     */
    hide() {
      state.isVisible = false;
    },

    /**
     * Clear results and hide modal
     */
    clear() {
      state = { ...DEFAULT_STATE };
    },

    /**
     * Calculate summary from performance data and target notes
     */
    calculateSummary(
      performances: Map<string, NotePerformance>,
      targetNotes: TargetNote[]
    ): ResultsSummary {
      if (targetNotes.length === 0) {
        return { ...EMPTY_SUMMARY };
      }

      let notesHit = 0;
      let goldenNotesHit = 0;
      let goldenNotesTotal = 0;
      let totalPitchDeviation = 0;
      let pitchDeviationCount = 0;

      // Group notes by phrase for phrase-level results
      const phraseMap = new Map<number, { hit: number; total: number; lyrics: string[] }>();

      targetNotes.forEach((note, index) => {
        const noteId = `target-${index}`;
        const perf = performances.get(noteId);
        const isGolden = (note as any).isGolden === true;
        const phraseIndex = (note as any).phraseIndex ?? 0;

        // Track golden notes
        if (isGolden) {
          goldenNotesTotal++;
        }

        // Initialize phrase tracking
        if (!phraseMap.has(phraseIndex)) {
          phraseMap.set(phraseIndex, { hit: 0, total: 0, lyrics: [] });
        }
        const phrase = phraseMap.get(phraseIndex)!;
        phrase.total++;

        // Track lyrics for preview
        if (note.lyric) {
          phrase.lyrics.push(note.lyric);
        }

        // Check if hit
        if (perf?.hitStatus === 'hit') {
          notesHit++;
          phrase.hit++;

          if (isGolden) {
            goldenNotesHit++;
          }

          // Track pitch deviation if available
          if (typeof perf.pitchAccuracyCents === 'number') {
            totalPitchDeviation += Math.abs(perf.pitchAccuracyCents);
            pitchDeviationCount++;
          }
        }
      });

      const totalNotes = targetNotes.length;
      const notesMissed = totalNotes - notesHit;
      const accuracyPercent = totalNotes > 0 ? (notesHit / totalNotes) * 100 : 0;
      const averagePitchDeviationCents =
        pitchDeviationCount > 0 ? totalPitchDeviation / pitchDeviationCount : 0;

      // Build phrase results
      const phraseResults: PhraseResult[] = [];
      phraseMap.forEach((data, phraseIndex) => {
        phraseResults.push({
          phraseIndex,
          notesHit: data.hit,
          totalNotes: data.total,
          accuracyPercent: data.total > 0 ? (data.hit / data.total) * 100 : 0,
          lyricPreview: data.lyrics.join('').trim().slice(0, 30) || `Phrase ${phraseIndex + 1}`,
        });
      });

      // Sort by phrase index
      phraseResults.sort((a, b) => a.phraseIndex - b.phraseIndex);

      return {
        totalNotes,
        notesHit,
        notesMissed,
        accuracyPercent,
        goldenNotesHit,
        goldenNotesTotal,
        phraseResults,
        averagePitchDeviationCents,
      };
    },

    /**
     * Get letter grade based on accuracy
     */
    getLetterGrade(accuracy: number): string {
      if (accuracy >= 95) return 'S';
      if (accuracy >= 90) return 'A';
      if (accuracy >= 80) return 'B';
      if (accuracy >= 70) return 'C';
      if (accuracy >= 60) return 'D';
      return 'F';
    },

    /**
     * Get color for accuracy display
     */
    getAccuracyColor(accuracy: number): string {
      if (accuracy >= 90) return 'var(--color-success, #28a745)';
      if (accuracy >= 70) return 'var(--color-warning, #ffc107)';
      return 'var(--color-error, #dc3545)';
    },
  };
}

export const resultsState = createResultsState();
