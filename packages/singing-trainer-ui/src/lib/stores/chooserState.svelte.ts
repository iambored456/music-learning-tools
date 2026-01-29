/**
 * Chooser State Store - Svelte 5 Runes
 *
 * Manages the exercise chooser modal visibility, category selection,
 * exercise selection, and local per-run settings.
 */

import type { LessonCategory, LessonSettingsSchema, AnyLessonTemplate } from '@mlt/lesson-templates';

/** State for the exercise chooser modal */
export interface ChooserState {
  isVisible: boolean;
  selectedCategory: LessonCategory;
  selectedExerciseId: string | null;
  localSettings: Record<string, number | boolean>;
}

const DEFAULT_STATE: ChooserState = {
  isVisible: false,
  selectedCategory: 'foundations',
  selectedExerciseId: null,
  localSettings: {},
};

function createChooserState() {
  let state = $state<ChooserState>({ ...DEFAULT_STATE });

  return {
    get state() {
      return state;
    },

    /**
     * Show the exercise chooser modal
     */
    show() {
      state.isVisible = true;
    },

    /**
     * Hide the exercise chooser modal
     */
    hide() {
      state.isVisible = false;
    },

    /**
     * Select a category and clear exercise selection
     */
    selectCategory(category: LessonCategory) {
      state.selectedCategory = category;
      state.selectedExerciseId = null;
      state.localSettings = {};
    },

    /**
     * Select an exercise and initialize its settings from schema defaults
     */
    selectExercise(exerciseId: string, settingsSchema?: LessonSettingsSchema) {
      state.selectedExerciseId = exerciseId;

      // Initialize local settings from schema defaults
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

    /**
     * Deselect the current exercise
     */
    deselectExercise() {
      state.selectedExerciseId = null;
      state.localSettings = {};
    },

    /**
     * Update a single local setting value
     */
    updateLocalSetting(key: string, value: number | boolean) {
      state.localSettings = { ...state.localSettings, [key]: value };
    },

    /**
     * Get current local settings
     */
    getLocalSettings(): Record<string, number | boolean> {
      return { ...state.localSettings };
    },

    /**
     * Clear all state and hide modal
     */
    clear() {
      state = { ...DEFAULT_STATE };
    },

    /**
     * Reset selection state without hiding modal
     */
    resetSelection() {
      state.selectedExerciseId = null;
      state.localSettings = {};
    },
  };
}

export const chooserState = createChooserState();
