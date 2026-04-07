export type OutlineRowType = 'course' | 'strand' | 'lesson' | 'note';

export type OutlineRow = {
  id: string;
  type: OutlineRowType;
  title: string;
  body: string;
  code?: string;
  meta?: string;
  chips?: string[];
  children?: OutlineRow[];
};

export type RoadmapSummary = {
  label: string;
  title: string;
  body: string;
  tone: 'foundation' | 'active' | 'planned';
};

export type FocusCard = {
  label: string;
  title: string;
  body: string;
};

export const rowTypeLabels: Record<OutlineRowType, string> = {
  course: 'Course',
  strand: 'Strand',
  lesson: 'Lesson',
  note: 'Planning Note',
};

export const roadmapSummaries: RoadmapSummary[] = [
  {
    label: '0.x Foundations',
    title: 'Introduction to Music Theory',
    body: 'Two opening lessons establish the shared perceptual frame before the strand split.',
    tone: 'foundation',
  },
  {
    label: '1.x Pitch',
    title: 'Pitch is the first full strand',
    body: 'Pitch lessons are already mapped from frequency space through chords.',
    tone: 'active',
  },
  {
    label: '2.x Rhythm',
    title: 'Rhythm follows next',
    body: 'The rhythm strand stays visible on the roadmap even before its lesson titles are drafted.',
    tone: 'planned',
  },
  {
    label: '3.x Timbre',
    title: 'Timbre remains a full strand',
    body: 'Timbre will eventually sit beside pitch and rhythm rather than appearing as a side topic.',
    tone: 'planned',
  },
];

export const currentFocus: FocusCard = {
  label: 'Current build focus',
  title: 'Pitch Lesson 1.1 - The Pitch Frequency Space',
  body: 'The roadmap stays compact here, but this lesson is the first one to design in detail next.',
};

export const curriculumOutline: OutlineRow = {
  id: 'amateur-music-theory-course',
  type: 'course',
  title: 'Amateur Music Theory',
  body: 'A strand-based beginner theory sequence organized as foundations, pitch, rhythm, and timbre.',
  meta: 'Compact course map | Detailed learning goals stay in lesson design',
  chips: ['Foundations 0.x', 'Pitch 1.x', 'Rhythm 2.x planned', 'Timbre 3.x planned'],
  children: [
    {
      id: 'foundations',
      type: 'course',
      title: 'Introduction to Music Theory',
      body: 'A shared starting point for hearing music as rhythm, pitch, and timbre before the later course split.',
      meta: 'Lessons 0.1-0.2',
      chips: ['Entry point', 'Perceptual framing'],
      children: [
        {
          id: 'lesson-0-1',
          type: 'lesson',
          code: '0.1',
          title: 'Frequency Spaces',
          body: 'Introduces rhythm, pitch, and timbre as distinct dimensions inside the same musical example.',
        },
        {
          id: 'lesson-0-2',
          type: 'lesson',
          code: '0.2',
          title: 'Perceptual Fundamentals',
          body: 'Frames theory as descriptive and sets up perceptual entry points for each later strand.',
          chips: [
            'Rhythm: Isochronic Microbeats',
            'Pitch: Scale Ordinality',
            'Timbre: Spectrotemporal Descriptors',
          ],
        },
      ],
    },
    {
      id: 'pitch-strand',
      type: 'course',
      title: 'Pitch',
      body: 'The first full course, moving from pitch space and interval naming into diatonic scales and chords.',
      meta: 'Lessons 1.1-1.8',
      chips: ['Current course', 'First detailed lesson build starts at 1.1'],
      children: [
        {
          id: 'pitch-introduction',
          type: 'strand',
          title: 'Introduction',
          body: 'Core pitch language, scale building, tonal centers, and scale-degree hearing.',
          meta: 'Lessons 1.1-1.6',
          children: [
            {
              id: 'lesson-1-1',
              type: 'lesson',
              code: '1.1',
              title: 'The Pitch Frequency Space',
              body: 'Introduces pitch range, octave equivalence, tuning systems, pitch classes, and scientific pitch notation.',
            },
            {
              id: 'lesson-1-2',
              type: 'lesson',
              code: '1.2',
              title: 'Intervals',
              body: 'Names the distance between pitches in ascending and descending motion using the diatonic framework.',
            },
            {
              id: 'lesson-1-3',
              type: 'lesson',
              code: '1.3',
              title: 'The Diatonic Scale',
              body: 'Builds diatonic scales by applying the step pattern to a chosen pitch.',
            },
            {
              id: 'lesson-1-4',
              type: 'lesson',
              code: '1.4',
              title: 'Tonal Centers',
              body: 'Introduces tonal center as the pitch a chosen scale is built from and heard around.',
            },
            {
              id: 'lesson-1-5',
              type: 'lesson',
              code: '1.5',
              title: 'Diatonic Scale Degrees',
              body: 'Identifies scale degrees within diatonic scales and connects note labels to function.',
            },
            {
              id: 'lesson-1-6',
              type: 'lesson',
              code: '1.6',
              title: 'Diatonic Digital Patterns',
              body: 'Applies stable and unstable scale-degree behavior to short melodic patterns and question-answer shapes.',
            },
          ],
        },
        {
          id: 'pitch-chords',
          type: 'strand',
          title: 'Chords',
          body: 'Moves from stacked thirds into the relationship between scale degrees and chord degrees.',
          meta: 'Lessons 1.7-1.8',
          children: [
            {
              id: 'lesson-1-7',
              type: 'lesson',
              code: '1.7',
              title: 'Diatonic Chords: Triads',
              body: 'Introduces triads as stacked thirds and distinguishes major, minor, diminished, and augmented forms.',
            },
            {
              id: 'lesson-1-8',
              type: 'lesson',
              code: '1.8',
              title: 'Scale Degrees vs. Chord Degrees',
              body: 'Clarifies the difference between a note\'s place in the scale and its place inside the current chord.',
            },
          ],
        },
      ],
    },
    {
      id: 'rhythm-strand',
      type: 'course',
      title: 'Rhythm',
      body: 'The second major course will continue the same structure under the 2.x numbering system.',
      meta: 'Lessons 2.x',
      children: [
        {
          id: 'rhythm-note',
          type: 'note',
          title: 'Rhythm lesson map to be drafted',
          body: 'Keep the strand visible now so the course architecture already reads as pitch, rhythm, and timbre.',
        },
      ],
    },
    {
      id: 'timbre-strand',
      type: 'course',
      title: 'Timbre',
      body: 'The third major course will eventually house the 3.x lesson sequence.',
      meta: 'Lessons 3.x',
      children: [
        {
          id: 'timbre-note',
          type: 'note',
          title: 'Timbre lesson map to be drafted',
          body: 'The strand remains on the roadmap from the start so the course scope is visible even before drafting.',
        },
      ],
    },
  ],
};

export const topLevelOutline: OutlineRow[] = curriculumOutline.children ?? [];

// Temporary compatibility exports for stale Vite/HMR sessions that still request the old names.
export const lessonOutline = curriculumOutline;

export const rowTypeGroups = [
  {
    label: 'Course Roadmap',
    items: [
      {
        type: 'course',
        label: 'Course',
        description: 'Top-level map for the full Amateur Music Theory sequence.',
      },
      {
        type: 'strand',
        label: 'Strand',
        description: 'Subdivisions inside a course, such as Introduction and Chords inside Pitch.',
      },
      {
        type: 'lesson',
        label: 'Lesson',
        description: 'Compact lesson titles with brief summaries for the public roadmap.',
      },
      {
        type: 'note',
        label: 'Planning Note',
        description: 'Visible placeholder markers for strands whose detailed lesson maps come later.',
      },
    ],
  },
] as const;
