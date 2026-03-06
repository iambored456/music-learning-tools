export const TONIC_VALUES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type TonicValue = (typeof TONIC_VALUES)[number];

export const DRONE_OCTAVES = [2, 3, 4, 5] as const;
export type DroneOctave = (typeof DRONE_OCTAVES)[number];

export const TOOL_TYPES = {
  NOTE: 'NOTE_TOOL',
  ERASER: 'ERASER_TOOL',
  BLOCK: 'BLOCK_TOOL',
} as const;

export type ToolType = (typeof TOOL_TYPES)[keyof typeof TOOL_TYPES];

export const BLOCK_TYPES = {
  START_2: '2S',
  CONTINUE_2: '2C',
  END_2: '2E',
  START_3: '3S',
  CONTINUE_3: '3C',
  END_3: '3E',
} as const;

export type BlockType = (typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES];

export type KeyboardZone = 'toolsConfig' | 'noteBank' | 'blockPalette' | 'canvas';

export type ActiveTool = {
  type: ToolType;
  id: string;
};

export type NoteDefinition = {
  id: string;
  label: string;
  interval: number;
  colorId: string;
  aliasId?: string;
};

export type NoteData = {
  pitchInterval: number;
};

export type MacrobeatBlock = {
  id: string;
  type: BlockType;
  position: number;
  notes: Array<NoteData | null>;
};

export type ScoreRow = {
  id: string;
  blocks: MacrobeatBlock[];
};

export type HistorySnapshot = {
  rootNoteTonic: TonicValue;
  droneOctave: DroneOctave;
  activeTool: ActiveTool;
  scoreData: ScoreRow[];
  visibleRowsCount: number;
};

export type BoomwhackerSketchpadState = {
  rootNoteTonic: TonicValue;
  droneOctave: DroneOctave;
  activeTool: ActiveTool;
  keyboardFocusZone: KeyboardZone;
  mainPlaybackVoice: OscillatorType;
  droneVoice: OscillatorType;
  droneIsOn: boolean;
  mainVolume: number;
  droneVolume: number;
  microbeatTempo: number;
  scoreData: ScoreRow[];
  visibleRowsCount: number;
  history: HistorySnapshot[];
  historyPointer: number;
  lastCanvasInteraction: {
    rowIndex: number;
    microbeatIndex: number;
  };
};

export type BlockValidationInput = {
  rowBlocks: MacrobeatBlock[];
  blockType: BlockType;
  microbeatPosition: number;
  rowMaxMicrobeats: number;
};

export type PlaybackTick = {
  microbeatGlobalIndex: number;
  rowIndex: number;
  microbeatIndexInRow: number;
};
