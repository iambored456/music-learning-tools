import { topLevelOutline, type OutlineRow } from './outline';
import type { LessonAvatarCharacter } from './lessonAvatar';

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
    {
      id: 'direction',
      label: 'Hear Direction',
      description: 'Recognize ascending and descending motion between two pitches.',
    },
    {
      id: 'counting',
      label: 'Count with Note Names',
      description: 'Use the diatonic framework to count interval span between note names.',
    },
    {
      id: 'tones',
      label: 'Track Tones and Semitones',
      description: 'Notice where note-name spacing compresses or expands inside the octave.',
    },
    {
      id: 'review',
      label: 'Review Intervals',
      description: 'Connect interval naming, direction, and octave repetition into one summary.',
    },
  ],
  '1.4': [
    {
      id: 'tonic',
      label: 'Choose a Starting Pitch',
      description: 'Select a pitch to act as the source point for scale construction.',
    },
    {
      id: 'pattern',
      label: 'Apply the Pattern',
      description: 'Step through the whole-step and half-step pattern that defines the diatonic scale.',
    },
    {
      id: 'spell',
      label: 'Spell the Scale',
      description: 'Translate the pitch pattern into note names and accidentals.',
    },
    {
      id: 'review',
      label: 'Review the Build',
      description: 'Check the completed scale and relate it back to the construction rule.',
    },
  ],
  '1.5': [
    {
      id: 'center',
      label: 'Hear the Center',
      description: 'Notice how a scale can orient itself around one designated pitch.',
    },
    {
      id: 'build',
      label: 'Build from the Center',
      description: 'Relate tonal center to the pitch a scale is built from.',
    },
    {
      id: 'contrast',
      label: 'Contrast Other Notes',
      description: 'Compare surrounding notes against the tonal center to hear relative stability.',
    },
    {
      id: 'review',
      label: 'Review Tonality',
      description: 'Summarize tonal center as both a construction point and a listening anchor.',
    },
  ],
  '1.6': [
    {
      id: 'index',
      label: 'Index the Scale',
      description: 'Assign ordered degree numbers to notes in a diatonic scale.',
    },
    {
      id: 'identify',
      label: 'Identify Degrees',
      description: 'Match notes to their scale-degree positions quickly and accurately.',
    },
    {
      id: 'function',
      label: 'Connect Function',
      description: 'Tie degree labels to how notes behave inside the scale.',
    },
    {
      id: 'review',
      label: 'Review Degrees',
      description: 'Consolidate scale-degree naming and functional hearing.',
    },
  ],
  '1.7': [
    {
      id: 'stable',
      label: 'Stable vs Unstable',
      description: 'Sort scale degrees by felt restfulness and tension.',
    },
    {
      id: 'patterns',
      label: 'Trace Digital Patterns',
      description: 'Use number patterns to describe melodic motion inside the scale.',
    },
    {
      id: 'question-answer',
      label: 'Hear Question and Answer',
      description: 'Frame short melodies as opening and closing gestures.',
    },
    {
      id: 'review',
      label: 'Review Melodic Function',
      description: 'Bring stability, patterning, and phrase shape together.',
    },
  ],
  '1.8': [
    {
      id: 'thirds',
      label: 'Stack Thirds',
      description: 'Build triads by layering every other note of the scale.',
    },
    {
      id: 'quality',
      label: 'Compare Qualities',
      description: 'Distinguish major, minor, diminished, and augmented triads.',
    },
    {
      id: 'hear',
      label: 'Hear the Shape',
      description: 'Connect chord quality to interval structure and sound.',
    },
    {
      id: 'review',
      label: 'Review Triads',
      description: 'Summarize how triads are built and categorized.',
    },
  ],
  '1.9': [
    {
      id: 'scale-degree',
      label: 'Locate the Scale Degree',
      description: "Identify a note's position in the parent scale.",
    },
    {
      id: 'chord-degree',
      label: 'Locate the Chord Degree',
      description: 'Re-index the same note relative to the active chord.',
    },
    {
      id: 'compare',
      label: 'Compare Both Frames',
      description: 'Switch between scale-degree and chord-degree viewpoints without confusion.',
    },
    {
      id: 'review',
      label: 'Review Dual Labels',
      description: 'Summarize how a note can carry two valid structural identities at once.',
    },
  ],
};

function createFallbackSections(title: string): LessonSectionSeed[] {
  return [
    {
      id: 'orientation',
      label: 'Orientation',
      description: `Set up the core question of ${title}.`,
    },
    {
      id: 'model',
      label: 'Model the Idea',
      description: `Walk through the main example or explanation for ${title}.`,
    },
    {
      id: 'practice',
      label: 'Guided Practice',
      description: `Give the learner a structured attempt inside ${title}.`,
    },
    {
      id: 'review',
      label: 'Review',
      description: `Close ${title} with a quick recap and check for understanding.`,
    },
  ];
}

function withSectionCodes(lessonCode: string, sections: LessonSectionSeed[]): LessonSection[] {
  return sections.map((section, index) => ({
    ...section,
    code: `${lessonCode}.${index + 1}`,
  }));
}

function getCanvasLayout(lessonCode: string): LessonDefinition['canvasLayout'] {
  if (lessonCode === '1.1' || lessonCode === '1.2') {
    return 'shell-only';
  }

  return 'default';
}

function getAvatarCharacter(code: string): LessonAvatarCharacter | null {
  if (code === '1.1' || code === '1.2') {
    return 'grammy';
  }

  return null;
}

function collectLessons(rows: OutlineRow[], trail: string[] = []): LessonDefinition[] {
  const lessons: LessonDefinition[] = [];

  for (const row of rows) {
    const nextTrail = row.type === 'lesson' ? trail : [...trail, row.title];

    if (row.type === 'lesson' && row.code) {
      lessons.push({
        code: row.code,
        title: row.title,
        body: row.body,
        trail,
        sections: withSectionCodes(
          row.code,
          lessonSectionOverrides[row.code] ?? createFallbackSections(row.title),
        ),
        canvasLayout: getCanvasLayout(row.code),
        avatarCharacter: getAvatarCharacter(row.code),
      });
      continue;
    }

    if (row.children?.length) {
      lessons.push(...collectLessons(row.children, nextTrail));
    }
  }

  return lessons;
}

export const lessonDefinitions = collectLessons(topLevelOutline);

export function getLessonDefinition(code: string): LessonDefinition | undefined {
  return lessonDefinitions.find((lesson) => lesson.code === code);
}
