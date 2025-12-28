/**
 * App State Store - Svelte 5 Runes
 *
 * Main application state for the Singing Trainer.
 */

export type VisualizationMode = 'stationary' | 'highway';
export type TonicNote =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B';

export interface DroneState {
  isPlaying: boolean;
  octave: number;
  volume: number;
}

export interface YAxisRange {
  minMidi: number;
  maxMidi: number;
}

export interface AppState {
  isDetecting: boolean;
  visualizationMode: VisualizationMode;
  tonic: TonicNote;
  useDegrees: boolean;
  showAccidentals: boolean;
  yAxisRange: YAxisRange;
  drone: DroneState;
}

const DEFAULT_STATE: AppState = {
  isDetecting: false,
  visualizationMode: 'stationary',
  tonic: 'C',
  useDegrees: false,
  showAccidentals: true,
  yAxisRange: { minMidi: 48, maxMidi: 72 }, // C3 to C5
  drone: { isPlaying: false, octave: 3, volume: -12 },
};

function createAppState() {
  let state = $state<AppState>({ ...DEFAULT_STATE });

  return {
    get state() {
      return state;
    },

    toggleDetecting() {
      state.isDetecting = !state.isDetecting;
    },

    setDetecting(isDetecting: boolean) {
      state.isDetecting = isDetecting;
    },

    setVisualizationMode(mode: VisualizationMode) {
      state.visualizationMode = mode;
    },

    setTonic(tonic: TonicNote) {
      state.tonic = tonic;
    },

    setUseDegrees(useDegrees: boolean) {
      state.useDegrees = useDegrees;
    },

    setShowAccidentals(show: boolean) {
      state.showAccidentals = show;
    },

    setYAxisRange(range: YAxisRange) {
      state.yAxisRange = range;
    },

    expandYAxisUpper() {
      if (state.yAxisRange.maxMidi < 108) {
        state.yAxisRange = { ...state.yAxisRange, maxMidi: state.yAxisRange.maxMidi + 1 };
      }
    },

    contractYAxisUpper() {
      if (state.yAxisRange.maxMidi > state.yAxisRange.minMidi + 6) {
        state.yAxisRange = { ...state.yAxisRange, maxMidi: state.yAxisRange.maxMidi - 1 };
      }
    },

    expandYAxisLower() {
      if (state.yAxisRange.minMidi > 21) {
        state.yAxisRange = { ...state.yAxisRange, minMidi: state.yAxisRange.minMidi - 1 };
      }
    },

    contractYAxisLower() {
      if (state.yAxisRange.minMidi < state.yAxisRange.maxMidi - 6) {
        state.yAxisRange = { ...state.yAxisRange, minMidi: state.yAxisRange.minMidi + 1 };
      }
    },

    toggleDrone() {
      state.drone = { ...state.drone, isPlaying: !state.drone.isPlaying };
    },

    setDroneOctave(octave: number) {
      state.drone = { ...state.drone, octave };
    },

    setDroneVolume(volume: number) {
      state.drone = { ...state.drone, volume };
    },

    reset() {
      state = { ...DEFAULT_STATE };
    },
  };
}

export const appState = createAppState();
