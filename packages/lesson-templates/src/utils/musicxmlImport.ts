/**
 * MusicXML -> Overdub Exercise Bridge
 *
 * Uses @mlt/musicxml-import to parse MusicXML into RelativeExercise, then
 * converts that into ExerciseSpec / OverdubExerciseTemplate used by the
 * existing overdub exercise system.
 */

import {
  importMusicXML,
  type ImportOptions,
  type ImportWarning,
  type RelativeExercise,
  type RelativeEvent,
} from '@mlt/musicxml-import';
import {
  convertSpecToExercise,
  type ExerciseSpec,
  type ExerciseSpecMetadata,
  type SpecEvent,
  type SpecPart,
} from './importExerciseSpec.js';
import type { OverdubExerciseTemplate } from '../types.js';

export type MusicXmlSpecWarningCode =
  | 'METER_DEFAULTED'
  | 'TEMPO_DEFAULTED'
  | 'DIVISIONS_PER_MEASURE_ROUNDED'
  | 'POSITION_ROUNDED'
  | 'DURATION_ROUNDED';

export type MusicXmlSpecWarning = {
  code: MusicXmlSpecWarningCode;
  message: string;
  streamId?: string;
  eventIndex?: number;
};

export type MusicXmlPipelineWarning = ImportWarning | MusicXmlSpecWarning;

export type RelativeToSpecOptions = {
  /** Grid resolution used by ExerciseSpec. Default: 4 (sixteenth-note units). */
  divisionsPerQuarter?: number;
  /** Include explicit rest events in spec. Default: true. */
  includeRests?: boolean;
  /** Fallback tempo if missing from imported score. Default: 90 BPM. */
  defaultTempoBpm?: number;
  /** Prefix part names with voice id when score has duplicate names. Default: true. */
  disambiguateVoiceNames?: boolean;
};

export type ImportMusicXmlToSpecOptions = {
  importOptions?: ImportOptions;
  specOptions?: RelativeToSpecOptions;
};

export type ImportMusicXmlToSpecResult = {
  relativeExercise: RelativeExercise;
  spec: ExerciseSpec;
  warnings: MusicXmlPipelineWarning[];
};

export type ImportMusicXmlToOverdubResult = {
  relativeExercise: RelativeExercise;
  spec: ExerciseSpec;
  template: OverdubExerciseTemplate;
  warnings: MusicXmlPipelineWarning[];
};

const DEGREE_BASE_PC: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
};

const FIFTHS_TO_KEY_NAME: Record<number, string> = {
  [-7]: 'Cb',
  [-6]: 'Gb',
  [-5]: 'Db',
  [-4]: 'Ab',
  [-3]: 'Eb',
  [-2]: 'Bb',
  [-1]: 'F',
  [0]: 'C',
  [1]: 'G',
  [2]: 'D',
  [3]: 'A',
  [4]: 'E',
  [5]: 'B',
  [6]: 'F#',
  [7]: 'C#',
};

const TONIC_REFERENCE_OCTAVE = 4;

export function convertRelativeExerciseToSpec(
  exercise: RelativeExercise,
  options: RelativeToSpecOptions = {}
): { spec: ExerciseSpec; warnings: MusicXmlSpecWarning[] } {
  const warnings: MusicXmlSpecWarning[] = [];

  const divisionsPerQuarter = options.divisionsPerQuarter ?? 4;
  if (!Number.isInteger(divisionsPerQuarter) || divisionsPerQuarter <= 0) {
    throw new Error('convertRelativeExerciseToSpec: divisionsPerQuarter must be a positive integer.');
  }

  const ticksPerDivision = exercise.ppq / divisionsPerQuarter;
  if (!Number.isFinite(ticksPerDivision) || ticksPerDivision <= 0) {
    throw new Error('convertRelativeExerciseToSpec: invalid ppq/divisionsPerQuarter ratio.');
  }

  const includeRests = options.includeRests ?? true;
  const defaultTempoBpm = options.defaultTempoBpm ?? 90;
  const disambiguateNames = options.disambiguateVoiceNames ?? true;

  const beats = exercise.meter?.beats ?? 4;
  const beatType = exercise.meter?.beatType ?? 4;
  if (!exercise.meter) {
    warnings.push({
      code: 'METER_DEFAULTED',
      message: 'Meter missing in RelativeExercise; defaulted to 4/4.',
    });
  }

  const divisionsPerMeasureRaw = (beats * 4 * divisionsPerQuarter) / beatType;
  const divisionsPerMeasure = Math.max(1, Math.round(divisionsPerMeasureRaw));
  if (Math.abs(divisionsPerMeasureRaw - divisionsPerMeasure) > 1e-9) {
    warnings.push({
      code: 'DIVISIONS_PER_MEASURE_ROUNDED',
      message: `Rounded divisionsPerMeasure from ${divisionsPerMeasureRaw} to ${divisionsPerMeasure}.`,
    });
  }

  const tempoBpm = exercise.tempoBpm ?? defaultTempoBpm;
  if (exercise.tempoBpm === undefined) {
    warnings.push({
      code: 'TEMPO_DEFAULTED',
      message: `Tempo missing in RelativeExercise; defaulted to ${defaultTempoBpm} BPM.`,
    });
  }

  const tonicPc = fifthsToTonicPc(exercise.key.fifths);
  const tonicMidi = 12 * (TONIC_REFERENCE_OCTAVE + 1) + tonicPc;
  const keyName = FIFTHS_TO_KEY_NAME[exercise.key.fifths] ?? `fifths(${exercise.key.fifths})`;

  const duplicateNameCount = new Map<string, number>();
  for (const stream of exercise.streams) {
    const baseName = (stream.name ?? stream.streamId).trim() || stream.streamId;
    duplicateNameCount.set(baseName, (duplicateNameCount.get(baseName) ?? 0) + 1);
  }

  let maxDivEnd = 0;
  const parts: SpecPart[] = exercise.streams.map((stream) => {
    const baseName = (stream.name ?? stream.streamId).trim() || stream.streamId;
    const useVoiceSuffix = disambiguateNames && (duplicateNameCount.get(baseName) ?? 0) > 1;
    const name = useVoiceSuffix ? `${baseName} (v${stream.voiceId})` : baseName;

    const events: SpecEvent[] = [];
    stream.events.forEach((event, eventIndex) => {
      const t = tickToDivision(event.t, ticksPerDivision, warnings, {
        kind: 'POSITION_ROUNDED',
        streamId: stream.streamId,
        eventIndex,
      });
      const d = Math.max(
        1,
        tickToDivision(event.dur, ticksPerDivision, warnings, {
          kind: 'DURATION_ROUNDED',
          streamId: stream.streamId,
          eventIndex,
        })
      );

      const divEnd = t + d;
      if (divEnd > maxDivEnd) {
        maxDivEnd = divEnd;
      }

      if (event.type === 'rest') {
        if (includeRests) {
          events.push({ t, d, rest: true, m: Math.floor(t / divisionsPerMeasure) + 1 });
        }
        return;
      }

      events.push({
        t,
        d,
        midi: relativeEventToMidi(event, tonicMidi),
        ly: event.lyric,
        m: Math.floor(t / divisionsPerMeasure) + 1,
      });
    });

    events.sort((a, b) => a.t - b.t || a.d - b.d);

    return {
      id: stream.streamId,
      name,
      events,
    };
  });

  const totalMeasures = Math.max(1, Math.ceil(maxDivEnd / divisionsPerMeasure));
  const spec: ExerciseSpec = {
    specVersion: '1.0.0',
    globals: {
      key: `${keyName} major`,
      tempoBpm,
      tonicMidi,
      divisionsPerQuarter,
      divisionsPerMeasure,
      totalMeasures,
      timeSignature: `${beats}/${beatType}`,
    },
    parts,
  };

  return { spec, warnings };
}

export function importMusicXmlToExerciseSpec(
  xml: string,
  options: ImportMusicXmlToSpecOptions = {}
): ImportMusicXmlToSpecResult {
  const imported = importMusicXML(xml, options.importOptions);
  const converted = convertRelativeExerciseToSpec(imported.exercise, options.specOptions);
  return {
    relativeExercise: imported.exercise,
    spec: converted.spec,
    warnings: [...imported.warnings, ...converted.warnings],
  };
}

export function importMusicXmlToOverdubExercise(
  xml: string,
  metadata: ExerciseSpecMetadata,
  options: ImportMusicXmlToSpecOptions = {}
): ImportMusicXmlToOverdubResult {
  const { relativeExercise, spec, warnings } = importMusicXmlToExerciseSpec(xml, options);
  const template = convertSpecToExercise(spec, metadata);
  return {
    relativeExercise,
    spec,
    template,
    warnings,
  };
}

function relativeEventToMidi(
  event: Extract<RelativeEvent, { type: 'note' }>,
  tonicMidi: number
): number {
  return tonicMidi + event.oct * 12 + DEGREE_BASE_PC[event.deg] + event.alt;
}

function tickToDivision(
  ticks: number,
  ticksPerDivision: number,
  warnings: MusicXmlSpecWarning[],
  context: { kind: 'POSITION_ROUNDED' | 'DURATION_ROUNDED'; streamId: string; eventIndex: number }
): number {
  const raw = ticks / ticksPerDivision;
  const rounded = Math.round(raw);
  if (Math.abs(raw - rounded) > 1e-9) {
    warnings.push({
      code: context.kind,
      streamId: context.streamId,
      eventIndex: context.eventIndex,
      message:
        context.kind === 'POSITION_ROUNDED'
          ? `Rounded non-integer grid position ${raw} to ${rounded}.`
          : `Rounded non-integer grid duration ${raw} to ${rounded}.`,
    });
  }
  return rounded;
}

function fifthsToTonicPc(fifths: number): number {
  return ((fifths * 7) % 12 + 12) % 12;
}
