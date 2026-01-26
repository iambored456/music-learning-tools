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
} from './types.js';

export { CALIBRATION_PHRASES, DEFAULT_CALIBRATION_CONFIG } from './types.js';

// Algorithm
export {
  analyzeRecordingsForSpeakingPitch,
  midiToNoteName,
  applyAdjustment,
} from './speakingPitchCalibration.js';

// Store
export { speakingPitchStore } from './speakingPitchStore.svelte.js';

// Components
export { default as CalibrationWizard } from './CalibrationWizard.svelte';
export { default as CalibrationRecordStep } from './CalibrationRecordStep.svelte';
export { default as CalibrationResultStep } from './CalibrationResultStep.svelte';
export { default as PhrasePrompt } from './PhrasePrompt.svelte';
