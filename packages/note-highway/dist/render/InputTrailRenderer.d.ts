/**
 * Input Trail Renderer
 *
 * Renders the pitch trail - a persistent "paintbrush" of
 * detected pitch over time that scrolls with the grid.
 */
import type { SessionTimeMs } from '@mlt/rhythm-core';
import type { InputTrailConfig, InputTrailPoint } from '../types.js';
import type { ICoordinateMapper } from '../coordinate/CoordinateMapper.js';
export interface IInputTrailRenderer {
    render(ctx: CanvasRenderingContext2D, trail: InputTrailPoint[], currentTimeMs: SessionTimeMs, coordinateMapper: ICoordinateMapper, config?: Partial<InputTrailConfig>): void;
}
/**
 * Create an input trail renderer.
 */
export declare function createInputTrailRenderer(): IInputTrailRenderer;
//# sourceMappingURL=InputTrailRenderer.d.ts.map