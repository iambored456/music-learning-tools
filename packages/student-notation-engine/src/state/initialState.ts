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
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3
};

/**
 * Default filter settings
 */
const DEFAULT_FILTER = {
  type: 'lowpass' as const,
  frequency: 2000,
  Q: 1,
  gain: 0,
  enabled: false
};

/**
 * Create default timbres for each note color
 */
function createDefaultTimbres(): TimbresMap {
  const colors = [
    '#4a90e2', // Blue
    '#e24a4a', // Red
    '#4ae24a', // Green
    '#e2e24a', // Yellow
    '#e24ae2', // Magenta
    '#4ae2e2', // Cyan
    '#e2a04a', // Orange
    '#a04ae2'  // Purple
  ];

  const timbres: TimbresMap = {};

  colors.forEach(color => {
    // Create sine wave coefficients (only first harmonic)
    const coeffs = new Float32Array(32);
    coeffs[0] = 1.0; // Fundamental

    // Create zero phases
    const phases = new Float32Array(32);

    timbres[color] = {
      adsr: { ...DEFAULT_ADSR },
      coeffs,
      phases,
      filter: { ...DEFAULT_FILTER },
      activePresetName: 'sine'
    };
  });

  return timbres;
}

/**
 * Default rhythm configuration
 */
function getDefaultRhythm() {
  return {
    macrobeatGroupings: [2, 2, 2, 2] as (2 | 3)[],
    macrobeatBoundaryStyles: ['dashed', 'dashed', 'dashed', 'dashed'] as ('dashed' | 'solid' | 'anacrusis')[],
    hasAnacrusis: false,
    baseMicrobeatPx: 40,
    modulationMarkers: []
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
      '#4a90e2': { primary: '#4a90e2', light: '#a8c8f0' },
      '#e24a4a': { primary: '#e24a4a', light: '#f0a8a8' },
      '#4ae24a': { primary: '#4ae24a', light: '#a8f0a8' },
      '#e2e24a': { primary: '#e2e24a', light: '#f0f0a8' },
      '#e24ae2': { primary: '#e24ae2', light: '#f0a8f0' },
      '#4ae2e2': { primary: '#4ae2e2', light: '#a8f0f0' },
      '#e2a04a': { primary: '#e2a04a', light: '#f0d0a8' },
      '#a04ae2': { primary: '#a04ae2', light: '#d0a8f0' }
    },

    // --- UI & View State ---
    selectedTool: 'note',
    previousTool: 'note',
    selectedToolTonicNumber: 1,
    selectedNote: { shape: 'circle', color: '#4a90e2' },
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
    accidentalMode: { sharp: true, flat: true },
    showFrequencyLabels: false,
    showOctaveLabels: true,
    focusColours: false,

    // --- Playback ---
    isPlaying: false,
    isPaused: false,
    isLooping: false,
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
    longNoteStyle: 'style1'
  };
}
