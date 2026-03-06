export type OutlineRowType = 'lesson' | 'unit' | 'section' | 'concept' | 'exercise' | 'note';

export type OutlineRow = {
  id: string;
  type: OutlineRowType;
  title: string;
  body: string;
  meta?: string;
  placeholders?: string[];
  children?: OutlineRow[];
};

export type RowTypeGroup = {
  label: string;
  items: Array<{
    type: OutlineRowType;
    label: string;
    description: string;
  }>;
};

export const rowTypeLabels: Record<OutlineRowType, string> = {
  lesson: 'Lesson Row',
  unit: 'Unit Row',
  section: 'Section Row',
  concept: 'Concept Row',
  exercise: 'Exercise Row',
  note: 'Note Row',
};

export const rowTypeGroups: RowTypeGroup[] = [
  {
    label: 'Structure Rows',
    items: [
      {
        type: 'lesson',
        label: 'Lesson',
        description: 'Top-level lesson frame and core metadata placeholders.',
      },
      {
        type: 'unit',
        label: 'Unit',
        description: 'A grouped run of related sections inside the lesson.',
      },
      {
        type: 'section',
        label: 'Section',
        description: 'A single phase of the lesson arc such as opening or review.',
      },
    ],
  },
  {
    label: 'Teaching Rows',
    items: [
      {
        type: 'concept',
        label: 'Concept',
        description: 'Idea, explanation, or listening target for the student.',
      },
      {
        type: 'exercise',
        label: 'Exercise',
        description: 'Student action, prompt, or checkpoint task.',
      },
      {
        type: 'note',
        label: 'Note',
        description: 'Teacher-facing reminder, cue, or implementation note.',
      },
    ],
  },
];

export const lessonOutline: OutlineRow = {
  id: 'lesson-shell',
  type: 'lesson',
  title: 'Lesson Title',
  body: 'Lesson Summary',
  meta: 'Target Level • Estimated Duration • Core Objective',
  placeholders: ['Essential Question', 'Assessment Target', 'Lesson Materials'],
  children: [
    {
      id: 'lesson-arc',
      type: 'unit',
      title: 'Lesson Arc',
      body: 'High-level lesson block that contains the main teaching sequence.',
      meta: 'Opening • Development • Closing',
      placeholders: ['Pacing Notes', 'Transition Markers'],
      children: [
        {
          id: 'opening-section',
          type: 'section',
          title: 'Opening Section',
          body: 'Section Goal',
          meta: 'Hook • Warm-up • Orientation',
          placeholders: ['Opening Prompt', 'Listening Cue'],
          children: [
            {
              id: 'opening-concept',
              type: 'concept',
              title: 'Concept Prompt',
              body: 'Key idea students should notice first.',
              placeholders: ['Visual Reference', 'Aural Example'],
            },
            {
              id: 'opening-exercise',
              type: 'exercise',
              title: 'Exercise Prompt',
              body: 'Student action or call-and-response task.',
              placeholders: ['Expected Response', 'Success Check'],
            },
            {
              id: 'opening-note',
              type: 'note',
              title: 'Teacher Note',
              body: 'Facilitation reminder or setup cue.',
              placeholders: ['Timing Reminder'],
            },
          ],
        },
        {
          id: 'development-section',
          type: 'section',
          title: 'Development Section',
          body: 'Section Goal',
          meta: 'Model • Guided Practice • Independent Try',
          placeholders: ['Transfer Prompt', 'Common Error Watch'],
          children: [
            {
              id: 'development-concept',
              type: 'concept',
              title: 'Concept Prompt',
              body: 'Main teaching idea for the center of the lesson.',
              placeholders: ['Terminology Placeholder'],
            },
            {
              id: 'development-exercise',
              type: 'exercise',
              title: 'Exercise Prompt',
              body: 'Guided activity or notation-linked task.',
              placeholders: ['Student Input Placeholder', 'Scaffold Placeholder'],
            },
          ],
        },
        {
          id: 'closing-section',
          type: 'section',
          title: 'Closing Section',
          body: 'Section Goal',
          meta: 'Reflection • Check for Understanding • Next Step',
          placeholders: ['Exit Prompt', 'Review Cue'],
          children: [
            {
              id: 'closing-exercise',
              type: 'exercise',
              title: 'Exercise Prompt',
              body: 'Short closing check or recap task.',
              placeholders: ['Evidence of Learning'],
            },
            {
              id: 'closing-note',
              type: 'note',
              title: 'Teacher Note',
              body: 'Wrap-up reminder or homework placeholder.',
              placeholders: ['Follow-up Placeholder'],
            },
          ],
        },
      ],
    },
  ],
};
