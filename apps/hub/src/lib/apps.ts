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
    description: 'Grid-first sketchpad for pitch, rhythm, and harmony exploration.',
    href: withBase('student-notation/'),
    preview: withBase('previews/student-notation.png'),
    tags: ['Sketchpad', 'Composition', 'Synth'],
    accent: '#bb9b3b',
  },
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
    id: 'simple-notation',
    name: 'Simple Notation',
    description: 'Diatonic oval notation with block rhythms, drone, and keyboard-first practice.',
    href: withBase('simple-notation/'),
    preview: withBase('previews/simple-notation.png'),
    tags: ['Diatonic', 'Rhythm Blocks', 'Drone'],
    accent: '#4d9b7f',
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
  {
    id: 'amateur-music-theory',
    name: 'Amateur Music Theory',
    description: 'Lesson-first launchpad for guided theory modules built from notation tooling.',
    href: withBase('amateur-music-theory/'),
    preview: withBase('previews/amateur-music-theory.png'),
    tags: ['Lessons', 'Theory', 'Practice'],
    accent: '#e38b4a',
  },
  {
    id: 'boomwhacker-video-builder',
    name: 'Boomwhacker Video Builder',
    description: 'Teacher-focused chart editor for uploaded audio, beat pins, scrolling boomwhacker lanes, and video export.',
    href: withBase('boomwhacker-video-builder/'),
    preview: withBase('previews/boomwhacker-video-builder.png'),
    tags: ['Authoring', 'Beat Map', 'Video Export'],
    accent: '#5b8ef0',
  },
  {
    id: 'grand-frequency-staff',
    name: 'Grand Frequency Staff',
    description: 'Interactive pitch-to-instrument reference: click any pitch to hear it and see which instruments can play it.',
    href: withBase('grand-frequency-staff/'),
    preview: withBase('previews/grand-frequency-staff.png'),
    tags: ['Frequencies', 'Instruments', 'Ranges'],
    accent: '#8fa9ff',
  },
];
