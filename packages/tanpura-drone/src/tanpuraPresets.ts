import { parsePureTonesPrt, type PureTonesPrtState } from './puretonesPrt';

export const PURETONES_NOTE_LABELS = [
  'SA',
  'Ni',
  'ni',
  'Dha',
  'dha',
  'Pa',
  'Ma',
  'ma',
  'Ga',
  'ga',
  'Re',
  're',
  'Sa',
] as const;

export type PureTonesNoteLabel = (typeof PURETONES_NOTE_LABELS)[number];

export interface TanpuraStringPreset {
  stringName: '1st_String' | '2nd_String' | '3rd_String' | '4th_String' | '5th_String' | '6th_String';
  noteIndex: number;
  noteLabel: PureTonesNoteLabel;
  loopEnabled: boolean;
  fineTuneCents: number;
  ultraFineTuneCents: number;
  variance: number;
  gainDb: number;
  octaveGains: readonly [number, number, number, number, number, number];
}

export interface TanpuraPreset {
  name: string;
  commonFrequency: number;
  octaveSelector: number;
  fineTuneCents: number;
  periodSeconds: number;
  strings: readonly TanpuraStringPreset[];
}

const STRING_PATHS = [
  '1st_String',
  '2nd_String',
  '3rd_String',
  '4th_String',
  '5th_String',
  '6th_String',
] as const;

const OCTAVE_KEYS = ['Octave_1', 'Octave_2', 'Octave_3', 'Octave_4', 'Octave_5', 'Octave_6'] as const;

function readStateNumber(state: PureTonesPrtState, path: string, fallback = 0): number {
  return state[path] ?? fallback;
}

function toNoteLabel(noteIndex: number): PureTonesNoteLabel {
  return PURETONES_NOTE_LABELS[noteIndex] ?? 'Sa';
}

export function createTanpuraPresetFromState(state: PureTonesPrtState, name = 'Custom'): TanpuraPreset {
  const basePath = '/FaustDSP/PureTones_v1.0/0x00';

  const strings = STRING_PATHS.map((stringName): TanpuraStringPreset => {
    const stringBase = `${basePath}/${stringName}`;
    const noteIndex = readStateNumber(state, `${stringBase}/Select_Note`);

    return {
      stringName,
      noteIndex,
      noteLabel: toNoteLabel(noteIndex),
      loopEnabled: readStateNumber(state, `${stringBase}/Play_String/Loop`, 1) >= 1,
      fineTuneCents: readStateNumber(state, `${stringBase}/Fine_Tune`),
      ultraFineTuneCents: readStateNumber(state, `${stringBase}/Ultrafine_Tune`),
      variance: readStateNumber(state, `${stringBase}/Variance`, 5),
      gainDb: readStateNumber(state, `${stringBase}/Gain`),
      octaveGains: OCTAVE_KEYS.map((key) => readStateNumber(state, `${stringBase}/${key}`)) as [
        number,
        number,
        number,
        number,
        number,
        number,
      ],
    };
  });

  return {
    name,
    commonFrequency: readStateNumber(state, `${basePath}/Common_Frequency`, 3),
    octaveSelector: readStateNumber(state, `${basePath}/Octave_Selector`, 0),
    fineTuneCents: readStateNumber(state, `${basePath}/Fine_Tune`, 0),
    periodSeconds: readStateNumber(state, `${basePath}/Period`, 7),
    strings,
  };
}

export const PURETONES_DEFAULT_DRONE_PRT = `0 /puretones/Zita_Light/Dry/Wet_Mix
0 /puretones/Zita_Light/Level
3 /puretones/PureTones_v1.0/0x00/Common_Frequency
0 /puretones/PureTones_v1.0/0x00/Octave_Selector
0 /puretones/PureTones_v1.0/0x00/Fine_Tune
7 /puretones/PureTones_v1.0/0x00/Period
5 /puretones/PureTones_v1.0/0x00/1st_String/Select_Note
0 /puretones/PureTones_v1.0/0x00/1st_String/Play_String/Once
1 /puretones/PureTones_v1.0/0x00/1st_String/Play_String/Loop
0 /puretones/PureTones_v1.0/0x00/1st_String/Fine_Tune
0 /puretones/PureTones_v1.0/0x00/1st_String/Ultrafine_Tune
5 /puretones/PureTones_v1.0/0x00/1st_String/Variance
0 /puretones/PureTones_v1.0/0x00/1st_String/Gain
5.6 /puretones/PureTones_v1.0/0x00/1st_String/Octave_1
7.8 /puretones/PureTones_v1.0/0x00/1st_String/Octave_2
5.6 /puretones/PureTones_v1.0/0x00/1st_String/Octave_3
1.0 /puretones/PureTones_v1.0/0x00/1st_String/Octave_4
0.4 /puretones/PureTones_v1.0/0x00/1st_String/Octave_5
0.2 /puretones/PureTones_v1.0/0x00/1st_String/Octave_6
0 /puretones/PureTones_v1.0/0x00/2nd_String/Select_Note
0 /puretones/PureTones_v1.0/0x00/2nd_String/Play_String/Once
1 /puretones/PureTones_v1.0/0x00/2nd_String/Play_String/Loop
0 /puretones/PureTones_v1.0/0x00/2nd_String/Fine_Tune
0 /puretones/PureTones_v1.0/0x00/2nd_String/Ultrafine_Tune
5 /puretones/PureTones_v1.0/0x00/2nd_String/Variance
0 /puretones/PureTones_v1.0/0x00/2nd_String/Gain
5.6 /puretones/PureTones_v1.0/0x00/2nd_String/Octave_1
7.8 /puretones/PureTones_v1.0/0x00/2nd_String/Octave_2
5.6 /puretones/PureTones_v1.0/0x00/2nd_String/Octave_3
1.0 /puretones/PureTones_v1.0/0x00/2nd_String/Octave_4
0.4 /puretones/PureTones_v1.0/0x00/2nd_String/Octave_5
0.2 /puretones/PureTones_v1.0/0x00/2nd_String/Octave_6
12 /puretones/PureTones_v1.0/0x00/3rd_String/Select_Note
0 /puretones/PureTones_v1.0/0x00/3rd_String/Play_String/Once
1 /puretones/PureTones_v1.0/0x00/3rd_String/Play_String/Loop
0 /puretones/PureTones_v1.0/0x00/3rd_String/Fine_Tune
0 /puretones/PureTones_v1.0/0x00/3rd_String/Ultrafine_Tune
5 /puretones/PureTones_v1.0/0x00/3rd_String/Variance
0 /puretones/PureTones_v1.0/0x00/3rd_String/Gain
5.6 /puretones/PureTones_v1.0/0x00/3rd_String/Octave_1
7.8 /puretones/PureTones_v1.0/0x00/3rd_String/Octave_2
5.6 /puretones/PureTones_v1.0/0x00/3rd_String/Octave_3
1.0 /puretones/PureTones_v1.0/0x00/3rd_String/Octave_4
0.4 /puretones/PureTones_v1.0/0x00/3rd_String/Octave_5
0.2 /puretones/PureTones_v1.0/0x00/3rd_String/Octave_6
5 /puretones/PureTones_v1.0/0x00/4th_String/Select_Note
0 /puretones/PureTones_v1.0/0x00/4th_String/Play_String/Once
1 /puretones/PureTones_v1.0/0x00/4th_String/Play_String/Loop
0 /puretones/PureTones_v1.0/0x00/4th_String/Fine_Tune
0 /puretones/PureTones_v1.0/0x00/4th_String/Ultrafine_Tune
5 /puretones/PureTones_v1.0/0x00/4th_String/Variance
0 /puretones/PureTones_v1.0/0x00/4th_String/Gain
5.6 /puretones/PureTones_v1.0/0x00/4th_String/Octave_1
7.8 /puretones/PureTones_v1.0/0x00/4th_String/Octave_2
5.6 /puretones/PureTones_v1.0/0x00/4th_String/Octave_3
1.0 /puretones/PureTones_v1.0/0x00/4th_String/Octave_4
0.4 /puretones/PureTones_v1.0/0x00/4th_String/Octave_5
0.2 /puretones/PureTones_v1.0/0x00/4th_String/Octave_6
0 /puretones/PureTones_v1.0/0x00/5th_String/Select_Note
0 /puretones/PureTones_v1.0/0x00/5th_String/Play_String/Once
1 /puretones/PureTones_v1.0/0x00/5th_String/Play_String/Loop
0 /puretones/PureTones_v1.0/0x00/5th_String/Fine_Tune
0 /puretones/PureTones_v1.0/0x00/5th_String/Ultrafine_Tune
5 /puretones/PureTones_v1.0/0x00/5th_String/Variance
0 /puretones/PureTones_v1.0/0x00/5th_String/Gain
5.6 /puretones/PureTones_v1.0/0x00/5th_String/Octave_1
7.8 /puretones/PureTones_v1.0/0x00/5th_String/Octave_2
5.6 /puretones/PureTones_v1.0/0x00/5th_String/Octave_3
1.0 /puretones/PureTones_v1.0/0x00/5th_String/Octave_4
0.4 /puretones/PureTones_v1.0/0x00/5th_String/Octave_5
0.2 /puretones/PureTones_v1.0/0x00/5th_String/Octave_6
12 /puretones/PureTones_v1.0/0x00/6th_String/Select_Note
0 /puretones/PureTones_v1.0/0x00/6th_String/Play_String/Once
1 /puretones/PureTones_v1.0/0x00/6th_String/Play_String/Loop
0 /puretones/PureTones_v1.0/0x00/6th_String/Fine_Tune
0 /puretones/PureTones_v1.0/0x00/6th_String/Ultrafine_Tune
5 /puretones/PureTones_v1.0/0x00/6th_String/Variance
0 /puretones/PureTones_v1.0/0x00/6th_String/Gain
5.6 /puretones/PureTones_v1.0/0x00/6th_String/Octave_1
7.8 /puretones/PureTones_v1.0/0x00/6th_String/Octave_2
5.6 /puretones/PureTones_v1.0/0x00/6th_String/Octave_3
1.0 /puretones/PureTones_v1.0/0x00/6th_String/Octave_4
0.4 /puretones/PureTones_v1.0/0x00/6th_String/Octave_5
0.2 /puretones/PureTones_v1.0/0x00/6th_String/Octave_6`;

export const PURETONES_DEFAULT_DRONE_STATE = parsePureTonesPrt(PURETONES_DEFAULT_DRONE_PRT, 'drone');

export const PURETONES_DEFAULT_TANPURA_PRESET = createTanpuraPresetFromState(
  PURETONES_DEFAULT_DRONE_STATE,
  'PureTones Standard'
);

export interface TanpuraPlaybackRateConfig {
  baseMidi: number;
  minRate: number;
  maxRate: number;
}

export const DEFAULT_TANPURA_PLAYBACK_RATE_CONFIG: TanpuraPlaybackRateConfig = {
  // Default sample is treated as C3 for transposition.
  baseMidi: 48,
  minRate: 0.5,
  maxRate: 2.0,
};

export function getTanpuraPlaybackRate(
  targetMidi: number,
  config: TanpuraPlaybackRateConfig = DEFAULT_TANPURA_PLAYBACK_RATE_CONFIG
): number {
  if (!Number.isFinite(targetMidi)) {
    return 1;
  }
  const semitoneOffset = targetMidi - config.baseMidi;
  const rawRate = 2 ** (semitoneOffset / 12);
  return Math.max(config.minRate, Math.min(config.maxRate, rawRate));
}
