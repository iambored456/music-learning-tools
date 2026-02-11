/**
 * Diatonic mode scale degree offsets (semitones from tonic).
 */
export const MODE_SCALE_DEGREES: Record<string, number[]> = {
  '1': [0, 2, 4, 5, 7, 9, 11],
  '2': [0, 2, 3, 5, 7, 9, 10],
  '3': [0, 1, 3, 5, 7, 8, 10],
  '4': [0, 2, 4, 6, 7, 9, 11],
  '5': [0, 2, 4, 5, 7, 9, 10],
  '6': [0, 2, 3, 5, 7, 8, 10],
  '7': [0, 1, 3, 5, 6, 8, 10],
};

export const MODE_NAMES: Record<string, string> = {
  '1': 'Major',
  '2': 'Dorian',
  '3': 'Phrygian',
  '4': 'Lydian',
  '5': 'Mixolydian',
  '6': 'Aeolian',
  '7': 'Locrian',
};

export const MODE_KEYS = ['1', '2', '3', '4', '5', '6', '7'] as const;

/**
 * Scale degree labels for each mode (flats for all, except Lydian uses ♯4).
 */
export const MODE_DEGREE_LABELS: Record<string, string[]> = {
  '1': ['1', '2', '3', '4', '5', '6', '7'],
  '2': ['1', '2', '♭3', '4', '5', '6', '♭7'],
  '3': ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'],
  '4': ['1', '2', '3', '♯4', '5', '6', '7'],
  '5': ['1', '2', '3', '4', '5', '6', '♭7'],
  '6': ['1', '2', '♭3', '4', '5', '♭6', '♭7'],
  '7': ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'],
};
