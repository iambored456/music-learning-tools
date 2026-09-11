/**
 * Initial State Configuration
 *
 * Default state values for the notation engine.
 * This provides sensible defaults that can be overridden via configuration.
 */

import type { AppState, TimbresMap } from '@mlt/types';
import { fullRowData, resolvePitchRange } from './pitchData.js';

/**
 * Default ADSR envelope settings
 */
const DEFAULT_ADSR = {
  attack: 0.1,
  decay: 0.2,
  sustain: 0.8,
  release: 0.3
};

/**
 * Default filter settings
 */
const DEFAULT_FILTER = {
  enabled: true,
  blend: 1.0,
  cutoff: 16,
  resonance: 0,
  type: 'lowpass',
  mix: 0
};

/**
 * Default vibrato settings
 */
const DEFAULT_VIBRATO = {
  speed: 0,
  span: 0
};

/**
 * Default tremolo settings
 */
const DEFAULT_TREMOLO = {
  speed: 0,
  span: 0
};

/**
 * Create default timbres for each note color
 */
function createDefaultTimbres(): TimbresMap {
  const bins = 32;
  const startupPresetByColor: Record<string, 'sine' | 'triangle' | 'square' | 'sawtooth'> = {
    '#44bcef': 'sine',
    '#d293e0': 'triangle',
    '#ee9561': 'square',
    '#81c273': 'sawtooth'
  };
  const presetGain: Record<'sine' | 'triangle' | 'square' | 'sawtooth', number> = {
    sine: 1.0,
    triangle: 0.81,
    square: 4 / Math.PI,
    sawtooth: 2 / Math.PI
  };
  const timbres: TimbresMap = {};

  Object.entries(startupPresetByColor).forEach(([color, presetName]) => {
    const coeffs = new Float32Array(bins).fill(0);
    const phases = new Float32Array(bins).fill(0);

    if (presetName === 'sine') {
      coeffs[0] = 1.0;
    } else if (presetName === 'triangle') {
      for (let n = 1; n <= bins; n += 2) {
        const i = n - 1;
        coeffs[i] = 1 / (n * n);
        phases[i] = Math.PI / 2;
      }
    } else if (presetName === 'square') {
      for (let n = 1; n <= bins; n += 2) {
        const i = n - 1;
        coeffs[i] = 1 / n;
      }
    } else {
      for (let n = 1; n <= bins; n++) {
        const i = n - 1;
        coeffs[i] = 1 / n;
        phases[i] = (n % 2 === 1) ? 0 : Math.PI;
      }
    }

    timbres[color] = {
      name: presetName,
      adsr: { ...DEFAULT_ADSR },
      coeffs,
      phases,
      filter: { ...DEFAULT_FILTER },
      activePresetName: presetName,
      gain: presetGain[presetName],
      vibrato: { ...DEFAULT_VIBRATO },
      tremelo: { ...DEFAULT_TREMOLO }
    };
  });

  return timbres;
}

/**
 * Default rhythm configuration
 */
function getDefaultRhythm() {
  const macrobeatGroupings = new Array<2 | 3>(16).fill(2);
  const macrobeatBoundaryStyles = macrobeatGroupings
    .slice(0, -1)
    .map((_, index) => ((index + 1) % 4 === 0 ? 'solid' : 'dashed')) as ('dashed' | 'solid' | 'anacrusis')[];

  return {
    macrobeatGroupings,
    macrobeatBoundaryStyles,
    hasAnacrusis: false,
    baseMicrobeatPx: 40,
    tempoModulationMarkers: []
  };
}

/**
 * Calculate default pitch range (G5 to C4)
 */
function getDefaultPitchRange() {
  const range = resolvePitchRange('G5', 'C4');
  if (range) {
    return range;
  }
  // Fallback to full range if resolution fails
  return {
    topIndex: 0,
    bottomIndex: Math.max(0, fullRowData.length - 1)
  };
}

/**
 * Get the complete initial state
 */
export function getInitialState(): AppState {
  const timbres = createDefaultTimbres();

  return {
    // --- Data & History ---
    placedNotes: [],
    placedChords: [],
    tonicSignGroups: {},
    sixteenthStampPlacements: [],
    tripletStampPlacements: [],
    sixteenthThreeStampPlacements: [],
    annotations: [],
    lassoSelection: {
      selectedItems: [],
      convexHull: null,
      isActive: false
    },
    history: [{
      notes: [],
      tonicSignGroups: {},
      timbres: JSON.parse(JSON.stringify(timbres)),
      placedChords: [],
      sixteenthStampPlacements: [],
      tripletStampPlacements: [],
      sixteenthThreeStampPlacements: [],
      annotations: [],
      lassoSelection: { selectedItems: [], convexHull: null, isActive: false }
    }],
    historyIndex: 0,
    fullRowData: [...fullRowData],
    pitchRange: getDefaultPitchRange(),

    // --- Rhythm ---
    ...getDefaultRhythm(),
    selectedModulationRatio: null,

    // --- Timbres & Colors ---
    timbres,
    colorPalette: {
      '#44bcef': { primary: '#44bcef', light: '#5fd3ff' },
      '#d293e0': { primary: '#d293e0', light: '#e9a9f7' },
      '#ee9561': { primary: '#ee9561', light: '#ffab77' },
      '#81c273': { primary: '#81c273', light: '#97d889' }
    },

    // --- UI & View State ---
    selectedTool: 'note',
    previousTool: 'note',
    selectedToolTonicNumber: 0, // Sentinel: no tonic mode selected yet (valid modes are 1-7).
    selectedNote: { shape: 'circle', color: '#44bcef' },
    deviceProfile: {
      isMobile: false,
      isTouch: false,
      isCoarsePointer: false,
      orientation: 'landscape',
      width: 0,
      height: 0
    },
    activeChordId: null,
    activeChordIntervals: ['1P'], // Start with just root (U) selected
    isIntervalsInverted: false,
    chordPositionState: 0, // 0 = Root, 1 = 1st Inversion, 2 = 2nd Inversion

    gridPosition: 0,
    viewportRows: 0,
    logicRows: 0,
    cellWidth: 0,
    cellHeight: 0,
    columnWidths: [],
    musicalColumnWidths: [],
    degreeDisplayMode: 'off',
    showPitchLabels: false,
    showPitchOctaveLabels: false,
    accidentalMode: { sharp: true, flat: true },
    showFrequencyLabels: false,
    showOctaveLabels: true,
    focusColours: false,

    // --- Playback ---
    isPlaying: false,
    isPaused: false,
    isLooping: false,
    playbackStartMacrobeatIndex: null,
    tempo: 90,
    playheadMode: 'cursor',

    // --- Waveform ---
    waveformExtendedView: false,

    // --- ADSR ---
    adsrTimeAxisScale: 1.0,

    // --- Print ---
    isPrintPreviewActive: false,
    printOptions: {
      pageSize: 'letter',
      includeButtonGrid: true,
      includeDrums: true,
      includeLeftLegend: true,
      includeRightLegend: true,
      orientation: 'landscape',
      colorMode: 'color',
      cropTop: 0,
      cropBottom: 1.0,
      cropLeft: 0,
      cropRight: 1.0
    },

    // --- Long Notes Style ---
    longNoteStyle: 'style2'
  };
}
