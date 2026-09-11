// js/services/tonalService.ts
import { Note, Interval, Chord, RomanNumeral, Progression } from 'tonal';
import { getKeyContextForColumn, getPlacedTonicSigns } from '@state/selectors.ts';
import type { AppState, PlacedNote } from '@mlt/types';

interface DiatonicMapping {
  degree: number;
  alt: number;
}

const SEMITONE_TO_DIATONIC: Record<number, DiatonicMapping> = {
  0: { degree: 1, alt: 0 },
  1: { degree: 2, alt: -1 },
  2: { degree: 2, alt: 0 },
  3: { degree: 3, alt: -1 },
  4: { degree: 3, alt: 0 },
  5: { degree: 4, alt: 0 },
  6: { degree: 5, alt: -1 }, // prefer ♭5 partner; enharmonic toggle can reach ♯4
  7: { degree: 5, alt: 0 },
  8: { degree: 6, alt: -1 },
  9: { degree: 6, alt: 0 },
  10: { degree: 7, alt: -1 },
  11: { degree: 7, alt: 0 }
};

const MODE_NAMES = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'];
const INTERVALS_FROM_MAJOR = ['1P', '2M', '3M', '4P', '5P', '6M', '7M'];

const MODE_SCALE_DEGREES: Record<string, Readonly<Record<number, string>>> = {
  major: { 0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 11: '7' },
  dorian: { 0: '1', 2: '2', 3: '♭3', 5: '4', 7: '5', 9: '6', 10: '♭7' },
  phrygian: { 0: '1', 1: '♭2', 3: '♭3', 5: '4', 7: '5', 8: '♭6', 10: '♭7' },
  lydian: { 0: '1', 2: '2', 4: '3', 6: '♯4', 7: '5', 9: '6', 11: '7' },
  mixolydian: { 0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 10: '♭7' },
  minor: { 0: '1', 2: '2', 3: '♭3', 5: '4', 7: '5', 8: '♭6', 10: '♭7' },
  locrian: { 0: '1', 1: '♭2', 3: '♭3', 5: '4', 6: '♭5', 8: '♭6', 10: '♭7' }
};

const SHARP_SYMBOL = '\u266F';
const FLAT_SYMBOL = '\u266D';
const DEGREE_SEPARATOR = '/';

const CHROMA_PITCH_CLASS_LABELS: Array<{ natural?: string; sharp: string; flat: string }> = [
  { natural: 'C', sharp: 'C', flat: 'C' },
  { sharp: 'C#', flat: 'Db' },
  { natural: 'D', sharp: 'D', flat: 'D' },
  { sharp: 'D#', flat: 'Eb' },
  { natural: 'E', sharp: 'E', flat: 'E' },
  { natural: 'F', sharp: 'F', flat: 'F' },
  { sharp: 'F#', flat: 'Gb' },
  { natural: 'G', sharp: 'G', flat: 'G' },
  { sharp: 'G#', flat: 'Ab' },
  { natural: 'A', sharp: 'A', flat: 'A' },
  { sharp: 'A#', flat: 'Bb' },
  { natural: 'B', sharp: 'B', flat: 'B' }
];

const SHARP_MAJOR_KEYS = new Set(['G', 'D', 'A', 'E', 'B', 'F#', 'C#']);
const FLAT_MAJOR_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);

function getParentMajorTonic(keyTonic: string, keyMode: string): string {
  if (keyMode === 'major') {
    return Note.pitchClass(keyTonic) || keyTonic;
  }

  const modeIndex = MODE_NAMES.indexOf(keyMode);
  const modalInterval = modeIndex > 0 ? INTERVALS_FROM_MAJOR[modeIndex] : null;
  if (!modalInterval) {
    return Note.pitchClass(keyTonic) || keyTonic;
  }

  const inverted = Interval.invert(modalInterval);
  const parentMajor = Note.transpose(keyTonic, inverted) || keyTonic;
  return Note.pitchClass(parentMajor) || parentMajor;
}

function getKeyAccidentalPreference(note: PlacedNote, state: AppState): 'sharp' | 'flat' | null {
  const tonicSignsBeforeNote = getPlacedTonicSigns(state).filter(ts => ts.columnIndex <= note.startColumnIndex);
  if (tonicSignsBeforeNote.length === 0) {
    return null;
  }

  const { keyTonic, keyMode } = getKeyContextForColumn(state, note.startColumnIndex);
  const parentMajorTonic = getParentMajorTonic(keyTonic, keyMode);

  if (SHARP_MAJOR_KEYS.has(parentMajorTonic)) {
    return 'sharp';
  }
  if (FLAT_MAJOR_KEYS.has(parentMajorTonic)) {
    return 'flat';
  }

  return null;
}

function getOctavePartner(details: { num: number; alt: number; semitones: number }): DiatonicMapping | null {
  const absNum = Math.abs(details.num);
  if (absNum !== 8 || details.alt >= 0) {
    return null;
  }
  const semitones = ((details.semitones % 12) + 12) % 12;
  return SEMITONE_TO_DIATONIC[semitones] || null;
}

function formatInterval(interval: string): string | null {
  if (!interval) {return null;}
  const details = Interval.get(interval);
  if (details?.num === undefined) {return null;}

  // First check for octave-based intervals (e.g., 8d -> 7)
  const octavePartner = getOctavePartner(details);
  if (octavePartner) {
    const degreeNumber = octavePartner.degree;
    const alt = octavePartner.alt;
    let prefix = '';
    if (alt < 0) {prefix = '♭'.repeat(Math.abs(alt));}
    else if (alt > 0) {prefix = '♯'.repeat(alt);}
    return `${prefix}${degreeNumber}`;
  }

  // Use semitone-based mapping to avoid enharmonic spelling issues
  const semitones = ((details.semitones % 12) + 12) % 12; // Normalize to 0-11
  const mapping = SEMITONE_TO_DIATONIC[semitones];

  if (!mapping) {
    // Fallback to original logic if mapping doesn't exist
    const degreeNumber = Math.abs(details.num);
    const alt = details.alt;
    let prefix = '';
    if (alt < 0) {prefix = '♭'.repeat(Math.abs(alt));}
    else if (alt > 0) {prefix = '♯'.repeat(alt);}
    return `${prefix}${degreeNumber}`;
  }

  const degreeNumber = mapping.degree;
  const alt = mapping.alt;

  let prefix = '';
  if (alt < 0) {prefix = '♭'.repeat(Math.abs(alt));}
  else if (alt > 0) {prefix = '♯'.repeat(alt);}
  return `${prefix}${degreeNumber}`;
}

// Helper function to get enharmonic equivalent of a scale degree
function getEnharmonicDegree(degreeStr: string): string | null {
  if (!degreeStr) {return null;}

  // Mapping of enharmonic equivalents for scale degrees
  const enharmonicMap: Record<string, string> = {
    '♯1': '♭2',
    '♭2': '♯1',
    '♯2': '♭3',
    '♭3': '♯2',
    '♯4': '♭5',
    '♭5': '♯4',
    '♯5': '♭6',
    '♭6': '♯5',
    '♯6': '♭7',
    '♭7': '♯6'
  };

  return enharmonicMap[degreeStr] || null;
}

// Helper function to check if a degree has an accidental
function hasAccidental(degreeStr: string | null | undefined): boolean {
  return Boolean(degreeStr && (degreeStr.includes('♯') || degreeStr.includes('♭')));
}

function isNoteInCurrentMode(note: PlacedNote, state: AppState): boolean {
  if (state.degreeDisplayMode !== 'modal') {
    return false;
  }

  const { keyTonic, keyMode } = getKeyContextForColumn(state, note.startColumnIndex);
  const scaleDegrees = MODE_SCALE_DEGREES[keyMode];
  if (!keyTonic || !scaleDegrees) {
    return false;
  }

  const rowIndex = note.globalRow ?? note.row;
  const notePitch = state.fullRowData[rowIndex]?.toneNote;
  if (!notePitch) {
    return false;
  }

  const interval = Interval.distance(keyTonic, Note.pitchClass(notePitch) || notePitch);
  const intervalDetails = Interval.get(interval);
  const semitones = ((intervalDetails.semitones % 12) + 12) % 12;
  return Boolean(scaleDegrees[semitones]);
}

const TonalService = {
  // Export helper functions for external use
  getEnharmonicDegree,
  hasAccidental,
  getDegreeForNote(note: PlacedNote, state: AppState): string | null {
    if (!note || !state) {return null;}

    const { keyTonic, keyMode } = getKeyContextForColumn(state, note.startColumnIndex);
    if (!keyTonic) {return null;}

    // Use globalRow for pitch lookup (fullRowData is never sliced)
    const rowIndex = note.globalRow ?? note.row;
    const notePitch = state.fullRowData[rowIndex]?.toneNote;
    if (!notePitch) {return null;}

    const notePitchClass = (Note.pitchClass(notePitch) || notePitch);
    let referenceTonic = keyTonic;

    const degreeDisplayMode = state.degreeDisplayMode as string | undefined;
    if (degreeDisplayMode !== 'modal') {
      // Diatonic mode: determine the parent major tonic when viewing modal keys
      if (keyMode !== 'major') {
        const modeIndex = MODE_NAMES.indexOf(keyMode);

        if (modeIndex > 0) {
          const modalInterval = INTERVALS_FROM_MAJOR[modeIndex];
          if (modalInterval) {
            const inverted = Interval.invert(modalInterval);
            referenceTonic = Note.transpose(keyTonic, inverted) || referenceTonic;
          }
        }
      }
    }

    const interval = Interval.distance(referenceTonic, notePitchClass);
    let formattedInterval = formatInterval(interval);

    if (degreeDisplayMode === 'modal') {
      const intervalDetails = Interval.get(interval);
      const semitones = ((intervalDetails.semitones % 12) + 12) % 12;
      formattedInterval = MODE_SCALE_DEGREES[keyMode]?.[semitones] ?? formattedInterval;
    }

    if (note.enharmonicPreference && formattedInterval && hasAccidental(formattedInterval)) {
      const enharmonicEquivalent = getEnharmonicDegree(formattedInterval);
      if (enharmonicEquivalent) {
        return enharmonicEquivalent;
      }
    }

    return formattedInterval;
  },

  getDegreeLabelForNote(note: PlacedNote, state: AppState): { label: string | null; isAccidental: boolean } {
    const degreeStr = TonalService.getDegreeForNote(note, state);
    if (!degreeStr) {
      return { label: null, isAccidental: false };
    }

    const isAccidental = hasAccidental(degreeStr);
    if (!isAccidental) {
      return { label: degreeStr, isAccidental: false };
    }

    const accidentalMode = state.accidentalMode || {};
    const sharpEnabled = accidentalMode.sharp ?? true;
    const flatEnabled = accidentalMode.flat ?? true;
    if (!sharpEnabled && !flatEnabled) {
      return { label: null, isAccidental: true };
    }

    const enharmonic = getEnharmonicDegree(degreeStr);
    const sharpLabel = degreeStr.includes(SHARP_SYMBOL)
      ? degreeStr
      : enharmonic?.includes(SHARP_SYMBOL) ? enharmonic : null;
    const flatLabel = degreeStr.includes(FLAT_SYMBOL)
      ? degreeStr
      : enharmonic?.includes(FLAT_SYMBOL) ? enharmonic : null;

    // A modal scale tone has one conventional spelling (for example, Dorian's
    // flat 3). Keep that spelling singular when both accidental views are on.
    // Pitches outside the mode continue to show both enharmonic spellings.
    if (isNoteInCurrentMode(note, state)) {
      if (degreeStr.includes(SHARP_SYMBOL) && sharpEnabled) {
        return { label: degreeStr, isAccidental: true };
      }
      if (degreeStr.includes(FLAT_SYMBOL) && flatEnabled) {
        return { label: degreeStr, isAccidental: true };
      }
      if (sharpEnabled && sharpLabel) {
        return { label: sharpLabel, isAccidental: true };
      }
      if (flatEnabled && flatLabel) {
        return { label: flatLabel, isAccidental: true };
      }
    }

    if (sharpEnabled && flatEnabled) {
      return {
        label: [sharpLabel, flatLabel].filter((label): label is string => Boolean(label)).join(DEGREE_SEPARATOR) || degreeStr,
        isAccidental: true
      };
    }
    if (sharpEnabled) {
      return { label: sharpLabel || degreeStr, isAccidental: true };
    }
    return { label: flatLabel || degreeStr, isAccidental: true };
  },

  getPitchClassForNote(note: PlacedNote, state: AppState): string | null {
    if (!note || !state) {return null;}

    const rowIndex = note.globalRow ?? note.row;
    const notePitch = state.fullRowData[rowIndex]?.toneNote;
    if (!notePitch) {return null;}

    const midi = Note.midi(notePitch);
    if (typeof midi !== 'number') {
      const pitchClass = Note.pitchClass(notePitch);
      return pitchClass ? pitchClass.replace(/([A-G])b/, '$1b') : null;
    }

    const chroma = ((midi % 12) + 12) % 12;
    const spellings = CHROMA_PITCH_CLASS_LABELS[chroma];
    if (!spellings) {return null;}
    if (spellings.natural) {return spellings.natural;}

    const accidentalMode = state.accidentalMode || {};
    const sharpEnabled = accidentalMode.sharp ?? true;
    const flatEnabled = accidentalMode.flat ?? true;
    if (!sharpEnabled && !flatEnabled) {
      return null;
    }

    const preferredAccidental = getKeyAccidentalPreference(note, state);
    if (preferredAccidental === 'sharp' && sharpEnabled) {
      return spellings.sharp;
    }
    if (preferredAccidental === 'flat' && flatEnabled) {
      return spellings.flat;
    }

    if (sharpEnabled && flatEnabled) {
      return `${spellings.sharp}/${spellings.flat}`;
    }
    return sharpEnabled ? spellings.sharp : spellings.flat;
  },

  getPitchLabelForNote(note: PlacedNote, state: AppState): string | null {
    const pitchClassLabel = TonalService.getPitchClassForNote(note, state);
    if (!pitchClassLabel || !state.showPitchOctaveLabels) {
      return pitchClassLabel;
    }

    const rowIndex = note.globalRow ?? note.row;
    const notePitch = state.fullRowData[rowIndex]?.toneNote;
    const octave = notePitch ? Note.octave(notePitch) : null;
    if (typeof octave !== 'number') {
      return pitchClassLabel;
    }

    return pitchClassLabel
      .split('/')
      .map(spelling => `${spelling}${octave}`)
      .join('/');
  },

  getDegreesForNotes(notes: string[], keyTonic: string): string[] {
    if (!notes || notes.length === 0) {return [];}
    return notes.map(noteName => {
      const pitchClass = Note.pitchClass(noteName) || noteName;
      const interval = Interval.distance(keyTonic, pitchClass);
      return formatInterval(interval);
    }).filter((deg): deg is string => deg !== null);
  },

  /**
     * FINAL CORRECTED VERSION: Analyzes notes using the documented functions.
     */
  getRomanNumeralForNotes(notes: string[], keyTonic: string): { roman: string; ext: string; root: string } | null {
    if (!notes || notes.length < 2) {return null;}

    // Step 1: Detect the chord from the given notes.
    const [detectedChordName] = Chord.detect(notes);
    if (!detectedChordName) {return null;}

    // Step 2: Get the canonical symbol for that chord (e.g., "FM", "Gm7").
    const chordInfo = Chord.get(detectedChordName);
    const chordSymbol = chordInfo?.symbol;
    if (!chordSymbol) {return null;}

    // Step 3: Use the Progression module to convert the symbol to a Roman numeral string in the given key.
    const [rnString] = Progression.toRomanNumerals(keyTonic, [chordSymbol]);
    if (!rnString) {return null;}

    // Step 4: Use RomanNumeral.get() on the resulting string to parse it into parts.
    const rn = RomanNumeral.get(rnString);

    // The .roman property will correctly be "I", "ii", "V", etc.
    const roman = rn?.roman;
    if (!roman) {return null;}
    // The extension is whatever is left after removing the numeral part.
    let ext = rn.name.replace(roman, '');
    // The root of the chord is available from the initial detection.
    const chordRoot = chordInfo?.tonic || keyTonic;

    // FIX: Per user request, explicitly display "add6" for clarity instead of just "6".
    if (ext === '6') {
      ext = 'add6';
    }

    return { roman, ext, root: chordRoot };
  }
};

export default TonalService;
