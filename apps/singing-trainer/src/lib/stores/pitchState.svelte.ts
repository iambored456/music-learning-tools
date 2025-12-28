/**
 * Pitch State Store - Svelte 5 Runes
 *
 * Real-time pitch detection state including current pitch and history.
 */

export interface DetectedPitch {
  frequency: number;
  midi: number;
  clarity: number;
  pitchClass: number;
}

export interface PitchHistoryPoint {
  frequency: number;
  midi: number;
  time: number;
  clarity: number;
}

export interface StablePitch {
  pitchClass: number | null;
  opacity: number;
  size: number;
}

export interface PitchState {
  currentPitch: DetectedPitch | null;
  history: PitchHistoryPoint[];
  stablePitch: StablePitch;
}

const MAX_HISTORY_LENGTH = 500; // Enough for 4+ seconds at 120fps

const DEFAULT_STATE: PitchState = {
  currentPitch: null,
  history: [],
  stablePitch: { pitchClass: null, opacity: 0, size: 1.0 },
};

function createPitchState() {
  let state = $state<PitchState>({ ...DEFAULT_STATE });

  return {
    get state() {
      return state;
    },

    setCurrentPitch(pitch: DetectedPitch | null) {
      state.currentPitch = pitch;
    },

    addHistoryPoint(point: PitchHistoryPoint) {
      const newHistory = [...state.history, point];
      if (newHistory.length > MAX_HISTORY_LENGTH) {
        newHistory.shift();
      }
      state.history = newHistory;
    },

    setStablePitch(stable: StablePitch) {
      state.stablePitch = stable;
    },

    clearHistory() {
      state.history = [];
    },

    reset() {
      state = { ...DEFAULT_STATE };
    },
  };
}

export const pitchState = createPitchState();
