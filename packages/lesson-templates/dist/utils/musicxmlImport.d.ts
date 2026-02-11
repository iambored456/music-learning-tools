/**
 * MusicXML -> Overdub Exercise Bridge
 *
 * Uses @mlt/musicxml-import to parse MusicXML into RelativeExercise, then
 * converts that into ExerciseSpec / OverdubExerciseTemplate used by the
 * existing overdub exercise system.
 */
import { type ImportOptions, type ImportWarning, type RelativeExercise } from '@mlt/musicxml-import';
import { type ExerciseSpec, type ExerciseSpecMetadata } from './importExerciseSpec.js';
import type { OverdubExerciseTemplate } from '../types.js';
export type MusicXmlSpecWarningCode = 'METER_DEFAULTED' | 'TEMPO_DEFAULTED' | 'DIVISIONS_PER_MEASURE_ROUNDED' | 'POSITION_ROUNDED' | 'DURATION_ROUNDED';
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
export declare function convertRelativeExerciseToSpec(exercise: RelativeExercise, options?: RelativeToSpecOptions): {
    spec: ExerciseSpec;
    warnings: MusicXmlSpecWarning[];
};
export declare function importMusicXmlToExerciseSpec(xml: string, options?: ImportMusicXmlToSpecOptions): ImportMusicXmlToSpecResult;
export declare function importMusicXmlToOverdubExercise(xml: string, metadata: ExerciseSpecMetadata, options?: ImportMusicXmlToSpecOptions): ImportMusicXmlToOverdubResult;
//# sourceMappingURL=musicxmlImport.d.ts.map