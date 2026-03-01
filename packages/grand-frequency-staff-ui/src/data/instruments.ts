export type InstrumentFamily = 'woodwind' | 'brass' | 'keyboard' | 'strings' | 'percussion';

export interface Instrument {
  id: string;
  name: string;
  /** Lowest MIDI note (concert pitch). 0 for unpitched percussion. */
  minMidi: number;
  /** Highest MIDI note (concert pitch). 0 for unpitched percussion. */
  maxMidi: number;
  color: string;
  family: InstrumentFamily;
  pitched: boolean;
}

export const FAMILIES: InstrumentFamily[] = ['woodwind', 'brass', 'keyboard', 'strings', 'percussion'];

export const FAMILY_COLORS: Record<InstrumentFamily, string> = {
  woodwind: '#2dc8b1',
  brass: '#ef8aab',
  keyboard: '#8fa9ff',
  strings: '#a4ba57',
  percussion: '#aaaaaa',
};

/** Instrument ranges from the Grand Frequency Staff spreadsheet (concert pitch). */
export const INSTRUMENTS: Instrument[] = [
  { id: 'piano',       name: 'Piano',       minMidi: 21,  maxMidi: 108, color: '#8fa9ff', family: 'keyboard',   pitched: true  },
  { id: 'bells',       name: 'Bells',       minMidi: 79,  maxMidi: 108, color: '#e0e0e0', family: 'percussion', pitched: true  },
  { id: 'piccolo',     name: 'Piccolo',     minMidi: 74,  maxMidi: 108, color: '#6ec482', family: 'woodwind',   pitched: true  },
  { id: 'flute',       name: 'Flute',       minMidi: 60,  maxMidi: 96,  color: '#2dc8b1', family: 'woodwind',   pitched: true  },
  { id: 'clarinet',    name: 'Clarinet',    minMidi: 50,  maxMidi: 94,  color: '#16c3da', family: 'woodwind',   pitched: true  },
  { id: 'alto-sax',    name: 'Alto Sax',    minMidi: 49,  maxMidi: 80,  color: '#cdaa42', family: 'woodwind',   pitched: true  },
  { id: 'tenor-sax',   name: 'Tenor Sax',   minMidi: 44,  maxMidi: 75,  color: '#e89955', family: 'woodwind',   pitched: true  },
  { id: 'bari-sax',    name: 'Bari Sax',    minMidi: 36,  maxMidi: 67,  color: '#f48e7d', family: 'woodwind',   pitched: true  },
  { id: 'trumpet',     name: 'Trumpet',     minMidi: 54,  maxMidi: 82,  color: '#ef8aab', family: 'brass',      pitched: true  },
  { id: 'mellophone',  name: 'Mellophone',  minMidi: 53,  maxMidi: 84,  color: '#db8fd4', family: 'brass',      pitched: true  },
  { id: 'french-horn', name: 'French Horn', minMidi: 34,  maxMidi: 77,  color: '#ba9bf2', family: 'brass',      pitched: true  },
  { id: 'trombone',    name: 'Trombone',    minMidi: 40,  maxMidi: 72,  color: '#a4ba57', family: 'brass',      pitched: true  },
  { id: 'baritone',    name: 'Baritone',    minMidi: 34,  maxMidi: 70,  color: '#58b8f6', family: 'brass',      pitched: true  },
  { id: 'tuba',        name: 'Tuba',        minMidi: 26,  maxMidi: 65,  color: '#4a5fa0', family: 'brass',      pitched: true  },
  { id: 'guitar',      name: 'Guitar',      minMidi: 40,  maxMidi: 83,  color: '#a4ba57', family: 'strings',    pitched: true  },
  { id: 'bass-guitar', name: 'Bass Guitar', minMidi: 28,  maxMidi: 67,  color: '#2d7a4a', family: 'strings',    pitched: true  },
  { id: 'snares',      name: 'Snares',      minMidi: 0,   maxMidi: 0,   color: '#888888', family: 'percussion', pitched: false },
  { id: 'tenors',      name: 'Tenors',      minMidi: 0,   maxMidi: 0,   color: '#aaaaaa', family: 'percussion', pitched: false },
  { id: 'basses',      name: 'Bass Drums',  minMidi: 0,   maxMidi: 0,   color: '#cccccc', family: 'percussion', pitched: false },
  { id: 'cymbals',     name: 'Cymbals',     minMidi: 0,   maxMidi: 0,   color: '#dddddd', family: 'percussion', pitched: false },
];
