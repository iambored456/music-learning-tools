export type AppCard = {
  id: string;
  name: string;
  description: string;
  href: string;
  preview: string;
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
    preview: withBase('previews/singing-trainer.png'),
    tags: ['Pitch', 'Audiation', 'Karaoke'],
    accent: '#da7e9b',
  },
  {
    id: 'student-notation',
    name: 'Student Notation',
    description: 'Grid-first sketchpad for pitch, rhythm, and harmony exploration.',
    href: withBase('student-notation/'),
    preview: withBase('previews/student-notation.png'),
    tags: ['Sketchpad', 'Composition', 'Synth'],
    accent: '#bb9b3b',
  },
  {
    id: 'diatonic-compass',
    name: 'Diatonic Compass',
    description: 'Interactive compass for keys, modes, and diatonic relationships.',
    href: withBase('diatonic-compass/'),
    preview: withBase('previews/diatonic-compass.png'),
    tags: ['Theory', 'Modes', 'Keys'],
    accent: '#27b6a1',
  },
  {
    id: 'visual-metronome',
    name: 'Visual Metronome',
    description: 'Animated bouncing-ball metronome with color, path, and subdivision controls.',
    href: withBase('visual-metronome/'),
    preview: withBase('previews/visual-metronome.png'),
    tags: ['Rhythm', 'Subdivision', 'Practice'],
    accent: '#829ae9',
  },
];
