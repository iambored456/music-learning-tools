/**
 * Overdub Exercise Chooser State - Svelte 5 Runes
 *
 * Manages the overdub exercise chooser modal visibility and selection.
 */

import type { LessonSettingsSchema } from '@mlt/lesson-templates';

export interface OverdubExerciseChooserState {
  isVisible: boolean;
  selectedExerciseId: string | null;
  localSettings: Record<string, number | boolean>;
}

const DEFAULT_STATE: OverdubExerciseChooserState = {
  isVisible: false,
  selectedExerciseId: null,
  localSettings: {},
};

function createOverdubExerciseChooserState() {
  let state = $state<OverdubExerciseChooserState>({ ...DEFAULT_STATE });

  return {
    get state() {
      return state;
    },

    show() {
      state.isVisible = true;
    },

    hide() {
      state.isVisible = false;
    },

    selectExercise(exerciseId: string, settingsSchema?: LessonSettingsSchema) {
      state.selectedExerciseId = exerciseId;
      if (settingsSchema) {
        const defaults: Record<string, number | boolean> = {};
        for (const field of settingsSchema.fields) {
          defaults[field.key] = field.default;
        }
        state.localSettings = defaults;
      } else {
        state.localSettings = {};
      }
    },

    updateLocalSetting(key: string, value: number | boolean) {
      state.localSettings = { ...state.localSettings, [key]: value };
    },

    getLocalSettings(): Record<string, number | boolean> {
      return { ...state.localSettings };
    },

    clear() {
      state = { ...DEFAULT_STATE };
    },

    resetSelection() {
      state.selectedExerciseId = null;
      state.localSettings = {};
    },
  };
}

export const overdubExerciseChooserState = createOverdubExerciseChooserState();
