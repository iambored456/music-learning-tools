import {
  DEFAULTS,
  MAX_VISIBLE_ROWS,
} from './constants.js';
import {
  DRONE_OCTAVES,
  TONIC_VALUES,
  type HistorySnapshot,
  type SimpleNotationState,
  type ScoreRow,
  type TonicValue,
  type DroneOctave,
} from './types.js';
import { createUniqueId, deepClone } from './utils.js';

export function createInitialScoreData(totalRows = MAX_VISIBLE_ROWS): ScoreRow[] {
  return Array.from({ length: totalRows }, () => ({
    id: createUniqueId('row'),
    blocks: [],
  }));
}

export function createHistorySnapshot(state: SimpleNotationState): HistorySnapshot {
  return {
    rootNoteTonic: state.rootNoteTonic,
    droneOctave: state.droneOctave,
    activeTool: deepClone(state.activeTool),
    scoreData: deepClone(state.scoreData),
    visibleRowsCount: state.visibleRowsCount,
  };
}

export function createInitialState(): SimpleNotationState {
  const safeRoot = TONIC_VALUES.includes(DEFAULTS.ROOT_TONIC as TonicValue)
    ? (DEFAULTS.ROOT_TONIC as TonicValue)
    : 'C';

  const safeOctave = DRONE_OCTAVES.includes(DEFAULTS.DRONE_OCTAVE as DroneOctave)
    ? (DEFAULTS.DRONE_OCTAVE as DroneOctave)
    : 3;

  return {
    rootNoteTonic: safeRoot,
    droneOctave: safeOctave,
    activeTool: deepClone(DEFAULTS.ACTIVE_TOOL),
    keyboardFocusZone: DEFAULTS.INITIAL_KEYBOARD_FOCUS_ZONE,
    mainPlaybackVoice: DEFAULTS.MAIN_PLAYBACK_VOICE,
    droneVoice: DEFAULTS.DRONE_VOICE,
    droneIsOn: DEFAULTS.DRONE_IS_ON,
    mainVolume: DEFAULTS.MAIN_VOLUME,
    droneVolume: DEFAULTS.DRONE_VOLUME,
    microbeatTempo: DEFAULTS.MICROBEAT_TEMPO,
    scoreData: createInitialScoreData(),
    visibleRowsCount: 4,
    history: [],
    historyPointer: -1,
    lastCanvasInteraction: {
      rowIndex: 0,
      microbeatIndex: 0,
    },
  };
}
