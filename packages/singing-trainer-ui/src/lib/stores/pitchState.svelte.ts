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

export interface StablePitchHighlight {
  pitchClass: number;
  midi: number;
  opacity: number;
}

export interface StablePitch {
  highlights: StablePitchHighlight[];
  size: number;
}

export interface PitchState {
  currentPitch: DetectedPitch | null;
  history: PitchHistoryPoint[];
  stablePitch: StablePitch;
}

const DEFAULT_STATE: PitchState = {
  currentPitch: null,
  history: [],
  stablePitch: { highlights: [], size: 1.0 },
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
      // Prune points older than 30s to bound memory growth
      const cutoff = point.time - 30_000;
      while (state.history.length > 0 && state.history[0].time < cutoff) {
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
