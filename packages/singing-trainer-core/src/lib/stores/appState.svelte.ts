/**
 * App State Store - Svelte 5 Runes
 *
 * Main application state for the Singing Trainer.
 */

import {
  DEFAULT_TANPURA_STRING_BEHAVIORS,
  DEFAULT_TANPURA_TUNING_BEHAVIOR,
  normalizeTanpuraStringBehavior,
  normalizeTanpuraTuningBehavior,
  type DroneEngine,
  type TanpuraStringBehavior,
  type TanpuraTuningBehavior,
} from '@mlt/tanpura-drone';

export type VisualizationMode = 'stationary' | 'highway';
export type LyricLabelMode = 'auto' | 'fixed';
export type NoteColorMode = 'green' | 'pitchColor';
export type NoteType = 'stadium' | 'gradient';
export type BeatLineMode = 'none' | 'beat' | 'bar';
export type MicTrailColorMode = 'voice' | 'rainbow';
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
  engine: DroneEngine;
  tuning: TanpuraTuningBehavior;
  strings: TanpuraStringBehavior[];
  modeEnabled: boolean;
  selectedMode: string;
  focusLegend: boolean;
  showDegrees: boolean;
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
  noteType: NoteType;
  beatLineMode: BeatLineMode;
  showBeatGridLines: boolean;
  showMeasureGridLines: boolean;
  showHorizontalGridLines: boolean;
  overdubMicTrailColorMode: MicTrailColorMode;
  judgementLineCircleRadiusPx: number;
  micTrailCircleRadiusPx: number;
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
  drone: {
    isPlaying: false,
    octave: 3,
    volume: -12,
    engine: 'tanpura',
    tuning: { ...DEFAULT_TANPURA_TUNING_BEHAVIOR },
    strings: DEFAULT_TANPURA_STRING_BEHAVIORS.map((item) => ({ ...item })),
    modeEnabled: false,
    selectedMode: '1',
    focusLegend: false,
    showDegrees: false,
  },
  lyricLabelMode: 'auto',
  lyricLabelScale: 1,
  lyricLabelFixedPx: 16,
  noteColorMode: 'green',
  noteType: 'stadium',
  beatLineMode: 'bar',
  showBeatGridLines: false,
  showMeasureGridLines: true,
  showHorizontalGridLines: true,
  overdubMicTrailColorMode: 'rainbow',
  judgementLineCircleRadiusPx: 12,
  micTrailCircleRadiusPx: 5,
};

function createAppState() {
  let state = $state<AppState>({ ...DEFAULT_STATE });

  function syncLegacyBeatLineMode(): void {
    if (state.showMeasureGridLines) {
      state.beatLineMode = state.showBeatGridLines ? 'beat' : 'bar';
      return;
    }
    state.beatLineMode = state.showBeatGridLines ? 'beat' : 'none';
  }

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

    setNoteType(noteType: NoteType) {
      state.noteType = noteType;
    },

    setBeatLineMode(mode: BeatLineMode) {
      state.beatLineMode = mode;
      switch (mode) {
        case 'none':
          state.showBeatGridLines = false;
          state.showMeasureGridLines = false;
          break;
        case 'bar':
          state.showBeatGridLines = false;
          state.showMeasureGridLines = true;
          break;
        case 'beat':
        default:
          state.showBeatGridLines = true;
          state.showMeasureGridLines = true;
          break;
      }
    },

    setShowBeatGridLines(show: boolean) {
      state.showBeatGridLines = show;
      syncLegacyBeatLineMode();
    },

    setShowMeasureGridLines(show: boolean) {
      state.showMeasureGridLines = show;
      syncLegacyBeatLineMode();
    },

    setShowHorizontalGridLines(show: boolean) {
      state.showHorizontalGridLines = show;
    },

    setOverdubMicTrailColorMode(mode: MicTrailColorMode) {
      state.overdubMicTrailColorMode = mode;
    },

    setJudgementLineCircleRadiusPx(radius: number) {
      if (!Number.isFinite(radius)) return;
      state.judgementLineCircleRadiusPx = Math.max(4, Math.min(36, Math.round(radius * 10) / 10));
    },

    setMicTrailCircleRadiusPx(radius: number) {
      if (!Number.isFinite(radius)) return;
      state.micTrailCircleRadiusPx = Math.max(2, Math.min(24, Math.round(radius * 10) / 10));
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

    setDronePlaying(isPlaying: boolean) {
      state.drone = { ...state.drone, isPlaying };
    },

    setDroneOctave(octave: number) {
      state.drone = { ...state.drone, octave };
    },

    setDroneVolume(volume: number) {
      state.drone = { ...state.drone, volume };
    },

    setDroneEngine(engine: DroneEngine) {
      state.drone = { ...state.drone, engine };
    },

    setDroneTuning(tuning: Partial<TanpuraTuningBehavior>) {
      state.drone = {
        ...state.drone,
        tuning: normalizeTanpuraTuningBehavior({
          ...state.drone.tuning,
          ...tuning,
        }),
      };
    },

    resetDroneTuning() {
      state.drone = {
        ...state.drone,
        tuning: { ...DEFAULT_TANPURA_TUNING_BEHAVIOR },
      };
    },

    setDroneString(index: number, patch: Partial<TanpuraStringBehavior>) {
      if (index < 0 || index >= state.drone.strings.length) return;
      state.drone = {
        ...state.drone,
        strings: state.drone.strings.map((item, i) =>
          i === index ? normalizeTanpuraStringBehavior({ ...item, ...patch }, item) : item
        ),
      };
    },

    resetDroneStrings() {
      state.drone = {
        ...state.drone,
        strings: DEFAULT_TANPURA_STRING_BEHAVIORS.map((item) => ({ ...item })),
      };
    },

    setDroneModeEnabled(enabled: boolean) {
      state.drone = { ...state.drone, modeEnabled: enabled };
    },

    setDroneSelectedMode(modeKey: string) {
      state.drone = { ...state.drone, selectedMode: modeKey };
    },

    setDroneFocusLegend(enabled: boolean) {
      state.drone = { ...state.drone, focusLegend: enabled };
    },

    setDroneShowDegrees(enabled: boolean) {
      state.drone = { ...state.drone, showDegrees: enabled };
    },

    reset() {
      state = { ...DEFAULT_STATE };
    },
  };
}

export const appState = createAppState();
