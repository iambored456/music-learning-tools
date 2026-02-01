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
  TargetKind,
} from './types.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: FeedbackCollectorConfig = {
  onsetToleranceMs: 100,
  releaseToleranceMs: 150,
  pitchToleranceCents: 50,
  hitThreshold: 70, // 70% of note duration with correct pitch
  minAmplitudeDb: -60,
  minVoicedMs: 400,
  minCoveragePct: 60,
  bandToleranceSemitones: 0,
  minSlideSemitones: 3,
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

  function getTargetKind(note: HighwayTargetNote): TargetKind {
    return note.targetKind ?? 'fixedPitch';
  }

  function isFiniteMidi(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isVoicedSample(sample: PitchSample): boolean {
    if (!isFiniteMidi(sample.midi) || sample.midi <= 0) {
      return false;
    }
    if (typeof sample.amplitudeDb === 'number' && typeof finalConfig.minAmplitudeDb === 'number') {
      return sample.amplitudeDb >= finalConfig.minAmplitudeDb;
    }
    return true;
  }

  /**
   * Check if a pitch sample matches the target note within tolerance.
   */
  function isPitchCorrect(sample: PitchSample, targetMidi: number): boolean {
    if (!isFiniteMidi(targetMidi)) {
      return false;
    }
    const deviation = Math.abs(calculateCentDeviation(sample.midi, targetMidi));
    return deviation <= finalConfig.pitchToleranceCents;
  }

  function getBandBounds(note: HighwayTargetNote): { minMidi: number; maxMidi: number } | null {
    if (!isFiniteMidi(note.minMidi) || !isFiniteMidi(note.maxMidi)) {
      return null;
    }
    return {
      minMidi: Math.min(note.minMidi, note.maxMidi),
      maxMidi: Math.max(note.minMidi, note.maxMidi),
    };
  }

  function isBandMatch(sample: PitchSample, note: HighwayTargetNote): boolean {
    if (!isVoicedSample(sample)) return false;
    const bounds = getBandBounds(note);
    if (!bounds) return false;
    const tolerance = finalConfig.bandToleranceSemitones ?? 0;
    return (
      sample.midi >= bounds.minMidi - tolerance &&
      sample.midi <= bounds.maxMidi + tolerance
    );
  }

  function isSampleCorrectForTarget(sample: PitchSample, note: HighwayTargetNote): boolean {
    const kind = getTargetKind(note);
    if (kind === 'fixedPitch') {
      return isPitchCorrect(sample, note.midi ?? 0);
    }
    if (kind === 'windowBand') {
      return isBandMatch(sample, note);
    }
    return isVoicedSample(sample);
  }

  /**
   * Calculate average pitch deviation from all samples.
   */
  function calculateAveragePitchDeviation(
    samples: PitchSample[],
    targetMidi: number
  ): number {
    if (!isFiniteMidi(targetMidi)) return 0;
    if (samples.length === 0) return 0;

    const totalDeviation = samples.reduce((sum, sample) => {
      return sum + Math.abs(calculateCentDeviation(sample.midi, targetMidi));
    }, 0);

    return totalDeviation / samples.length;
  }

  function calculateCoverage(
    samples: PitchSample[],
    predicate: (sample: PitchSample) => boolean,
    noteStartMs: number,
    noteDurationMs: number
  ): { coveragePct: number; coveredMs: number } {
    if (samples.length === 0) {
      return { coveragePct: 0, coveredMs: 0 };
    }

    const matchingSamples = samples.filter(predicate);
    if (matchingSamples.length === 0) {
      return { coveragePct: 0, coveredMs: 0 };
    }

    let coveredMs = 0;
    for (let i = 0; i < matchingSamples.length; i++) {
      const sample = matchingSamples[i];
      if (!sample) continue;
      const nextSample = matchingSamples[i + 1];

      if (nextSample) {
        coveredMs += nextSample.timeMs - sample.timeMs;
      } else {
        const endTime = noteStartMs + noteDurationMs;
        const sampleDuration = Math.min(50, endTime - sample.timeMs);
        coveredMs += sampleDuration;
      }
    }

    return {
      coveragePct: (coveredMs / noteDurationMs) * 100,
      coveredMs,
    };
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
    return calculateCoverage(
      samples,
      (sample) => isPitchCorrect(sample, targetMidi),
      noteStartMs,
      noteDurationMs
    ).coveragePct;
  }

  function calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid] ?? 0;
  }

  function calculateSlideSpan(samples: PitchSample[]): number {
    if (samples.length < 2) return 0;
    const windowSize = Math.max(1, Math.floor(samples.length * 0.2));
    const firstWindow = samples.slice(0, windowSize).map(s => s.midi);
    const lastWindow = samples.slice(Math.max(0, samples.length - windowSize)).map(s => s.midi);
    const firstMedian = calculateMedian(firstWindow);
    const lastMedian = calculateMedian(lastWindow);
    return lastMedian - firstMedian;
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
    const targetKind = getTargetKind(note);

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

    const minCoveragePct = finalConfig.minCoveragePct ?? finalConfig.hitThreshold;
    const minVoicedMs = finalConfig.minVoicedMs ?? 0;

    let pitchAccuracyCents = 0;
    let pitchCoverage = 0;
    let voicedCoverage: number | undefined;
    let voicedMs: number | undefined;
    let bandCoverage: number | undefined;
    let slideSemitoneSpan: number | undefined;
    let hitStatus: 'hit' | 'miss' = 'miss';

    if (targetKind === 'fixedPitch') {
      const targetMidi = note.midi ?? 0;
      pitchAccuracyCents = calculateAveragePitchDeviation(samples, targetMidi);
      pitchCoverage = calculatePitchCoverage(
        samples,
        targetMidi,
        note.startTimeMs,
        note.durationMs
      );

      const onsetOk = Math.abs(onsetAccuracyMs) <= finalConfig.onsetToleranceMs;
      const releaseOk = Math.abs(releaseAccuracyMs) <= finalConfig.releaseToleranceMs;
      const pitchOk = pitchCoverage >= finalConfig.hitThreshold;
      hitStatus = onsetOk && releaseOk && pitchOk ? 'hit' : 'miss';
    } else if (targetKind === 'windowAnyPitch') {
      const voiced = calculateCoverage(
        samples,
        isVoicedSample,
        note.startTimeMs,
        note.durationMs
      );
      voicedCoverage = voiced.coveragePct;
      voicedMs = voiced.coveredMs;
      pitchCoverage = voiced.coveragePct;
      hitStatus = voicedCoverage >= minCoveragePct && voicedMs >= minVoicedMs ? 'hit' : 'miss';
    } else if (targetKind === 'windowBand') {
      const band = calculateCoverage(
        samples,
        (sample) => isBandMatch(sample, note),
        note.startTimeMs,
        note.durationMs
      );
      bandCoverage = band.coveragePct;
      pitchCoverage = band.coveragePct;
      voicedMs = band.coveredMs;

      const voiced = calculateCoverage(
        samples,
        isVoicedSample,
        note.startTimeMs,
        note.durationMs
      );
      voicedCoverage = voiced.coveragePct;

      const bounds = getBandBounds(note);
      if (bounds) {
        const center = (bounds.minMidi + bounds.maxMidi) / 2;
        const bandSamples = samples.filter((sample) => isBandMatch(sample, note));
        pitchAccuracyCents = calculateAveragePitchDeviation(bandSamples, center);
      }

      hitStatus = bandCoverage >= minCoveragePct && (voicedMs ?? 0) >= minVoicedMs ? 'hit' : 'miss';
    } else if (targetKind === 'slideWindow') {
      const voicedSamples = samples.filter(isVoicedSample);
      const voiced = calculateCoverage(
        samples,
        isVoicedSample,
        note.startTimeMs,
        note.durationMs
      );
      voicedCoverage = voiced.coveragePct;
      voicedMs = voiced.coveredMs;
      pitchCoverage = voiced.coveragePct;
      slideSemitoneSpan = calculateSlideSpan(voicedSamples);

      const minSlideSemitones = finalConfig.minSlideSemitones ?? 0;
      let directionOk = true;
      if (note.slideDirection === 'up') {
        directionOk = slideSemitoneSpan >= minSlideSemitones;
      } else if (note.slideDirection === 'down') {
        directionOk = slideSemitoneSpan <= -minSlideSemitones;
      } else {
        directionOk = Math.abs(slideSemitoneSpan) >= minSlideSemitones;
      }

      hitStatus =
        voicedCoverage >= minCoveragePct &&
        (voicedMs ?? 0) >= minVoicedMs &&
        directionOk
          ? 'hit'
          : 'miss';
    }

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
      voicedCoverage,
      voicedMs,
      bandCoverage,
      slideSemitoneSpan,
      slideDirection: note.slideDirection,
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

          const isCorrectForTarget = isSampleCorrectForTarget(sample, note);

          // Track onset sample (first correct/voiced pitch near note start)
          if (
            !noteData.onsetSample &&
            sample.timeMs >= note.startTimeMs - onsetWindow &&
            sample.timeMs <= note.startTimeMs + onsetWindow &&
            isCorrectForTarget
          ) {
            noteData.onsetSample = sample;
          }

          // Track release sample (last sample near note end)
          if (
            sample.timeMs >= noteEndMs - releaseWindow &&
            sample.timeMs <= noteEndMs + releaseWindow &&
            isCorrectForTarget
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
      const targetKind = getTargetKind(note);

      let onsetAccuracyMs = 0;
      if (onsetSample) {
        onsetAccuracyMs = onsetSample.timeMs - note.startTimeMs;
      }

      let pitchAccuracyCents = 0;
      let pitchCoverage = 0;
      let voicedCoverage: number | undefined;
      let voicedMs: number | undefined;
      let bandCoverage: number | undefined;
      let slideSemitoneSpan: number | undefined;

      if (targetKind === 'fixedPitch') {
        const targetMidi = note.midi ?? 0;
        pitchAccuracyCents = calculateAveragePitchDeviation(samples, targetMidi);
        pitchCoverage = calculatePitchCoverage(
          samples,
          targetMidi,
          note.startTimeMs,
          note.durationMs
        );
      } else if (targetKind === 'windowAnyPitch') {
        const voiced = calculateCoverage(
          samples,
          isVoicedSample,
          note.startTimeMs,
          note.durationMs
        );
        voicedCoverage = voiced.coveragePct;
        voicedMs = voiced.coveredMs;
        pitchCoverage = voiced.coveragePct;
      } else if (targetKind === 'windowBand') {
        const band = calculateCoverage(
          samples,
          (sample) => isBandMatch(sample, note),
          note.startTimeMs,
          note.durationMs
        );
        bandCoverage = band.coveragePct;
        pitchCoverage = band.coveragePct;
        voicedMs = band.coveredMs;

        const voiced = calculateCoverage(
          samples,
          isVoicedSample,
          note.startTimeMs,
          note.durationMs
        );
        voicedCoverage = voiced.coveragePct;

        const bounds = getBandBounds(note);
        if (bounds) {
          const center = (bounds.minMidi + bounds.maxMidi) / 2;
          const bandSamples = samples.filter((sample) => isBandMatch(sample, note));
          pitchAccuracyCents = calculateAveragePitchDeviation(bandSamples, center);
        }
      } else if (targetKind === 'slideWindow') {
        const voicedSamples = samples.filter(isVoicedSample);
        const voiced = calculateCoverage(
          samples,
          isVoicedSample,
          note.startTimeMs,
          note.durationMs
        );
        voicedCoverage = voiced.coveragePct;
        voicedMs = voiced.coveredMs;
        pitchCoverage = voiced.coveragePct;
        slideSemitoneSpan = calculateSlideSpan(voicedSamples);
      }

      return {
        onsetAccuracyMs,
        pitchAccuracyCents,
        pitchCoverage,
        voicedCoverage,
        voicedMs,
        bandCoverage,
        slideSemitoneSpan,
        slideDirection: note.slideDirection,
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
