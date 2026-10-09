/** The introduction sounds these five pitches before revealing their names. */
export const blackKeyIntroduction = ['Db4', 'Eb4', 'Gb4', 'Ab4', 'Bb4'] as const;
/** Replay the five black keys downwards within C4–C5. */
export const blackKeyDescent = ['Bb4', 'Ab4', 'Gb4', 'Eb4', 'Db4'] as const;
export const blackKeyNoteColumns = 6;

export const blackKeySpeech = {
  introduction: ['The Black keys…', 'The black keys'],
  twoNames: ['…have two names.', 'have two names.'],
  flatExample: ['For example, the pitch directly beneath A can be called A flat.', 'For example, the pitch directly beneath A can be called A flat.'],
  flatDirection: ['Flats lower pitch.', 'Flats lower pitch.'],
  sharpExample: ['That pitch is also directly above G, and can be called G♯.', 'That pitch is also directly above G, and can be called G sharp.'],
  sharpDirection: ['Sharps raise the pitch.', 'Sharps raise the pitch.'],
} as const;
