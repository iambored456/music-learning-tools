/**
 * Grid Renderer
 *
 * Renders the background grid including:
 * - Vertical beat/measure lines
 * - Horizontal pitch row lines
 */
import type { SessionTimeMs, TimedBeat } from '@mlt/rhythm-core';
import type { GridRenderConfig, HighwayViewport } from '../types.js';
import type { ICoordinateMapper } from '../coordinate/CoordinateMapper.js';
export interface IGridRenderer {
    render(ctx: CanvasRenderingContext2D, beats: TimedBeat[], currentTimeMs: SessionTimeMs, coordinateMapper: ICoordinateMapper, viewport: HighwayViewport, config?: Partial<GridRenderConfig>): void;
}
/**
 * Create a grid renderer.
 */
export declare function createGridRenderer(): IGridRenderer;
//# sourceMappingURL=GridRenderer.d.ts.map