export type AppCard = {
  id: string;
  name: string;
  description: string;
  href: string;
  tags: string[];
  accent: string;
};

const baseUrl = import.meta.env.BASE_URL;
const withBase = (path: string) => `${baseUrl}${path.replace(/^\/+/, '')}`;

export const appCards: AppCard[] = [
  {
    id: 'singing-trainer',
    name: 'Singing Trainer',
    description: 'Real-time vocal practice with pitch detection and note highway visualization.',
    href: withBase('singing-trainer/'),
    tags: ['Svelte', 'Audio', 'Pitch'],
    accent: '#da7e9b',
  },
  {
    id: 'student-notation',
    name: 'Student Notation',
    description: 'Grid-first sketchpad for pitch, rhythm, and harmony exploration.',
    href: withBase('student-notation/'),
    tags: ['Canvas', 'Notation', 'Svelte'],
    accent: '#bb9b3b',
  },
  {
    id: 'diatonic-compass',
    name: 'Diatonic Compass',
    description: 'Interactive compass for keys, modes, and diatonic relationships.',
    href: withBase('diatonic-compass/'),
    tags: ['Canvas', 'Theory', 'Accessibility'],
    accent: '#27b6a1',
  },
  {
    id: 'amateur-singing-trainer',
    name: 'Amateur Singing Trainer',
    description: 'Pitch visualizer for tonic + drone practice with real-time feedback.',
    href: withBase('amateur-singing-trainer/'),
    tags: ['Canvas', 'Audio', 'Pitch'],
    accent: '#829ae9',
  },
];
