import { PAIRED_LEVEL_MODES, type GameMode } from '@mlt/audiationer-trainer-core';

export const MODE_PAIRS = [
  { id: 'degrees-melody', name: 'Degrees & Melody', landingName: 'Pitch', modes: PAIRED_LEVEL_MODES.pitch },
  { id: 'chords-progressions', name: 'Chords & Chord Progressions', landingName: 'Chords', modes: PAIRED_LEVEL_MODES.chords },
] as const;

export function modePair(mode: GameMode) {
  return MODE_PAIRS.find(pair => pair.modes.some(member => member === mode));
}

export const modeIcon = (mode: GameMode) => mode === 'degrees' ? 'note' : mode;
