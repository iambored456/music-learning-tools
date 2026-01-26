/**
 * Speaking Pitch Store
 *
 * Manages the state for the speaking pitch calibration wizard.
 */

import type {
  CalibrationWizardState,
  CalibrationStep,
  PhraseRecordingState,
  PitchSample,
  ClusterAnalysisResult,
} from './types.js';
import { CALIBRATION_PHRASES, DEFAULT_CALIBRATION_CONFIG } from './types.js';
import { analyzeRecordingsForSpeakingPitch, applyAdjustment, midiToNoteName } from './speakingPitchCalibration.js';
import { preferencesStore } from '../stores/preferencesStore.svelte.js';

/**
 * Create initial phrase recording states
 */
function createInitialPhraseRecordings(): PhraseRecordingState[] {
  return CALIBRATION_PHRASES.map((phrase, index) => ({
    phraseIndex: index,
    phrase,
    status: 'pending' as const,
    pitchSamples: [],
  }));
}

/**
 * Create the speaking pitch calibration store
 */
function createSpeakingPitchStore() {
  let state = $state<CalibrationWizardState>({
    currentStep: 'intro',
    phraseRecordings: createInitialPhraseRecordings(),
    analysisResult: null,
    manualAdjustmentSemitones: 0,
    isComplete: false,
  });

  return {
    /** Get the current state */
    get state() {
      return state;
    },

    /** Get the current step */
    get currentStep(): CalibrationStep {
      return state.currentStep;
    },

    /** Get the current phrase index (0-2) or null if not recording */
    get currentPhraseIndex(): number | null {
      const match = state.currentStep.match(/^recording-(\d+)$/);
      return match ? parseInt(match[1], 10) - 1 : null;
    },

    /** Get the current phrase text or null */
    get currentPhrase(): string | null {
      const index = this.currentPhraseIndex;
      return index !== null ? CALIBRATION_PHRASES[index] : null;
    },

    /** Get the current phrase recording state or null */
    get currentPhraseRecording(): PhraseRecordingState | null {
      const index = this.currentPhraseIndex;
      return index !== null ? state.phraseRecordings[index] : null;
    },

    /** Get the analysis result */
    get analysisResult(): ClusterAnalysisResult | null {
      return state.analysisResult;
    },

    /** Get the final adjusted MIDI value */
    get adjustedMidi(): number | null {
      if (!state.analysisResult?.estimatedMidi) return null;
      return applyAdjustment(state.analysisResult.estimatedMidi, state.manualAdjustmentSemitones);
    },

    /** Get the final adjusted note name */
    get adjustedNoteName(): string | null {
      const midi = this.adjustedMidi;
      return midi !== null ? midiToNoteName(midi) : null;
    },

    /** Get manual adjustment value */
    get manualAdjustment(): number {
      return state.manualAdjustmentSemitones;
    },

    /** Check if all recordings are complete */
    get allRecordingsComplete(): boolean {
      return state.phraseRecordings.every((r) => r.status === 'complete');
    },

    /** Start the calibration wizard */
    start(): void {
      state = {
        currentStep: 'intro',
        phraseRecordings: createInitialPhraseRecordings(),
        analysisResult: null,
        manualAdjustmentSemitones: 0,
        isComplete: false,
      };
    },

    /** Reset the wizard (e.g., for retry) */
    reset(): void {
      this.start();
    },

    /** Move to the next step */
    nextStep(): void {
      switch (state.currentStep) {
        case 'intro':
          state.currentStep = 'recording-1';
          break;
        case 'recording-1':
          state.currentStep = 'recording-2';
          break;
        case 'recording-2':
          state.currentStep = 'recording-3';
          break;
        case 'recording-3':
          state.currentStep = 'analyzing';
          this.analyze();
          break;
        case 'analyzing':
          // This is handled by analyze()
          break;
        case 'result':
        case 'error':
          // End states
          break;
      }
    },

    /** Go back to previous step */
    previousStep(): void {
      switch (state.currentStep) {
        case 'recording-1':
          state.currentStep = 'intro';
          break;
        case 'recording-2':
          state.currentStep = 'recording-1';
          break;
        case 'recording-3':
          state.currentStep = 'recording-2';
          break;
        default:
          // Can't go back from other states
          break;
      }
    },

    /** Start recording for the current phrase */
    startRecording(): void {
      const index = this.currentPhraseIndex;
      if (index === null) return;

      state.phraseRecordings[index] = {
        ...state.phraseRecordings[index],
        status: 'recording',
        pitchSamples: [],
      };
    },

    /** Add a pitch sample to the current recording */
    addSample(sample: PitchSample): void {
      const index = this.currentPhraseIndex;
      if (index === null || state.phraseRecordings[index].status !== 'recording') return;

      state.phraseRecordings[index].pitchSamples.push(sample);
    },

    /** Complete the current recording */
    completeRecording(samples: PitchSample[]): void {
      const index = this.currentPhraseIndex;
      if (index === null) return;

      state.phraseRecordings[index] = {
        ...state.phraseRecordings[index],
        status: 'complete',
        pitchSamples: samples,
      };
    },

    /** Re-record the current phrase */
    reRecord(): void {
      const index = this.currentPhraseIndex;
      if (index === null) return;

      state.phraseRecordings[index] = {
        ...state.phraseRecordings[index],
        status: 'pending',
        pitchSamples: [],
      };
    },

    /** Analyze all recordings */
    analyze(): void {
      // Collect all samples from all recordings
      const allSamples = state.phraseRecordings.flatMap((r) => r.pitchSamples);

      const result = analyzeRecordingsForSpeakingPitch(allSamples, DEFAULT_CALIBRATION_CONFIG);

      state.analysisResult = result;

      if (result.success) {
        state.currentStep = 'result';
      } else {
        state.currentStep = 'error';
      }
    },

    /** Adjust the result by semitones */
    adjustSemitones(delta: number): void {
      const newAdjustment = state.manualAdjustmentSemitones + delta;
      // Limit adjustment range
      if (newAdjustment >= -12 && newAdjustment <= 12) {
        state.manualAdjustmentSemitones = newAdjustment;
      }
    },

    /** Set adjustment directly */
    setAdjustment(semitones: number): void {
      if (semitones >= -12 && semitones <= 12) {
        state.manualAdjustmentSemitones = semitones;
      }
    },

    /** Save the calibration result */
    save(): boolean {
      const midi = this.adjustedMidi;
      if (midi === null) return false;

      const success = preferencesStore.setSpeakingPitch({
        speakingPitchMidi: midi,
        speakingPitchLastCalibratedAt: new Date().toISOString(),
      });

      if (success) {
        state.isComplete = true;
      }

      return success;
    },
  };
}

/** Singleton store instance */
export const speakingPitchStore = createSpeakingPitchStore();
