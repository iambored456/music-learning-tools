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
  inputLevelDb: number | null;
  error: string | null;
  activeDeviceId: string | null;
  activeGroupId: string | null;
}

const DEFAULT_STATE: PitchState = {
  currentPitch: null,
  history: [],
  stablePitch: { highlights: [], size: 1.0 },
  inputLevelDb: null,
  error: null,
  activeDeviceId: null,
  activeGroupId: null,
};

function createPitchState() {
  let state = $state<PitchState>({ ...DEFAULT_STATE, history: [], stablePitch: { highlights: [], size: 1.0 } });

  return {
    get state() {
      return state;
    },

    setCurrentPitch(pitch: DetectedPitch | null) {
      state.currentPitch = pitch;
    },

    addHistoryPoint(point: PitchHistoryPoint) {
      state.history.push(point);
    },

    setStablePitch(stable: StablePitch) {
      state.stablePitch = stable;
    },

    setInputLevelDb(levelDb: number | null) {
      state.inputLevelDb = Number.isFinite(levelDb) ? (levelDb as number) : null;
    },

    setError(error: string | null) {
      state.error = error;
    },

    setActiveDevice(deviceId: string | null, groupId: string | null = null) {
      state.activeDeviceId = deviceId;
      state.activeGroupId = groupId;
    },

    clearHistory() {
      state.history = [];
    },

    reset() {
      state = { ...DEFAULT_STATE, history: [], stablePitch: { highlights: [], size: 1.0 } };
    },
  };
}

export const pitchState = createPitchState();

export const secondPitchState = createPitchState();

// Session-only: adding a second input always starts with an explicit user action.
export const duetState = $state({ enabled: false });
