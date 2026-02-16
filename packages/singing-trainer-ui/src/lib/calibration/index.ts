/**
 * Calibration Module Index
 *
 * Exports all calibration-related types, stores, and components.
 */

// Types
export type {
  SpeakingPitchCalibration,
  PitchSample,
  PhraseRecordingState,
  CalibrationErrorCode,
  CalibrationError,
  CalibrationStep,
  PitchHistogramBin,
  ClusterAnalysisResult,
  CalibrationWizardState,
  CalibrationConfig,
} from '@mlt/singing-trainer-core/calibration/types.js';

export { CALIBRATION_PHRASES, DEFAULT_CALIBRATION_CONFIG } from '@mlt/singing-trainer-core/calibration/types.js';

// Algorithm
export {
  analyzeRecordingsForSpeakingPitch,
  midiToNoteName,
  applyAdjustment,
} from '@mlt/singing-trainer-core/calibration/speakingPitchCalibration.js';

// Store
export { speakingPitchStore } from '@mlt/singing-trainer-core/calibration/speakingPitchStore.svelte.js';

// Components
export { default as CalibrationWizard } from './CalibrationWizard.svelte';
export { default as CalibrationRecordStep } from './CalibrationRecordStep.svelte';
export { default as CalibrationResultStep } from './CalibrationResultStep.svelte';
export { default as PhrasePrompt } from './PhrasePrompt.svelte';
