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
    id: 'student-notation',
    name: 'Student Notation',
    description: 'A music making sketchpad for exploring pitch, rhythm, and timbre.',
    href: withBase('student-notation/'),
    preview: withBase('previews/student-notation.png'),
    tags: ['Sketchpad'],
    accent: '#bb9b3b',
  },
  {
    id: 'singing-trainer',
    name: 'Singing Trainer',
    description: 'Visual pitch feedback for singing.',
    href: withBase('singing-trainer/'),
    preview: withBase('previews/singing-trainer.png'),
    tags: ['Visual'],
    accent: '#da7e9b',
  },
  {
    id: 'simple-notation',
    name: 'Simple Notation',
    description: 'A scrolling musical sketchpad to watch and play along with.',
    href: withBase('simple-notation/'),
    preview: withBase('previews/simple-notation.png'),
    tags: ['Sketchpad'],
    accent: '#4d9b7f',
  },
  {
    id: 'diatonic-compass',
    name: 'Diatonic Compass',
    description: 'A visual manipulative for understanding the relationships between Diatonic Modes.',
    href: withBase('diatonic-compass/'),
    preview: withBase('previews/diatonic-compass.png'),
    tags: ['Visual'],
    accent: '#27b6a1',
  },
  {
    id: 'visual-metronome',
    name: 'Visual Metronome',
    description: 'Several visuals depicting tempo and subdivisions.',
    href: withBase('visual-metronome/'),
    preview: withBase('previews/visual-metronome.png'),
    tags: ['Visual'],
    accent: '#829ae9',
  },
  {
    id: 'amateur-music-theory',
    name: 'Amateur Music Theory',
    description: "A growing library of interactive music theory lessons that don't require you to read traditional music.",
    href: withBase('amateur-music-theory/'),
    preview: withBase('previews/amateur-music-theory.png'),
    tags: ['Lessons', 'Theorry'],
    accent: '#e38b4a',
  },
  {
    id: 'boomwhacker-video-builder',
    name: 'Boomwhacker Video Builder',
    description: 'A software to create scrolling note highways for boomwhackers.',
    href: withBase('boomwhacker-video-builder/'),
    preview: withBase('previews/boomwhacker-video-builder.png'),
    tags: ['Sketchpad'],
    accent: '#5b8ef0',
  },
  {
    id: 'grand-frequency-staff',
    name: 'Grand Frequency Staff',
    description: 'A visualization of the full range of human hearing.',
    href: withBase('grand-frequency-staff/'),
    preview: withBase('previews/grand-frequency-staff.png'),
    tags: ['Visual'],
    accent: '#8fa9ff',
  },
];
