/**
 * Preferences Store
 *
 * Manages user preferences for the singing trainer, including the
 * calibrated speaking pitch. Persists to localStorage.
 */

import type { SpeakingPitchCalibration } from '../calibration/types.js';
import { midiToNoteName } from '../calibration/speakingPitchCalibration.js';

/** localStorage key for preferences */
const PREFERENCES_KEY = 'singingTrainerPreferences';

/** Preferences structure */
export interface SingingTrainerPreferences {
  speakingPitch: SpeakingPitchCalibration | null;
}

/** Default preferences */
const DEFAULT_PREFERENCES: SingingTrainerPreferences = {
  speakingPitch: null,
};

/**
 * Load preferences from localStorage
 */
function loadPreferences(): SingingTrainerPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return validatePreferences(parsed);
    }
  } catch (error) {
    console.warn('[preferencesStore] Failed to load preferences:', error);
  }
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Save preferences to localStorage
 */
function savePreferences(prefs: SingingTrainerPreferences): boolean {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    return true;
  } catch (error) {
    console.error('[preferencesStore] Failed to save preferences:', error);
    return false;
  }
}

/**
 * Validate loaded preferences
 */
function validatePreferences(data: unknown): SingingTrainerPreferences {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_PREFERENCES };
  }

  const prefs = data as Record<string, unknown>;
  const result: SingingTrainerPreferences = { ...DEFAULT_PREFERENCES };

  // Validate speaking pitch
  if (prefs.speakingPitch && typeof prefs.speakingPitch === 'object') {
    const sp = prefs.speakingPitch as Record<string, unknown>;
    if (
      typeof sp.speakingPitchMidi === 'number' &&
      sp.speakingPitchMidi >= 0 &&
      sp.speakingPitchMidi <= 127 &&
      typeof sp.speakingPitchLastCalibratedAt === 'string'
    ) {
      result.speakingPitch = {
        speakingPitchMidi: sp.speakingPitchMidi,
        speakingPitchLastCalibratedAt: sp.speakingPitchLastCalibratedAt,
      };
    }
  }

  return result;
}

/**
 * Convert MIDI to frequency in Hz
 */
function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Format date for display
 */
function formatCalibrationDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

/**
 * Create the preferences store
 */
function createPreferencesStore() {
  let state = $state<SingingTrainerPreferences>(loadPreferences());

  return {
    /** Get the full state (for debugging) */
    get state() {
      return state;
    },

    /** Get the speaking pitch MIDI value (null if not calibrated) */
    get speakingPitchMidi(): number | null {
      return state.speakingPitch?.speakingPitchMidi ?? null;
    },

    /** Get the speaking pitch in Hz (null if not calibrated) */
    get speakingPitchHz(): number | null {
      const midi = state.speakingPitch?.speakingPitchMidi;
      return midi !== undefined ? midiToFrequency(midi) : null;
    },

    /** Get the speaking pitch as a note name (null if not calibrated) */
    get speakingPitchNoteName(): string | null {
      const midi = state.speakingPitch?.speakingPitchMidi;
      return midi !== undefined ? midiToNoteName(midi) : null;
    },

    /** Check if the user has calibrated their speaking pitch */
    get isCalibrated(): boolean {
      return state.speakingPitch !== null;
    },

    /** Get the last calibration date as a formatted string */
    get lastCalibratedDate(): string | null {
      if (!state.speakingPitch?.speakingPitchLastCalibratedAt) {
        return null;
      }
      return formatCalibrationDate(state.speakingPitch.speakingPitchLastCalibratedAt);
    },

    /** Get the last calibration ISO timestamp */
    get lastCalibratedIso(): string | null {
      return state.speakingPitch?.speakingPitchLastCalibratedAt ?? null;
    },

    /**
     * Set the speaking pitch calibration
     */
    setSpeakingPitch(calibration: SpeakingPitchCalibration): boolean {
      state = {
        ...state,
        speakingPitch: { ...calibration },
      };
      return savePreferences(state);
    },

    /**
     * Clear the speaking pitch calibration
     */
    clearSpeakingPitch(): boolean {
      state = {
        ...state,
        speakingPitch: null,
      };
      return savePreferences(state);
    },

    /**
     * Adjust the speaking pitch by a number of semitones
     */
    adjustSpeakingPitch(semitones: number): boolean {
      if (!state.speakingPitch) {
        return false;
      }

      const newMidi = state.speakingPitch.speakingPitchMidi + semitones;

      // Validate bounds
      if (newMidi < 0 || newMidi > 127) {
        return false;
      }

      state = {
        ...state,
        speakingPitch: {
          ...state.speakingPitch,
          speakingPitchMidi: newMidi,
          // Keep original calibration date - this is an adjustment, not recalibration
        },
      };
      return savePreferences(state);
    },

    /**
     * Reload preferences from localStorage
     */
    reload(): void {
      state = loadPreferences();
    },

    /**
     * Reset all preferences to defaults
     */
    reset(): boolean {
      state = { ...DEFAULT_PREFERENCES };
      return savePreferences(state);
    },
  };
}

/** Singleton preferences store instance */
export const preferencesStore = createPreferencesStore();
