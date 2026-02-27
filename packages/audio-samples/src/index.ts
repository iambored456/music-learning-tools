/**
 * Shared audio sample registry for Music Learning Tools.
 * Keep this package data-only so apps can use any audio engine.
 */

export const DRUM_TRACK_IDS = ['H', 'M', 'L'] as const;
export type DrumTrackId = typeof DRUM_TRACK_IDS[number];

export type DrumTrackMetadata = {
  shortLabel: string;
  label: string;
  description: string;
};

export type DrumMachineMetadata = {
  id: string;
  label: string;
  manufacturer: string;
  folder: string;
  sampleCount: number;
};

export type DrumSampleSetMetadata = {
  machineId: string;
  source: 'remote' | 'local';
  trackLabels: Record<DrumTrackId, string>;
};

export type DrumSampleSet = {
  label: string;
  tracks: Record<DrumTrackId, string>;
  metadata?: DrumSampleSetMetadata;
};

export const DRUM_TRACK_METADATA: Record<DrumTrackId, DrumTrackMetadata> = {
  H: {
    shortLabel: 'H',
    label: 'High',
    description: 'Hi-hat and bright high percussion'
  },
  M: {
    shortLabel: 'M',
    label: 'Mid',
    description: 'Snare and mid-range percussion'
  },
  L: {
    shortLabel: 'L',
    label: 'Low',
    description: 'Kick and low-frequency percussion'
  }
};

export const LOCAL_DRUM_SAMPLE_BANK_ROOT =
  'packages/audio-samples/assets/drum-sample-bank';

export const DRUM_MACHINE_METADATA = {
  '110-series': {
    id: '110-series',
    label: '110 Series',
    manufacturer: 'Unknown',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/110-series`,
    sampleCount: 4
  },
  'acetone-rhythm-ace': {
    id: 'acetone-rhythm-ace',
    label: 'Rhythm Ace',
    manufacturer: 'Acetone',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/acetone-rhythm-ace`,
    sampleCount: 4
  },
  'acetone-rhythm-master': {
    id: 'acetone-rhythm-master',
    label: 'Rhythm Master',
    manufacturer: 'Acetone',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/acetone-rhythm-master`,
    sampleCount: 1
  },
  'alesis-hr16a': {
    id: 'alesis-hr16a',
    label: 'HR-16A',
    manufacturer: 'Alesis',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/alesis-hr16a`,
    sampleCount: 12
  },
  'boss-dr-220': {
    id: 'boss-dr-220',
    label: 'DR-220',
    manufacturer: 'Boss',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/boss-dr-220`,
    sampleCount: 3
  },
  'cr-78': {
    id: 'cr-78',
    label: 'CR-78',
    manufacturer: 'Roland',
    folder: 'https://tonejs.github.io/audio/drum-samples/CR78',
    sampleCount: 3
  },
  'cr-80': {
    id: 'cr-80',
    label: 'CR-80',
    manufacturer: 'Unknown',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/cr-80`,
    sampleCount: 7
  },
  'generic-percussion': {
    id: 'generic-percussion',
    label: 'Generic Percussion',
    manufacturer: 'Mixed',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/generic-percussion`,
    sampleCount: 7
  },
  'ha-64': {
    id: 'ha-64',
    label: 'HA-64',
    manufacturer: 'Unknown',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/ha-64`,
    sampleCount: 8
  },
  'korg-minipops': {
    id: 'korg-minipops',
    label: 'Mini Pops',
    manufacturer: 'Korg',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/korg-minipops`,
    sampleCount: 4
  },
  'kpr-series': {
    id: 'kpr-series',
    label: 'KPR Series',
    manufacturer: 'Korg',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/kpr-series`,
    sampleCount: 4
  },
  'kr-33': {
    id: 'kr-33',
    label: 'KR-33',
    manufacturer: 'Korg',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/kr-33`,
    sampleCount: 10
  },
  'kr-55': {
    id: 'kr-55',
    label: 'KR-55',
    manufacturer: 'Korg',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/kr-55`,
    sampleCount: 6
  },
  'linn-lm-1-linndrum': {
    id: 'linn-lm-1-linndrum',
    label: 'LinnDrum / LM-1',
    manufacturer: 'Linn Electronics',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/linn-lm-1-linndrum`,
    sampleCount: 10
  },
  'roland-tr-33': {
    id: 'roland-tr-33',
    label: 'TR-33',
    manufacturer: 'Roland',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/roland-tr-33`,
    sampleCount: 2
  },
  'roland-tr-55': {
    id: 'roland-tr-55',
    label: 'TR-55',
    manufacturer: 'Roland',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/roland-tr-55`,
    sampleCount: 4
  },
  'roland-tr-909': {
    id: 'roland-tr-909',
    label: 'TR-909',
    manufacturer: 'Roland',
    folder: `${LOCAL_DRUM_SAMPLE_BANK_ROOT}/roland-tr-909`,
    sampleCount: 16
  }
} as const satisfies Record<string, DrumMachineMetadata>;

export type DrumMachineId = keyof typeof DRUM_MACHINE_METADATA;

export const LOCAL_DRUM_SAMPLE_BANK_METADATA = {
  rootFolder: LOCAL_DRUM_SAMPLE_BANK_ROOT,
  format: 'wav',
  totalSamples: 102,
  machineCount: 16
} as const;

export const DRUM_SAMPLE_SETS = {
  cr78: {
    label: 'CR-78',
    tracks: {
      H: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
      M: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
      L: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3'
    },
    metadata: {
      machineId: 'cr-78',
      source: 'remote',
      trackLabels: {
        H: 'Hi-Hat',
        M: 'Snare',
        L: 'Kick'
      }
    }
  }
} as const satisfies Record<string, DrumSampleSet>;

export type DrumSampleSetName = keyof typeof DRUM_SAMPLE_SETS;

export const DEFAULT_DRUM_SAMPLE_SET: DrumSampleSetName = 'cr78';

export function getDrumSampleSet(
  name: DrumSampleSetName = DEFAULT_DRUM_SAMPLE_SET
): Record<DrumTrackId, string> {
  return DRUM_SAMPLE_SETS[name].tracks;
}

export function getDrumSampleSetMetadata(
  name: DrumSampleSetName = DEFAULT_DRUM_SAMPLE_SET
): DrumSampleSetMetadata | undefined {
  return DRUM_SAMPLE_SETS[name].metadata;
}

export function getDrumMachineMetadata(
  machineId: DrumMachineId
): DrumMachineMetadata {
  return DRUM_MACHINE_METADATA[machineId];
}

export function listDrumMachines(): DrumMachineMetadata[] {
  return Object.values(DRUM_MACHINE_METADATA);
}

export type {
  DrumVoiceCategory,
  DrumVoiceMetadata,
  LocalDrumLayer,
  LocalDrumSampleEntry
} from './localDrumSamples.js';
