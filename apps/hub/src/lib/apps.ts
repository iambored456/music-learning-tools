export type AppCard = {
  id: string;
  name: string;
  description: string;
  href: string;
  tags: string[];
  accent: string;
};

export const appCards: AppCard[] = [
  {
    id: 'singing-trainer',
    name: 'Singing Trainer',
    description: 'Real-time vocal practice with pitch detection and note highway visualization.',
    href: '/singing-trainer/',
    tags: ['Svelte', 'Audio', 'Pitch'],
    accent: '#da7e9b',
  },
  {
    id: 'student-notation',
    name: 'Student Notation',
    description: 'Grid-first sketchpad for pitch, rhythm, and harmony exploration.',
    href: '/student-notation/',
    tags: ['Canvas', 'Notation', 'Svelte'],
    accent: '#bb9b3b',
  },
  {
    id: 'diatonic-compass',
    name: 'Diatonic Compass',
    description: 'Interactive compass for keys, modes, and diatonic relationships.',
    href: '/diatonic-compass/',
    tags: ['Canvas', 'Theory', 'Accessibility'],
    accent: '#27b6a1',
  },
  {
    id: 'amateur-singing-trainer',
    name: 'Amateur Singing Trainer',
    description: 'Pitch visualizer for tonic + drone practice with real-time feedback.',
    href: '/amateur-singing-trainer/',
    tags: ['Canvas', 'Audio', 'Pitch'],
    accent: '#829ae9',
  },
];
