import {
  BLOCK_TYPES,
  DRONE_OCTAVES,
  TONIC_VALUES,
  TOOL_TYPES,
  type NoteDefinition,
} from './types.js';

export const INITIAL_VISIBLE_ROWS = 4;
export const MIN_VISIBLE_ROWS = 1;
export const MAX_VISIBLE_ROWS = 8;

export const DEFAULT_ROW_WIDTH_MICROBEATS = 17;
export const MAX_ROW_WIDTH_MICROBEATS = 25;
export const MIN_MICROBEAT_PIXEL_WIDTH = 12;
export const TARGET_MICROBEAT_PIXEL_WIDTH = 32;

export const MICROBEAT_TEMPO_MIN = 40;
export const MICROBEAT_TEMPO_MAX = 360;

export const MIN_MEASURE_MICROBEATS = 4;

export const BLOCK_MICROBEAT_CAPACITIES: Record<(typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES], number> = {
  '2S': 2,
  '2C': 2,
  '2E': 2,
  '3S': 3,
  '3C': 3,
  '3E': 3,
};

export const BLOCK_LABELS: Record<(typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES], string> = {
  '2S': '2 Start',
  '2C': '2 Cont.',
  '2E': '2 End',
  '3S': '3 Start',
  '3C': '3 Cont.',
  '3E': '3 End',
};

export const NOTE_BANK_DIATONIC_DEGREES: NoteDefinition[] = [
  { id: '1', label: '1', interval: 0, colorId: '1' },
  { id: 's1', label: '♯1', interval: 1, colorId: 'b2_s1', aliasId: 'b2' },
  { id: 'b2', label: '♭2', interval: 1, colorId: 'b2_s1', aliasId: 's1' },
  { id: '2', label: '2', interval: 2, colorId: '2' },
  { id: 's2', label: '♯2', interval: 3, colorId: 'b3_s2', aliasId: 'b3' },
  { id: 'b3', label: '♭3', interval: 3, colorId: 'b3_s2', aliasId: 's2' },
  { id: '3', label: '3', interval: 4, colorId: '3' },
  { id: '4', label: '4', interval: 5, colorId: '4' },
  { id: 's4', label: '♯4', interval: 6, colorId: 'b5_s4', aliasId: 'b5' },
  { id: 'b5', label: '♭5', interval: 6, colorId: 'b5_s4', aliasId: 's4' },
  { id: '5', label: '5', interval: 7, colorId: '5' },
  { id: 's5', label: '♯5', interval: 8, colorId: 'b6_s5', aliasId: 'b6' },
  { id: 'b6', label: '♭6', interval: 8, colorId: 'b6_s5', aliasId: 's5' },
  { id: '6', label: '6', interval: 9, colorId: '6' },
  { id: 's6', label: '♯6', interval: 10, colorId: 'b7_s6', aliasId: 'b7' },
  { id: 'b7', label: '♭7', interval: 10, colorId: 'b7_s6', aliasId: 's6' },
  { id: '7', label: '7', interval: 11, colorId: '7' },
  { id: 'oct', label: '^1', interval: 12, colorId: '1' },
];

export const NOTE_BANK_DISPLAY_GROUPS: Array<{
  natural: string;
  sharp: string | null;
  flat: string | null;
}> = [
  { natural: '1', sharp: 's1', flat: 'b2' },
  { natural: '2', sharp: 's2', flat: 'b3' },
  { natural: '3', sharp: null, flat: null },
  { natural: '4', sharp: 's4', flat: 'b5' },
  { natural: '5', sharp: 's5', flat: 'b6' },
  { natural: '6', sharp: 's6', flat: 'b7' },
  { natural: '7', sharp: null, flat: null },
  { natural: 'oct', sharp: null, flat: null },
];

export const TONIC_OPTIONS = [
  { value: 'C', label: 'C' },
  { value: 'C#', label: 'C♯/D♭' },
  { value: 'D', label: 'D' },
  { value: 'D#', label: 'D♯/E♭' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'F#', label: 'F♯/G♭' },
  { value: 'G', label: 'G' },
  { value: 'G#', label: 'G♯/A♭' },
  { value: 'A', label: 'A' },
  { value: 'A#', label: 'A♯/B♭' },
  { value: 'B', label: 'B' },
] as const;

export const ERASER_TOOL_ID = 'eraser';

export const KEY_CODES = {
  SPACE: 'Space',
  TAB: 'Tab',
  ENTER: 'Enter',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  KEY_P: 'KeyP',
  KEY_O: 'KeyO',
  KEY_Z: 'KeyZ',
  KEY_Y: 'KeyY',
  DIGIT_1: 'Digit1',
  DIGIT_2: 'Digit2',
  DIGIT_3: 'Digit3',
  DIGIT_4: 'Digit4',
  DIGIT_5: 'Digit5',
  DIGIT_6: 'Digit6',
  DIGIT_7: 'Digit7',
  DIGIT_8: 'Digit8',
  DIGIT_9: 'Digit9',
  DIGIT_0: 'Digit0',
  MINUS: 'Minus',
  EQUAL: 'Equal',
} as const;

export const KEYBOARD_ZONES = {
  TOOLS_CONFIG: 'toolsConfig',
  NOTE_BANK: 'noteBank',
  BLOCK_PALETTE: 'blockPalette',
  CANVAS: 'canvas',
} as const;

export const DEFAULTS = {
  ROOT_TONIC: 'C',
  DRONE_OCTAVE: 4,
  ACTIVE_TOOL: {
    type: TOOL_TYPES.BLOCK,
    id: BLOCK_TYPES.START_2,
  },
  MAIN_PLAYBACK_VOICE: 'triangle',
  DRONE_VOICE: 'sawtooth',
  DRONE_IS_ON: false,
  MAIN_VOLUME: 0.75,
  DRONE_VOLUME: 0.5,
  MICROBEAT_TEMPO: 180,
  INITIAL_KEYBOARD_FOCUS_ZONE: KEYBOARD_ZONES.CANVAS,
} as const;

export const MAIN_PLAYBACK_SYNTH_PROFILE = {
  oscillatorType: DEFAULTS.MAIN_PLAYBACK_VOICE,
  envelope: {
    attack: 0.005,
    decay: 0.1,
    sustain: 0.2,
    release: 0.3,
  },
} as const;

export const COLOR_PALETTE = {
  '1': '#f090ae',
  b2_s1: '#f59383',
  '2': '#ea9e5e',
  b3_s2: '#d0ae4e',
  '3': '#a8bd61',
  '4': '#76c788',
  b5_s4: '#41cbb5',
  '5': '#33c6dc',
  b6_s5: '#62bbf7',
  '6': '#94adff',
  b7_s6: '#bea0f3',
  '7': '#dd95d6',
  HIGHLIGHT_YELLOW: '#fffacd',
  HIGHLIGHT_RED: '#ffb6c1',
  EMPTY_MICROBEAT_OVAL_FILL: '#ecf0f1',
  PLACED_NOTE_TEXT_COLOR: '#2c3e50',
  PLACED_NOTE_STROKE_COLOR: '#34495e',
} as const;

export const CHROMANOTES_PALETTE = {
  '1': '#e20011',
  b2_s1: '#e32302',
  '2': '#ef6602',
  b3_s2: '#f5c202',
  '3': '#f8df01',
  '4': '#a7dd12',
  b5_s4: '#5ac757',
  '5': '#006e6d',
  b6_s5: '#0057b9',
  '6': '#262388',
  b7_s6: '#6e2771',
  '7': '#b9017a',
} as const;

export const HISTORY_MAX_SIZE = 50;

export const EXPORTS_SANITY = {
  DRONE_OCTAVES,
  TONIC_VALUES,
};
