import { Note } from 'tonal';

export type ChordPitchesFromIntervalsOptions = {
  activeChordIntervals: string[];
  isIntervalsInverted: boolean;
  chordPositionState: number;
};

export function getChordPitchesFromIntervals(
  rootNote: string,
  options: ChordPitchesFromIntervalsOptions
): string[] {
  const { activeChordIntervals, isIntervalsInverted, chordPositionState } = options;
  if (!rootNote || !activeChordIntervals || activeChordIntervals.length === 0) {
    return [];
  }

  // For 2-note intervals: inversion means placing second note below cursor
  if (isIntervalsInverted && activeChordIntervals.length === 2 && activeChordIntervals[0] === '1P') {
    const interval = activeChordIntervals[1];
    const invertedInterval = '-' + interval;
    const transposedNote = Note.transpose(rootNote, invertedInterval);
    const simplifiedNote = Note.simplify(transposedNote);
    const correctedNote = simplifiedNote.includes('#')
      ? (Note.enharmonic(simplifiedNote).includes('b') ? Note.enharmonic(simplifiedNote) : simplifiedNote)
      : simplifiedNote;
    return [rootNote, correctedNote];
  }

  // Generate all chord tones first
  const chordTones = activeChordIntervals.map(interval => {
    const transposedNote = Note.transpose(rootNote, interval);
    const simplifiedNote = Note.simplify(transposedNote);
    if (simplifiedNote.includes('#')) {
      const flatEquivalent = Note.enharmonic(simplifiedNote);
      if (flatEquivalent.includes('b')) {
        return flatEquivalent;
      }
    }
    return simplifiedNote;
  });

  // For chords (3+ notes): position toggle means reordering chord tones
  if (activeChordIntervals.length >= 3 && chordPositionState > 0) {
    // Apply chord inversion by rotating the array
    const inverted = [...chordTones];
    for (let i = 0; i < chordPositionState; i++) {
      const first = inverted.shift();
      if (!first) {
        break;
      }
      // Move the inverted note up an octave by transposing it
      const octaveUp = Note.transpose(first as any, '8P');
      inverted.push(Note.simplify(octaveUp) ?? first);
    }

    // Position the BASS note (first note in the inverted chord) at the cursor
    // This is the expected behavior for chord positions/inversions
    const bassNote = inverted[0];
    const targetNote = rootNote; // This is where the user clicked
    if (!bassNote) {
      return chordTones;
    }

    const bassNoteMidi = Note.midi(bassNote as any);
    const targetNoteMidi = Note.midi(targetNote as any);
    if (bassNoteMidi === null || targetNoteMidi === null) {
      return chordTones;
    }

    // Find the octave adjustment needed to get the bass note close to the target
    let octaveAdjustment = 0;
    let adjustedBassMidi = bassNoteMidi;

    // Move bass note to the same octave as target or just below
    while (adjustedBassMidi > targetNoteMidi) {
      adjustedBassMidi -= 12;
      octaveAdjustment -= 12;
    }
    while (adjustedBassMidi + 12 <= targetNoteMidi) {
      adjustedBassMidi += 12;
      octaveAdjustment += 12;
    }

    // Apply the octave adjustment to all chord tones
    return inverted.map(note => {
      const midi = Note.midi(note as any);
      if (midi === null) {
        return note;
      }
      const adjustedMidi = midi + octaveAdjustment;
      return Note.fromMidi(adjustedMidi) ?? note;
    });
  }

  return chordTones;
}

