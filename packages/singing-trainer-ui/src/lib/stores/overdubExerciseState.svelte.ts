/**
 * Overdub Exercise State - Svelte 5 Runes
 *
 * Coordinates the overdub exercise lifecycle:
 * - Load exercise template → convert voices to target notes
 * - Display on highway with per-voice colors
 * - Play guide voice audio via Tone.js
 * - Optionally bridge into overdub recording system
 */

import {
  getTemplate,
  type OverdubExerciseTemplate,
  type OverdubExerciseConfig,
} from '@mlt/lesson-templates';
import { convertExerciseVoicesToTargetNotes, calculateExerciseDurationMs } from '../services/exerciseVoiceConverter.js';
import { guideVoicePlayer } from '../services/guideVoicePlayer.js';
import { highwayState, type TargetNote } from './highwayState.svelte.js';
import { appState } from './appState.svelte.js';

export interface OverdubExerciseSessionState {
  isActive: boolean;
  exerciseId: string | null;
  template: OverdubExerciseTemplate | null;
  /** All target notes (all voices) for highway display */
  allTargetNotes: TargetNote[];
  /** Guide voice notes only (for audio playback) */
  guideTargetNotes: TargetNote[];
  /** Student voice notes only (for future scoring) */
  studentTargetNotes: TargetNote[];
  isPlaying: boolean;
  /** Effective tempo (may be overridden by settings) */
  tempo: number;
  /** Total exercise duration in ms */
  durationMs: number;
}

const DEFAULT_STATE: OverdubExerciseSessionState = {
  isActive: false,
  exerciseId: null,
  template: null,
  allTargetNotes: [],
  guideTargetNotes: [],
  studentTargetNotes: [],
  isPlaying: false,
  tempo: 80,
  durationMs: 0,
};

function createOverdubExerciseState() {
  let state = $state<OverdubExerciseSessionState>({ ...DEFAULT_STATE });

  return {
    get state() {
      return state;
    },

    /**
     * Load an exercise template and convert its voices to target notes.
     */
    loadExercise(exerciseId: string, settings?: Record<string, number | boolean>) {
      const template = getTemplate(exerciseId);
      if (!template || template.type !== 'overdub') {
        console.warn(`[OverdubExercise] Template not found or wrong type: ${exerciseId}`);
        return;
      }

      const overdubTemplate = template as OverdubExerciseTemplate;
      const config = overdubTemplate.config;

      // Apply tempo override from settings if provided
      const tempo = (settings?.tempo as number) ?? config.tempo;

      const allTargetNotes = convertExerciseVoicesToTargetNotes(
        config.voices, config.timeGrid, tempo, 'all',
      );
      const guideTargetNotes = convertExerciseVoicesToTargetNotes(
        config.voices, config.timeGrid, tempo, 'guide',
      );
      const studentTargetNotes = convertExerciseVoicesToTargetNotes(
        config.voices, config.timeGrid, tempo, 'student',
      );
      const durationMs = calculateExerciseDurationMs(config.timeGrid, tempo);

      state.exerciseId = exerciseId;
      state.template = overdubTemplate;
      state.allTargetNotes = allTargetNotes;
      state.guideTargetNotes = guideTargetNotes;
      state.studentTargetNotes = studentTargetNotes;
      state.tempo = tempo;
      state.durationMs = durationMs;
      state.isActive = true;
    },

    /**
     * Start the exercise: set highway notes, play guide audio, begin scrolling.
     */
    async start() {
      if (!state.isActive || state.allTargetNotes.length === 0) {
        console.warn('[OverdubExercise] No exercise loaded');
        return;
      }

      // Set viewport pitch range from exercise config
      if (state.template) {
        const config = state.template.config;
        appState.setYAxisRange({
          minMidi: config.minMidiPitch,
          maxMidi: config.maxMidiPitch,
        });
      }

      // Switch to highway visualization
      appState.setVisualizationMode('highway');

      // Set highway target notes (all voices with per-voice colors)
      highwayState.setTargetNotes(state.allTargetNotes);

      // Initialize and play guide voice audio
      await guideVoicePlayer.init();
      guideVoicePlayer.scheduleNotes(state.guideTargetNotes);

      // Start highway scrolling
      highwayState.start();
      state.isPlaying = true;
    },

    /**
     * Stop the exercise: stop audio, stop highway.
     */
    stop() {
      guideVoicePlayer.stop();
      highwayState.stop();
      state.isPlaying = false;
    },

    /**
     * Fully reset exercise state.
     */
    reset() {
      this.stop();
      guideVoicePlayer.dispose();
      highwayState.setTargetNotes([]);
      state = { ...DEFAULT_STATE };
    },
  };
}

export const overdubExerciseState = createOverdubExerciseState();
