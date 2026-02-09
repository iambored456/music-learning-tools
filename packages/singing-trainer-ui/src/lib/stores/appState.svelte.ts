/**
 * App State Store - Svelte 5 Runes
 *
 * Main application state for the Singing Trainer.
 */

export type VisualizationMode = 'stationary' | 'highway';
export type LyricLabelMode = 'auto' | 'fixed';
export type NoteColorMode = 'green' | 'pitchColor';
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
  modeEnabled: boolean;
  selectedMode: string;
}

export interface YAxisRange {
  minMidi: number;
  maxMidi: number;
}

export interface TonicSegment {
  startMs: number;
  endMs: number;
  tonic: TonicNote;
  tonicPc: number;
}

export interface AppState {
  isDetecting: boolean;
  visualizationMode: VisualizationMode;
  tonic: TonicNote;
  tonicSegments: TonicSegment[];
  noteScaleDegrees: string[];
  useDegrees: boolean;
  showAccidentals: boolean;
  pitchHighlightEnabled: boolean;
  yAxisRange: YAxisRange;
  drone: DroneState;
  lyricLabelMode: LyricLabelMode;
  lyricLabelScale: number;
  lyricLabelFixedPx: number;
  noteColorMode: NoteColorMode;
}

const DEFAULT_STATE: AppState = {
  isDetecting: false,
  visualizationMode: 'highway',
  tonic: 'C',
  tonicSegments: [],
  noteScaleDegrees: [],
  useDegrees: false,
  showAccidentals: true,
  pitchHighlightEnabled: true,
  yAxisRange: { minMidi: 40, maxMidi: 72 }, // E2 to C5
  drone: { isPlaying: false, octave: 3, volume: -12, modeEnabled: false, selectedMode: '1' },
  lyricLabelMode: 'auto',
  lyricLabelScale: 1,
  lyricLabelFixedPx: 16,
  noteColorMode: 'green',
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
      state.tonicSegments = [];
    },

    setTonicSegments(segments: TonicSegment[]) {
      state.tonicSegments = segments;
      if (segments.length > 0) {
        state.tonic = segments[0].tonic;
      }
    },

    getTonicAt(timeMs: number): TonicNote {
      if (state.tonicSegments.length === 0) return state.tonic;
      for (const seg of state.tonicSegments) {
        if (timeMs >= seg.startMs && timeMs <= seg.endMs) return seg.tonic;
      }
      return state.tonicSegments[state.tonicSegments.length - 1].tonic;
    },

    setNoteScaleDegrees(degrees: string[]) {
      state.noteScaleDegrees = degrees;
    },

    setUseDegrees(useDegrees: boolean) {
      state.useDegrees = useDegrees;
    },

    setShowAccidentals(show: boolean) {
      state.showAccidentals = show;
    },

    togglePitchHighlight() {
      state.pitchHighlightEnabled = !state.pitchHighlightEnabled;
    },

    setPitchHighlightEnabled(enabled: boolean) {
      state.pitchHighlightEnabled = enabled;
    },

    setLyricLabelMode(mode: LyricLabelMode) {
      state.lyricLabelMode = mode;
    },

    setLyricLabelScale(scale: number) {
      if (!Number.isFinite(scale)) return;
      state.lyricLabelScale = Math.max(0.5, Math.min(2.5, scale));
    },

    setLyricLabelFixedPx(px: number) {
      if (!Number.isFinite(px)) return;
      state.lyricLabelFixedPx = Math.max(8, Math.min(48, Math.round(px)));
    },

    setNoteColorMode(mode: NoteColorMode) {
      state.noteColorMode = mode;
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

    setDroneModeEnabled(enabled: boolean) {
      state.drone = { ...state.drone, modeEnabled: enabled };
    },

    setDroneSelectedMode(modeKey: string) {
      state.drone = { ...state.drone, selectedMode: modeKey };
    },

    reset() {
      state = { ...DEFAULT_STATE };
    },
  };
}

export const appState = createAppState();
