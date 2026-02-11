export type RelativeDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RelativeExercise = {
  id: string;
  title?: string;
  source?: { format: 'musicxml'; filename?: string };
  meter?: { beats: number; beatType: number };
  tempoBpm?: number;
  ppq: number;
  key: { fifths: number; mode: 'major' };
  streams: RelativeStream[];
};

export type RelativeStream = {
  streamId: string;
  partId: string;
  voiceId: string;
  name?: string;
  events: RelativeEvent[];
};

export type RelativeEvent =
  | {
      type: 'note';
      t: number;
      dur: number;
      deg: RelativeDegree;
      alt: number;
      oct: number;
      lyric?: string;
      slurStarts?: string[];
      slurStops?: string[];
    }
  | {
      type: 'rest';
      t: number;
      dur: number;
    };

export type ImportOptions = {
  ppq?: number;
  defaultTempoBpm?: number;
  assumeMajorIfModeMissing?: boolean;
  allowModeOtherThanMajor?: boolean;
  tupletSupport?: 'triplets-only' | 'none' | 'basic';
};

export type ImportWarningCode =
  | 'STAFF_IGNORED'
  | 'MODE_COERCED_TO_MAJOR'
  | 'METER_CHANGE_IGNORED'
  | 'TEMPO_CHANGE_IGNORED'
  | 'KEY_CHANGE_IGNORED'
  | 'SLUR_STOP_WITHOUT_START'
  | 'TIE_STOP_WITHOUT_START'
  | 'DURATION_ROUNDED_TO_TICK'
  | 'TUPLET_STOP_WITHOUT_START'
  | 'UNSUPPORTED_NOTATION_IGNORED';

export type ImportWarning = {
  code: ImportWarningCode;
  message: string;
  partId?: string;
  measure?: string;
  voiceId?: string;
};

export type ImportResult = {
  exercise: RelativeExercise;
  warnings: ImportWarning[];
};
