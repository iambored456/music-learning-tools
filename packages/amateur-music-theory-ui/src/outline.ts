import { lessonDefinitions } from './lessons';

export type OutlineRowType = 'course' | 'lesson';
export type OutlineRow = {
  id: string;
  type: OutlineRowType;
  title: string;
  body: string;
  code?: string;
  available?: boolean;
  children?: OutlineRow[];
};

export const rowTypeLabels: Record<OutlineRowType, string> = {
  course: 'Course',
  lesson: 'Lesson',
};

export const topLevelOutline: OutlineRow[] = [{
  id: 'pitch-introduction',
  type: 'course',
  title: 'Introduction',
  body: 'Core pitch language and pitch placement.',
  children: lessonDefinitions.filter(lesson => lesson.code.startsWith('1.')).map((lesson) => ({
    id: `lesson-${lesson.code.replaceAll('.', '-')}`,
    type: 'lesson',
    code: lesson.code,
    title: lesson.title,
    body: lesson.body,
  })),
}, {
  id: 'diatonic-scale',
  type: 'course',
  title: 'The Diatonic Scale',
  body: '',
  children: [
    { code: '2.1', title: 'Tonal Centers' },
    { code: '2.2', title: 'Scale Degrees' },
    { code: '2.3', title: 'Stable and Unstable Scale Degrees' },
  ].map((lesson) => ({
    ...lesson,
    id: `lesson-${lesson.code.replaceAll('.', '-')}`,
    type: 'lesson',
    body: '',
    available: false,
  })),
}, {
  id: 'harmony',
  type: 'course',
  title: 'Harmony',
  body: '',
  children: lessonDefinitions.filter(lesson => lesson.code.startsWith('3.')).map((lesson) => ({
    code: lesson.code,
    title: lesson.title,
    id: `lesson-${lesson.code.replaceAll('.', '-')}`,
    type: 'lesson',
    body: lesson.body,
  })),
}];
