/**
 * Import Exercise Spec Converter
 *
 * Converts JSON exercise spec format (with globals, parts, events)
 * into OverdubExerciseTemplate for the overdub exercise system.
 */
import type { OverdubExerciseTemplate, DifficultyLevel, LessonSettingsSchema } from '../types.js';
export interface SpecGlobals {
    tempoBpm: number;
    tonicMidi: number;
    divisionsPerQuarter: number;
    divisionsPerMeasure: number;
    totalMeasures?: number;
    timeSignature?: string;
    key?: string;
    [extra: string]: unknown;
}
export interface SpecEvent {
    t: number;
    d: number;
    midi?: number;
    rest?: boolean;
    ly?: string;
    m?: number;
    [extra: string]: unknown;
}
export interface SpecPart {
    name: string;
    id?: string;
    events: SpecEvent[];
    [extra: string]: unknown;
}
export interface ExerciseSpec {
    globals: SpecGlobals;
    parts: SpecPart[];
    specVersion?: string;
    [extra: string]: unknown;
}
/** Author-supplied metadata not present in the spec */
export interface ExerciseSpecMetadata {
    id: string;
    name: string;
    description: string;
    difficulty: DifficultyLevel;
    durationEstimate: string;
    voiceColors?: string[];
    settingsSchema?: LessonSettingsSchema;
}
/**
 * Convert a JSON exercise spec into an OverdubExerciseTemplate.
 *
 * Maps the spec's absolute tick positions directly to microbeatCol positions.
 * Models sixteenth-note resolution (divisionsPerQuarter=4) as:
 *   microbeatsPerMacrobeat=2 (each macrobeat = one eighth note, subdivided into 2 sixteenths)
 *
 * If `totalMeasures` is not in the spec globals, it is calculated from the
 * maximum (t + d) across all events, rounded up to full measures.
 */
export declare function convertSpecToExercise(spec: ExerciseSpec, metadata: ExerciseSpecMetadata): OverdubExerciseTemplate;
//# sourceMappingURL=importExerciseSpec.d.ts.map