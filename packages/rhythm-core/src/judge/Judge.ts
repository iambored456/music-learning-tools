/**
 * Judge
 *
 * Multi-channel pitch judgment system for vocal training.
 *
 * Provides three independent judgment channels:
 * A) Continuous Accuracy (Primary) - % of time pitch is in tolerance
 * B) Onset Incidence - Was voice started correctly?
 * C) Release Incidence - Was note sustained through the end?
 *
 * These channels are kept independent so they can be recombined
 * later for research purposes.
 */

import type {
  SessionTimeMs,
  TimedNote,
  PitchSample,
  JudgeConfig,
  JudgmentResult,
  PitchFeedback,
  JudgmentCallback,
  Unsubscribe,
} from '../types.js';
import { asSessionTimeMs } from '../types.js';
import { DEFAULT_JUDGE_CONFIG } from '../constants.js';
import { createPitchMatcher, type IPitchMatcher } from './PitchMatcher.js';

/**
 * Active judgment state for a single note.
 */
interface ActiveJudgment {
  note: TimedNote;
  samples: PitchSample[];
  inToleranceSamples: number;
  voicedSamples: number;
  totalDeviationCents: number;
  // Onset tracking
  onsetDetected: boolean;
  onsetTimeMs: SessionTimeMs | null;
  onsetInTolerance: boolean;
  // Release tracking
  lastVoicedTimeMs: SessionTimeMs | null;
  sustainedThrough: boolean;
}

export interface IJudge {
  // Configuration
  setConfig(config: Partial<JudgeConfig>): void;
  getConfig(): JudgeConfig;

  // Sample input
  addPitchSample(sample: PitchSample): void;

  // Judgment lifecycle
  startJudgingNote(note: TimedNote): void;
  stopJudgingNote(noteId: string): JudgmentResult | null;
  getActiveJudgments(): string[];

  // Real-time feedback
  getCurrentFeedback(noteId: string): PitchFeedback | null;
  isInTolerance(noteId: string): boolean;

  // Results
  getCompletedJudgments(): JudgmentResult[];
  clearJudgments(): void;

  // Subscriptions
  subscribeToJudgment(callback: JudgmentCallback): Unsubscribe;
}

/**
 * Create a judge instance.
 */
export function createJudge(config: Partial<JudgeConfig> = {}): IJudge {
  // Merge with defaults
  const fullConfig: JudgeConfig = {
    ...DEFAULT_JUDGE_CONFIG,
    ...config,
  };

  let onsetWindowMs = fullConfig.onsetWindowMs;
  let releaseWindowMs = fullConfig.releaseWindowMs;
  let minClarityThreshold = fullConfig.minClarityThreshold;

  // Pitch matcher for tolerance calculations
  const pitchMatcher: IPitchMatcher = createPitchMatcher(fullConfig);

  // Active judgments (notes currently being evaluated)
  const activeJudgments: Map<string, ActiveJudgment> = new Map();

  // Completed judgment results
  const completedJudgments: JudgmentResult[] = [];

  // Subscribers for judgment completion
  const subscribers: Set<JudgmentCallback> = new Set();

  /**
   * Update configuration.
   */
  function setConfig(newConfig: Partial<JudgeConfig>): void {
    if (newConfig.onsetWindowMs !== undefined) {
      onsetWindowMs = newConfig.onsetWindowMs;
    }
    if (newConfig.releaseWindowMs !== undefined) {
      releaseWindowMs = newConfig.releaseWindowMs;
    }
    if (newConfig.minClarityThreshold !== undefined) {
      minClarityThreshold = newConfig.minClarityThreshold;
    }
    pitchMatcher.setConfig(newConfig);
  }

  /**
   * Get current configuration.
   */
  function getConfig(): JudgeConfig {
    return {
      ...fullConfig,
      defaultToleranceCents: pitchMatcher.getDefaultTolerance(),
      shortNoteToleranceCents: pitchMatcher.getShortNoteTolerance(),
      onsetWindowMs,
      releaseWindowMs,
      minClarityThreshold,
    };
  }

  /**
   * Start judging a note.
   */
  function startJudgingNote(note: TimedNote): void {
    if (activeJudgments.has(note.id)) {
      return; // Already judging this note
    }

    activeJudgments.set(note.id, {
      note,
      samples: [],
      inToleranceSamples: 0,
      voicedSamples: 0,
      totalDeviationCents: 0,
      onsetDetected: false,
      onsetTimeMs: null,
      onsetInTolerance: false,
      lastVoicedTimeMs: null,
      sustainedThrough: false,
    });
  }

  /**
   * Add a pitch sample to be evaluated against active judgments.
   */
  function addPitchSample(sample: PitchSample): void {
    // Skip low-clarity samples
    if (sample.clarity < minClarityThreshold) {
      return;
    }

    for (const judgment of activeJudgments.values()) {
      // Only process samples within the note's time window
      if (sample.timeMs < judgment.note.startTimeMs || sample.timeMs > judgment.note.endTimeMs) {
        continue;
      }

      // Store the sample
      judgment.samples.push(sample);

      // Check if voiced
      if (sample.isVoiced) {
        judgment.voicedSamples++;
        judgment.lastVoicedTimeMs = sample.timeMs;

        // Match against target
        const matchResult = pitchMatcher.match(sample, judgment.note);

        if (matchResult.isMatch) {
          judgment.inToleranceSamples++;
        }

        judgment.totalDeviationCents += matchResult.deviationCents;

        // Check onset (first voiced sample within onset window)
        if (!judgment.onsetDetected) {
          const timeSinceNoteStart = sample.timeMs - judgment.note.startTimeMs;
          if (Math.abs(timeSinceNoteStart) <= onsetWindowMs) {
            judgment.onsetDetected = true;
            judgment.onsetTimeMs = sample.timeMs;
            judgment.onsetInTolerance = matchResult.isMatch;
          }
        }
      }
    }
  }

  /**
   * Stop judging a note and calculate final result.
   */
  function stopJudgingNote(noteId: string): JudgmentResult | null {
    const judgment = activeJudgments.get(noteId);
    if (!judgment) {
      return null;
    }

    activeJudgments.delete(noteId);

    // Calculate continuous accuracy
    const totalSamples = judgment.samples.length;
    const continuousAccuracy = totalSamples > 0
      ? judgment.inToleranceSamples / totalSamples
      : 0;

    // Calculate onset timing error
    let onsetTimingErrorMs = 0;
    if (judgment.onsetTimeMs !== null) {
      onsetTimingErrorMs = judgment.onsetTimeMs - judgment.note.startTimeMs;
    }

    // Calculate release timing
    const noteEndMs = judgment.note.endTimeMs;
    let releaseTimely = false;
    let releaseTimingErrorMs = 0;

    // Check if note was sustained through to the end
    judgment.sustainedThrough = judgment.lastVoicedTimeMs !== null &&
      (noteEndMs - judgment.lastVoicedTimeMs) <= releaseWindowMs;

    if (judgment.lastVoicedTimeMs !== null) {
      releaseTimingErrorMs = judgment.lastVoicedTimeMs - noteEndMs;
      releaseTimely = Math.abs(releaseTimingErrorMs) <= releaseWindowMs;
    }

    // Calculate average deviation
    const averageDeviationCents = judgment.voicedSamples > 0
      ? judgment.totalDeviationCents / judgment.voicedSamples
      : 0;

    const result: JudgmentResult = {
      noteId,
      // Channel A: Continuous Accuracy
      continuousAccuracy,
      // Channel B: Onset
      onsetVoiced: judgment.onsetDetected,
      onsetInTolerance: judgment.onsetInTolerance,
      onsetSuccess: judgment.onsetDetected && judgment.onsetInTolerance,
      onsetTimingErrorMs,
      // Channel C: Release
      sustainedThrough: judgment.sustainedThrough,
      releaseTimely,
      releaseSuccess: judgment.sustainedThrough && releaseTimely,
      releaseTimingErrorMs,
      // Aggregate
      averageDeviationCents,
      sampleCount: totalSamples,
      inToleranceSampleCount: judgment.inToleranceSamples,
      voicedSampleCount: judgment.voicedSamples,
    };

    completedJudgments.push(result);

    // Notify subscribers
    subscribers.forEach(cb => {
      try {
        cb(result);
      } catch (error) {
        console.error('Judge: Error in judgment callback', error);
      }
    });

    return result;
  }

  /**
   * Get IDs of all notes currently being judged.
   */
  function getActiveJudgments(): string[] {
    return Array.from(activeJudgments.keys());
  }

  /**
   * Get real-time feedback for an active judgment.
   */
  function getCurrentFeedback(noteId: string): PitchFeedback | null {
    const judgment = activeJudgments.get(noteId);
    if (!judgment || judgment.samples.length === 0) {
      return null;
    }

    // Get the most recent sample
    const lastSample = judgment.samples[judgment.samples.length - 1];
    const matchResult = pitchMatcher.match(lastSample, judgment.note);

    const runningAccuracy = judgment.samples.length > 0
      ? judgment.inToleranceSamples / judgment.samples.length
      : 0;

    return {
      noteId,
      deviationCents: matchResult.deviationCents,
      isInTolerance: matchResult.isMatch,
      runningAccuracy,
    };
  }

  /**
   * Check if a note is currently in tolerance.
   */
  function isInTolerance(noteId: string): boolean {
    const feedback = getCurrentFeedback(noteId);
    return feedback?.isInTolerance ?? false;
  }

  /**
   * Get all completed judgments.
   */
  function getCompletedJudgments(): JudgmentResult[] {
    return [...completedJudgments];
  }

  /**
   * Clear all completed judgments.
   */
  function clearJudgments(): void {
    completedJudgments.length = 0;
    activeJudgments.clear();
  }

  /**
   * Subscribe to judgment completion events.
   */
  function subscribeToJudgment(callback: JudgmentCallback): Unsubscribe {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }

  return {
    setConfig,
    getConfig,
    addPitchSample,
    startJudgingNote,
    stopJudgingNote,
    getActiveJudgments,
    getCurrentFeedback,
    isInTolerance,
    getCompletedJudgments,
    clearJudgments,
    subscribeToJudgment,
  };
}
