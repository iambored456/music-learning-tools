/**
 * Feedback Collector
 *
 * Collects and analyzes user performance data for Note Highway playback.
 * Tracks pitch input samples and calculates accuracy metrics.
 */

import type {
  FeedbackCollectorConfig,
  FeedbackCollectorInstance,
  HighwayTargetNote,
  NotePerformance,
  PitchSample,
} from './types.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: FeedbackCollectorConfig = {
  onsetToleranceMs: 100,
  releaseToleranceMs: 150,
  pitchToleranceCents: 50,
  hitThreshold: 70, // 70% of note duration with correct pitch
  accuracyTiers: {
    perfect: { onsetMs: 30, pitchCents: 10, coverage: 95 },
    good: { onsetMs: 75, pitchCents: 25, coverage: 85 },
    okay: { onsetMs: 150, pitchCents: 50, coverage: 70 },
  },
};

// ============================================================================
// Active Note Tracking
// ============================================================================

interface ActiveNoteData {
  note: HighwayTargetNote;
  samples: PitchSample[];
  onsetSample: PitchSample | null;
  releaseSample: PitchSample | null;
  startedAt: number;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a feedback collector instance.
 */
export function createFeedbackCollector(
  config: Partial<FeedbackCollectorConfig> = {}
): FeedbackCollectorInstance {
  const finalConfig: FeedbackCollectorConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    accuracyTiers: config.accuracyTiers
      ? {
          ...DEFAULT_CONFIG.accuracyTiers,
          ...config.accuracyTiers,
        }
      : DEFAULT_CONFIG.accuracyTiers,
  };

  // Active notes being tracked
  const activeNotes = new Map<string, ActiveNoteData>();

  // Completed performances
  const performances = new Map<string, NotePerformance>();

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Calculate pitch deviation in cents between two MIDI values.
   */
  function calculateCentDeviation(actualMidi: number, targetMidi: number): number {
    return (actualMidi - targetMidi) * 100;
  }

  /**
   * Check if a pitch sample matches the target note within tolerance.
   */
  function isPitchCorrect(sample: PitchSample, targetMidi: number): boolean {
    const deviation = Math.abs(calculateCentDeviation(sample.midi, targetMidi));
    return deviation <= finalConfig.pitchToleranceCents;
  }

  /**
   * Calculate average pitch deviation from all samples.
   */
  function calculateAveragePitchDeviation(
    samples: PitchSample[],
    targetMidi: number
  ): number {
    if (samples.length === 0) return 0;

    const totalDeviation = samples.reduce((sum, sample) => {
      return sum + Math.abs(calculateCentDeviation(sample.midi, targetMidi));
    }, 0);

    return totalDeviation / samples.length;
  }

  /**
   * Calculate percentage of note duration with correct pitch.
   */
  function calculatePitchCoverage(
    samples: PitchSample[],
    targetMidi: number,
    noteStartMs: number,
    noteDurationMs: number
  ): number {
    if (samples.length === 0) return 0;

    const correctSamples = samples.filter(s => isPitchCorrect(s, targetMidi));
    if (correctSamples.length === 0) return 0;

    // Calculate time coverage based on sample timestamps
    let coveredMs = 0;
    for (let i = 0; i < correctSamples.length; i++) {
      const sample = correctSamples[i];
      if (!sample) {
        continue;
      }
      const nextSample = correctSamples[i + 1];

      if (nextSample) {
        coveredMs += nextSample.timeMs - sample.timeMs;
      } else {
        // Assume last sample covers until note end or next sample time
        const endTime = noteStartMs + noteDurationMs;
        const sampleDuration = Math.min(50, endTime - sample.timeMs); // Max 50ms per sample
        coveredMs += sampleDuration;
      }
    }

    return (coveredMs / noteDurationMs) * 100;
  }

  /**
   * Determine accuracy tier based on performance metrics.
   */
  function determineAccuracyTier(
    onsetAccuracyMs: number,
    pitchAccuracyCents: number,
    pitchCoverage: number
  ): string {
    const tiers = finalConfig.accuracyTiers;
    if (!tiers) return 'okay';

    const absOnset = Math.abs(onsetAccuracyMs);

    if (
      absOnset <= tiers.perfect.onsetMs &&
      pitchAccuracyCents <= tiers.perfect.pitchCents &&
      pitchCoverage >= tiers.perfect.coverage
    ) {
      return 'perfect';
    }

    if (
      absOnset <= tiers.good.onsetMs &&
      pitchAccuracyCents <= tiers.good.pitchCents &&
      pitchCoverage >= tiers.good.coverage
    ) {
      return 'good';
    }

    if (
      absOnset <= tiers.okay.onsetMs &&
      pitchAccuracyCents <= tiers.okay.pitchCents &&
      pitchCoverage >= tiers.okay.coverage
    ) {
      return 'okay';
    }

    return 'miss';
  }

  /**
   * Analyze performance for a completed note.
   */
  function analyzePerformance(noteData: ActiveNoteData): NotePerformance {
    const { note, samples, onsetSample, releaseSample } = noteData;

    // Calculate onset accuracy
    let onsetAccuracyMs = 0;
    if (onsetSample) {
      onsetAccuracyMs = onsetSample.timeMs - note.startTimeMs;
    } else {
      // No onset detected - use tolerance as penalty
      onsetAccuracyMs = finalConfig.onsetToleranceMs * 2;
    }

    // Calculate release accuracy
    let releaseAccuracyMs = 0;
    const noteEndMs = note.startTimeMs + note.durationMs;
    if (releaseSample) {
      releaseAccuracyMs = releaseSample.timeMs - noteEndMs;
    } else {
      // No release detected
      releaseAccuracyMs = finalConfig.releaseToleranceMs * 2;
    }

    // Calculate pitch accuracy
    const pitchAccuracyCents = calculateAveragePitchDeviation(samples, note.midi);

    // Calculate pitch coverage
    const pitchCoverage = calculatePitchCoverage(
      samples,
      note.midi,
      note.startTimeMs,
      note.durationMs
    );

    // Determine hit status
    const onsetOk = Math.abs(onsetAccuracyMs) <= finalConfig.onsetToleranceMs;
    const releaseOk = Math.abs(releaseAccuracyMs) <= finalConfig.releaseToleranceMs;
    const pitchOk = pitchCoverage >= finalConfig.hitThreshold;
    const hitStatus = onsetOk && releaseOk && pitchOk ? 'hit' : 'miss';

    // Determine accuracy tier
    const accuracyTier = determineAccuracyTier(
      onsetAccuracyMs,
      pitchAccuracyCents,
      pitchCoverage
    );

    return {
      hitStatus,
      onsetAccuracyMs,
      releaseAccuracyMs,
      pitchAccuracyCents,
      pitchCoverage,
      pitchSamples: [...samples],
      accuracyTier,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  const instance: FeedbackCollectorInstance = {
    startNote(noteId: string, note: HighwayTargetNote): void {
      activeNotes.set(noteId, {
        note,
        samples: [],
        onsetSample: null,
        releaseSample: null,
        startedAt: performance.now(),
      });
    },

    recordPitchSample(sample: PitchSample): void {
      // Add sample to all active notes that it might belong to
      for (const [noteId, noteData] of activeNotes) {
        const { note } = noteData;
        const noteEndMs = note.startTimeMs + note.durationMs;
        const onsetWindow = finalConfig.onsetToleranceMs;
        const releaseWindow = finalConfig.releaseToleranceMs;

        // Check if sample is within note window (with tolerance)
        if (
          sample.timeMs >= note.startTimeMs - onsetWindow &&
          sample.timeMs <= noteEndMs + releaseWindow
        ) {
          noteData.samples.push(sample);

          // Track onset sample (first correct pitch near note start)
          if (
            !noteData.onsetSample &&
            sample.timeMs >= note.startTimeMs - onsetWindow &&
            sample.timeMs <= note.startTimeMs + onsetWindow &&
            isPitchCorrect(sample, note.midi)
          ) {
            noteData.onsetSample = sample;
          }

          // Track release sample (last sample near note end)
          if (
            sample.timeMs >= noteEndMs - releaseWindow &&
            sample.timeMs <= noteEndMs + releaseWindow
          ) {
            noteData.releaseSample = sample;
          }
        }
      }
    },

    endNote(noteId: string): NotePerformance | null {
      const noteData = activeNotes.get(noteId);
      if (!noteData) return null;

      const performance = analyzePerformance(noteData);
      performances.set(noteId, performance);
      activeNotes.delete(noteId);

      return performance;
    },

    getCurrentPerformance(noteId: string): Partial<NotePerformance> | null {
      const noteData = activeNotes.get(noteId);
      if (!noteData) return null;

      // Provide partial performance data before note ends
      const { note, samples, onsetSample } = noteData;

      let onsetAccuracyMs = 0;
      if (onsetSample) {
        onsetAccuracyMs = onsetSample.timeMs - note.startTimeMs;
      }

      const pitchAccuracyCents = calculateAveragePitchDeviation(samples, note.midi);
      const pitchCoverage = calculatePitchCoverage(
        samples,
        note.midi,
        note.startTimeMs,
        note.durationMs
      );

      return {
        onsetAccuracyMs,
        pitchAccuracyCents,
        pitchCoverage,
        pitchSamples: [...samples],
      };
    },

    getAllPerformances(): Map<string, NotePerformance> {
      return new Map(performances);
    },

    reset(): void {
      activeNotes.clear();
      performances.clear();
    },

    dispose(): void {
      activeNotes.clear();
      performances.clear();
    },
  };

  return instance;
}
