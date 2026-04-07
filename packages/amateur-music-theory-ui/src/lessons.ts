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
  '0.1': [
    {
      id: 'rhythm',
      label: 'Hear Rhythm',
      description: 'Separate rhythmic repetition from the rest of the musical example.',
    },
    {
      id: 'pitch',
      label: 'Hear Pitch',
      description: 'Notice the rising and falling dimension that organizes notes by highness and lowness.',
    },
    {
      id: 'timbre',
      label: 'Hear Timbre',
      description: 'Identify the sound quality that distinguishes one source or instrument from another.',
    },
    {
      id: 'compare',
      label: 'Compare the Spaces',
      description: 'Put rhythm, pitch, and timbre side by side inside a single listening frame.',
    },
  ],
  '0.2': [
    {
      id: 'describe',
      label: 'Describe vs Prescribe',
      description: 'Set up theory as a description of musical practice rather than a universal rulebook.',
    },
    {
      id: 'rhythm-entry',
      label: 'Rhythm Entry Point',
      description: 'Introduce isochronic microbeats as the first perceptual handle for rhythm.',
    },
    {
      id: 'pitch-entry',
      label: 'Pitch Entry Point',
      description: 'Introduce scale ordinality as the first perceptual handle for pitch.',
    },
    {
      id: 'timbre-entry',
      label: 'Timbre Entry Point',
      description: 'Introduce spectrotemporal description as the first perceptual handle for timbre.',
    },
  ],
  '1.1': [
    {
      id: 'high-low',
      label: 'High and Low in Pitch Space',
      description: 'Use a vertical pitch field to sort low sounds lower and high sounds higher.',
    },
    {
      id: 'octave',
      label: 'Spot the Octave',
      description: 'Compare doubled frequency with perceived sameness to frame octave equivalence.',
    },
    {
      id: 'classes',
      label: 'Map Pitch Classes',
      description: 'Group pitches by repeating note identity across octaves.',
    },
    {
      id: 'notation',
      label: 'Read Scientific Notation',
      description: 'Anchor note names and octave numbers into a repeatable labeling system.',
    },
    {
      id: 'diatonic',
      label: 'Fit the Diatonic Framework',
      description: 'Place the seven basic note names inside the twelve-pitch octave framework.',
    },
    {
      id: 'tuning',
      label: 'Compare Tuning Systems',
      description: 'Show tuning as culturally chosen organization, with 12-TET as one specific system.',
    },
  ],
  '1.2': [
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
  '1.3': [
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
  '1.4': [
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
  '1.5': [
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
  '1.6': [
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
  '1.7': [
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
  '1.8': [
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
  if (lessonCode === '1.1') {
    return 'shell-only';
  }

  return 'default';
}

function getAvatarCharacter(code: string): LessonAvatarCharacter | null {
  if (code === '1.1') {
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
