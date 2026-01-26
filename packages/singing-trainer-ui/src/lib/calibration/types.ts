/**
 * Speaking Pitch Calibration Types
 *
 * Type definitions for the calibration feature that estimates
 * a user's speaking pitch from recorded speech samples.
 */

/** Persisted calibration result */
export interface SpeakingPitchCalibration {
  /** Estimated speaking pitch as integer MIDI note */
  speakingPitchMidi: number;
  /** ISO 8601 timestamp of when calibration was performed */
  speakingPitchLastCalibratedAt: string;
}

/** Pitch sample collected during recording */
export interface PitchSample {
  /** MIDI note number (can be fractional) */
  midi: number;
  /** Frequency in Hz */
  frequency: number;
  /** Clarity/confidence score from pitch detection (0-1) */
  clarity: number;
  /** Timestamp from performance.now() */
  timestamp: number;
}

/** State of a single phrase recording */
export interface PhraseRecordingState {
  /** Index of the phrase (0-2) */
  phraseIndex: number;
  /** The phrase text */
  phrase: string;
  /** Current recording status */
  status: 'pending' | 'recording' | 'complete';
  /** Collected pitch samples */
  pitchSamples: PitchSample[];
}

/** Calibration error types */
export type CalibrationErrorCode =
  | 'TOO_FEW_VOICED_SAMPLES'
  | 'NO_STABLE_CLUSTER'
  | 'PITCH_OUT_OF_BOUNDS'
  | 'MICROPHONE_ERROR';

/** Calibration error */
export interface CalibrationError {
  /** Error code for programmatic handling */
  code: CalibrationErrorCode;
  /** Human-readable error message */
  message: string;
  /** Optional additional details */
  details?: Record<string, unknown>;
}

/** Wizard step state */
export type CalibrationStep =
  | 'intro'
  | 'recording-1'
  | 'recording-2'
  | 'recording-3'
  | 'analyzing'
  | 'result'
  | 'error';

/** Histogram bin for pitch analysis */
export interface PitchHistogramBin {
  /** Center of the bin in MIDI */
  midiCenter: number;
  /** Number of samples in this bin */
  count: number;
  /** Density (count / total samples) */
  density: number;
}

/** Result of the cluster analysis algorithm */
export interface ClusterAnalysisResult {
  /** Whether analysis succeeded */
  success: boolean;
  /** Estimated speaking pitch as integer MIDI (on success) */
  estimatedMidi?: number;
  /** Estimated speaking pitch in Hz (on success) */
  estimatedHz?: number;
  /** Confidence score 0-1 (on success) */
  confidenceScore?: number;
  /** The histogram used for analysis (for debugging) */
  histogram?: PitchHistogramBin[];
  /** The bins that formed the selected cluster (for debugging) */
  clusterBins?: PitchHistogramBin[];
  /** Error details (on failure) */
  error?: CalibrationError;
}

/** Full calibration wizard state */
export interface CalibrationWizardState {
  /** Current step in the wizard */
  currentStep: CalibrationStep;
  /** State for each phrase recording */
  phraseRecordings: PhraseRecordingState[];
  /** Analysis result after all recordings complete */
  analysisResult: ClusterAnalysisResult | null;
  /** Manual adjustment applied by user (semitones) */
  manualAdjustmentSemitones: number;
  /** Whether calibration has been saved */
  isComplete: boolean;
}

/** The three calibration phrases */
export const CALIBRATION_PHRASES = [
  'How now brown cow',
  'The arsonist has oddly shaped feet',
  'The human torch was denied a bank loan',
] as const;

/** Calibration algorithm configuration */
export interface CalibrationConfig {
  /** Minimum clarity threshold for valid pitch samples */
  clarityThreshold: number;
  /** Histogram bin size in semitones */
  binSizeSemitones: number;
  /** Minimum voiced samples required across all recordings */
  minVoicedSamples: number;
  /** Percentage of distribution considered "lower region" */
  lowerRegionPercent: number;
  /** Minimum density for a bin to be considered a peak */
  minPeakDensity: number;
  /** Density threshold for cluster expansion */
  clusterExpansionThreshold: number;
  /** Minimum plausible speaking pitch (MIDI) */
  minSpeakingMidi: number;
  /** Maximum plausible speaking pitch (MIDI) */
  maxSpeakingMidi: number;
  /** Recording duration per phrase in milliseconds */
  recordingDurationMs: number;
}

/** Default configuration values */
export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
  clarityThreshold: 0.8,
  binSizeSemitones: 0.5,
  minVoicedSamples: 50,
  lowerRegionPercent: 0.4,
  minPeakDensity: 0.05,
  clusterExpansionThreshold: 0.02,
  minSpeakingMidi: 36, // C2 (~65 Hz)
  maxSpeakingMidi: 72, // C5 (~523 Hz)
  recordingDurationMs: 5000,
};
