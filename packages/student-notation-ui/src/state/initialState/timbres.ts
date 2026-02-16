// js/state/initialState/timbres.ts

import { HARMONIC_BINS } from '@/core/constants.ts';

interface FilterState {
  enabled: boolean;
  blend: number;
  cutoff: number;
  resonance: number;
  type: string;
  mix: number;
}

interface VibratoState {
  speed: number;
  span: number;
}

interface TremoloState {
  speed: number;
  span: number;
}

interface ColorPaletteEntry {
  primary: string;
  light: string;
}

type ColorPalette = Record<string, ColorPaletteEntry>;

interface TimbreData {
  name: string;
  adsr: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  coeffs: Float32Array;
  phases: Float32Array;
  activePresetName: string;
  gain: number;
  filter: FilterState;
  vibrato: VibratoState;
  tremelo: TremoloState;
}

interface TimbresState {
  timbres: Record<string, TimbreData>;
  colorPalette: ColorPalette;
}

export const createDefaultFilterState = (): FilterState => ({
  enabled: true,
  blend: 1.0,
  cutoff: 16,
  resonance: 0,
  type: 'lowpass',
  mix: 0
});

export const createDefaultVibratoState = (): VibratoState => ({
  speed: 0,
  span: 0
});

export const createDefaultTremoloState = (): TremoloState => ({
  speed: 0,
  span: 0
});

export const defaultColorPalette: ColorPalette = {
  '#4a90e2': { primary: '#4a90e2', light: '#63a9fd' },
  '#68a03f': { primary: '#68a03f', light: '#80b958' },
  '#d66573': { primary: '#d66573', light: '#f27e8b' },
  '#2d2d2d': { primary: '#2d2d2d', light: '#424242' }
};

function createTimbreForPreset(name: string, presetName: 'sine' | 'triangle' | 'square' | 'sawtooth'): TimbreData {
  const coeffs = new Float32Array(HARMONIC_BINS).fill(0);
  const phases = new Float32Array(HARMONIC_BINS).fill(0);
  const presetGain: Record<'sine' | 'triangle' | 'square' | 'sawtooth', number> = {
    sine: 1.0,
    triangle: 0.81,
    square: 4 / Math.PI,
    sawtooth: 2 / Math.PI
  };

  if (presetName === 'sine') {
    coeffs[0] = 1;
  } else if (presetName === 'triangle') {
    for (let n = 1; n <= HARMONIC_BINS; n += 2) {
      const i = n - 1;
      coeffs[i] = 1 / (n * n);
      phases[i] = Math.PI / 2;
    }
  } else if (presetName === 'square') {
    for (let n = 1; n <= HARMONIC_BINS; n += 2) {
      const i = n - 1;
      coeffs[i] = 1 / n;
    }
  } else {
    for (let n = 1; n <= HARMONIC_BINS; n++) {
      const i = n - 1;
      coeffs[i] = 1 / n;
      phases[i] = (n % 2 === 1) ? 0 : Math.PI;
    }
  }

  return {
    name,
    adsr: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.3 },
    coeffs,
    phases,
    activePresetName: presetName,
    gain: presetGain[presetName],
    filter: createDefaultFilterState(),
    vibrato: createDefaultVibratoState(),
    tremelo: createDefaultTremoloState()
  };
}

export function getInitialTimbresState(): TimbresState {
  return {
    timbres: {
      '#4a90e2': createTimbreForPreset('Blue', 'sine'),
      '#2d2d2d': createTimbreForPreset('Black', 'triangle'),
      '#d66573': createTimbreForPreset('Red', 'square'),
      '#68a03f': createTimbreForPreset('Green', 'sawtooth')
    },
    colorPalette: defaultColorPalette
  };
}
