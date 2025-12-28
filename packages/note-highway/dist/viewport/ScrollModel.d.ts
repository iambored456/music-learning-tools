/**
 * Scroll Model
 *
 * Handles the mapping between time and X coordinates.
 * The highway scrolls from right to left, with the judgment line
 * at a fixed position.
 */
import type { SessionTimeMs } from '@mlt/rhythm-core';
import type { ScrollConfig } from '../types.js';
export interface IScrollModel {
    updateConfig(config: Partial<ScrollConfig>): void;
    getConfig(): ScrollConfig;
    setFromMeasures(measuresAhead: number, measureDurationMs: number, viewportWidth: number, judgmentLineFraction: number): void;
    timeToX(timeMs: SessionTimeMs, currentTimeMs: SessionTimeMs): number;
    xToTime(x: number, currentTimeMs: SessionTimeMs): SessionTimeMs;
    isTimeVisible(timeMs: SessionTimeMs, currentTimeMs: SessionTimeMs): boolean;
    getVisibleTimeRange(currentTimeMs: SessionTimeMs): {
        startMs: SessionTimeMs;
        endMs: SessionTimeMs;
    };
    getJudgmentLineX(viewportWidth: number, judgmentLineFraction: number): number;
}
/**
 * Create a scroll model instance.
 */
export declare function createScrollModel(config?: Partial<ScrollConfig>, viewportWidth?: number): IScrollModel;
//# sourceMappingURL=ScrollModel.d.ts.map