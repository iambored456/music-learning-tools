import { describe, expect, it } from 'vitest';
import { FEELING_THIS } from '@mlt/lesson-templates';
import { resolveExerciseTonality } from './exerciseTonality.js';

describe('arrangement tonic reference', () => {
  it('keeps Feeling This degree 1 four semitones above speaking pitch as the notes transpose', () => {
    const floor = Math.min(...FEELING_THIS.config.voices.flatMap(voice => voice.notes.map(note => note.midiPitch)));
    for (const [speakingPitch, expectedTonic, expectedPc] of [[45, 'C#', 1], [46, 'D', 2], [60, 'E', 4], [61, 'F', 5], [55, 'B', 11], [56, 'C', 0]] as const) {
      const transpose = speakingPitch - 3 - floor;
      expect(resolveExerciseTonality(FEELING_THIS, transpose)).toEqual({ tonic: expectedTonic, pitchClass: expectedPc });
    }
  });

  it('uses the score tonic even without the Aligned metadata flag', () => {
    const template = { ...FEELING_THIS, speakingPitchUsage: 'none' as const };
    expect(resolveExerciseTonality(template, 13)).toEqual({ tonic: 'F', pitchClass: 5 });
    expect(resolveExerciseTonality(template, 25)).toEqual({ tonic: 'F', pitchClass: 5 });
    expect(resolveExerciseTonality(template, -5)).toEqual({ tonic: 'B', pitchClass: 11 });
  });

  it('leaves activities without a score tonic available to use their normal grid reference', () => {
    expect(resolveExerciseTonality(null, 0)).toBe(null);
    const template = { ...FEELING_THIS, config: { ...FEELING_THIS.config, tonalCenter: undefined } };
    expect(resolveExerciseTonality(template, 12)).toBe(null);
  });
});
