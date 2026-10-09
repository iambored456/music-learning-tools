/** Shared curriculum range for sections 1.1.1–1.1.3; keep global pitch rows intact. */
export const lesson11PitchRange = { high: 'A5', low: 'A3' } as const;
export const lowIntroToneNotes = ['E4', 'C4', 'A3'];
export const highIntroToneNotes = ['C5', 'E5', 'G5'];

type ComparisonMode = 'higher' | 'lower';

export type ComparisonPair = {
    id: string;
    mode: ComparisonMode;
    toneNotes: readonly [string, string];
    question: string;
    underlinedWord: 'higher' | 'lower';
  };

const higherComparisonQuestion = 'Which note has the higher pitch?';
export const comparisonPairs: readonly ComparisonPair[] = [
    {
      id: 'comparison-1',
      mode: 'higher',
      toneNotes: ['G5', 'E4'],
      question: higherComparisonQuestion,
      underlinedWord: 'higher',
    },
    {
      id: 'comparison-2',
      mode: 'lower',
      toneNotes: ['E5', 'A5'],
      question: 'Which note has the lower pitch?',
      underlinedWord: 'lower',
    },
    {
      id: 'comparison-3',
      mode: 'higher',
      toneNotes: ['B3', 'E5'],
      question: 'Which is higher?',
      underlinedWord: 'higher',
    },
    {
      id: 'comparison-4',
      mode: 'lower',
      toneNotes: ['A4', 'A3'],
      question: 'Which is lower?',
      underlinedWord: 'lower',
    },
    {
      id: 'comparison-5',
      mode: 'higher',
      toneNotes: ['F5', 'C4'],
      question: 'Which is higher?',
      underlinedWord: 'higher',
    },
    {
      id: 'comparison-6',
      mode: 'lower',
      toneNotes: ['F4', 'D5'],
      question: 'Which is lower?',
      underlinedWord: 'lower',
    },
    {
      id: 'comparison-7',
      mode: 'higher',
      toneNotes: ['D4', 'A5'],
      question: 'Which is higher?',
      underlinedWord: 'higher',
    },
  ];

