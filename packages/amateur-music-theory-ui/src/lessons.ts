import type { LessonAvatarCharacter } from './lessonAvatar';
import { harmonyLessonSeeds } from './harmonyIntervals';

export type LessonSection = {
  id: string;
  code: string;
  label: string;
  description: string;
};

type LessonSectionSeed = Omit<LessonSection, 'code'>;

export type LessonDefinition = {
  code: string;
  title: string;
  body: string;
  trail: string[];
  sections: LessonSection[];
  canvasLayout: 'default' | 'shell-only';
  avatarCharacter: LessonAvatarCharacter | null;
};

const lessonSectionOverrides: Record<string, LessonSectionSeed[]> = {
  ...Object.fromEntries(harmonyLessonSeeds.map(lesson => [lesson.code, lesson.sections])),
  '1.1': [
    {
      id: 'lines-spaces',
      label: 'Lines and Spaces',
      description: 'Recognize whether a pitch sits on a horizontal line or inside a pitch space.',
    },
    {
      id: 'high-low',
      label: 'High and Low in Pitch Space',
      description: 'Use a vertical pitch field to sort low sounds lower and high sounds higher.',
    },
    {
      id: 'differentiate-pitches',
      label: 'Differentiate Two Pitches',
      description: 'Compare two sounding notes and identify which pitch is higher or lower.',
    },
    {
      id: 'matching-pitches',
      label: 'Match the Pitch',
      description: 'Listen for exact pitch matches and select the matching note on the pitch grid.',
    },
  ],
  '1.2': [
    {
      id: 'letter-names',
      label: 'Letter Names',
      description: 'Reveal the natural pitch letters from A through G and place three named notes on the grid.',
    },
    {
      id: 'letter-cycle',
      label: 'Repeating Letter Names',
      description: 'Continue upward through the A-through-G cycle and recognize the letter above a displayed note.',
    },
    {
      id: 'octaves',
      label: 'Hear an Octave',
      description: 'Compare matching letter names and hear the distance from one A to the next.',
    },
    {
      id: 'octave-numbers',
      label: 'Octave Numbers',
      description: 'Expand the pitch range and use octave numbers to identify exact pitches across C boundaries.',
    },
    {
      id: 'accidentals',
      label: 'Sharps and Flats',
      description: 'Reveal the chromatic pitches and name them with flats, sharps, and enharmonic spellings.',
    },
    {
      id: 'naming-practice',
      label: 'Naming Practice',
      description: 'Place pitches from flat, sharp, and combined pitch names using the labelled pitch legend.',
    },
  ],
  '1.3': [
    { id: 'interval-introduction', label: 'What Is an Interval?', description: 'Compare pitches at the same time and at different times.' },
    { id: 'unison', label: 'Unison', description: 'Hear two pitches with no distance between them.' },
    { id: 'minor-seconds', label: 'Minor 2nds', description: 'Move one pitch above or below to create a minor 2nd.' },
    { id: 'minor-seconds-above', label: 'Minor 2nds Above', description: 'Place notes one pitch above each reference.' },
    { id: 'minor-seconds-below', label: 'Minor 2nds Below', description: 'Place notes one pitch below each reference.' },
    { id: 'major-seconds', label: 'Major 2nds', description: 'Move two pitches above or below to create a major 2nd.' },
    { id: 'major-seconds-above', label: 'Major 2nds Above', description: 'Place notes two pitches above each reference.' },
    { id: 'major-seconds-below', label: 'Major 2nds Below', description: 'Place notes two pitches below each reference.' },
    { id: 'interval-practice', label: 'Create an Interval', description: 'Create unison, minor 2nd, and major 2nd intervals in any column.' },
  ],
  '1.4': [
    { id: 'scale-introduction', label: 'What Is a Scale?', description: 'Hear groups of notes and meet the diatonic scale.' },
    { id: 'seven-notes', label: 'Seven Notes, Repeating', description: 'Hear seven notes and their repetition in another octave.' },
    { id: 'scale-intervals', label: 'Two Interval Sizes', description: 'Compare major and minor 2nds between neighbouring notes.' },
    { id: 'find-major-seconds', label: 'Find the Major 2nds', description: 'Find and mark all five major-2nd pairs from C4 to C5.' },
    { id: 'find-minor-seconds', label: 'Find the Minor 2nds', description: 'Find the two minor-2nd pairs while keeping earlier pairs marked.' },
    { id: 'scale-pattern', label: 'The Interval Pattern', description: 'Follow +2, +2, +1, +2, +2, +2, +1 as the scale plays.' },
    { id: 'build-scale', label: 'Build from C', description: 'Place each next note in the highlighted column to build a diatonic scale.' },
    { id: 'build-scale-f', label: 'Build from F', description: 'Use the same interval pattern to build a diatonic scale starting on F.' },
  ],
};

const lessonSeeds: Array<Pick<LessonDefinition, 'code' | 'title' | 'body'> & { trail?: string[] }> = [
  {
    code: '1.1',
    title: 'The Pitch Grid',
    body: 'Introduces lines and spaces, high and low pitch placement, pitch comparison, and exact pitch matching.',
  },
  {
    code: '1.2',
    title: 'Naming Pitches',
    body: 'Introduces repeating pitch letters and the sharp and flat names of pitches between them.',
  },
  {
    code: '1.3',
    title: 'Intervals Part One (2nds)',
    body: 'Introduces unison, minor 2nds, and major 2nds through listening and note placement.',
  },
  {
    code: '1.4',
    title: 'Building the Diatonic Scale',
    body: 'Find the major and minor 2nds in a diatonic scale, then build scales from C and F.',
  },
  ...harmonyLessonSeeds,
];

export const lessonDefinitions: LessonDefinition[] = lessonSeeds.map((lesson) => ({
  ...lesson,
  trail: lesson.trail ?? ['Introduction'],
  sections: lessonSectionOverrides[lesson.code].map((section, index) => ({
    ...section,
    code: `${lesson.code}.${index + 1}`,
  })),
  canvasLayout: 'shell-only',
  avatarCharacter: 'grammy',
}));

export function getLessonDefinition(code: string): LessonDefinition | undefined {
  return lessonDefinitions.find((lesson) => lesson.code === code);
}
