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

const MAX_HISTORY_LENGTH = 200; // Cap history to bound trail render cost

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
      state.history.push(point);
      if (state.history.length > MAX_HISTORY_LENGTH) {
        state.history.shift();
      }
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
