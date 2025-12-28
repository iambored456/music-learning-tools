/**
 * Coordinate Mapper
 *
 * Combines ViewportModel and ScrollModel to provide complete
 * coordinate mapping between time/pitch space and canvas space.
 */
import type { SessionTimeMs, TimedNote, TimedBeat, PitchSample } from '@mlt/rhythm-core';
import type { CanvasRect, CanvasPoint, RenderableNote, InputTrailPoint } from '../types.js';
import { type IViewportModel } from '../viewport/ViewportModel.js';
import { type IScrollModel } from '../viewport/ScrollModel.js';
export interface ICoordinateMapper {
    readonly viewport: IViewportModel;
    readonly scroll: IScrollModel;
    noteToRect(note: TimedNote, currentTimeMs: SessionTimeMs, noteHeight: number): CanvasRect | null;
    notesToRenderables(notes: TimedNote[], currentTimeMs: SessionTimeMs, noteHeight: number, activeNoteIds: Set<string>, passedNoteIds: Set<string>, judgments: Map<string, number>): RenderableNote[];
    beatToX(beat: TimedBeat, currentTimeMs: SessionTimeMs): number | null;
    pitchSampleToPoint(sample: PitchSample | InputTrailPoint, currentTimeMs: SessionTimeMs): CanvasPoint | null;
    getJudgmentLineX(): number;
    setViewportSize(width: number, height: number): void;
    setJudgmentLineFraction(fraction: number): void;
}
export interface CoordinateMapperConfig {
    viewportWidth: number;
    viewportHeight: number;
    minMidi: number;
    maxMidi: number;
    judgmentLineFraction: number;
    msVisibleAhead: number;
    msVisibleBehind: number;
}
/**
 * Create a coordinate mapper instance.
 */
export declare function createCoordinateMapper(config?: Partial<CoordinateMapperConfig>): ICoordinateMapper;
//# sourceMappingURL=CoordinateMapper.d.ts.map