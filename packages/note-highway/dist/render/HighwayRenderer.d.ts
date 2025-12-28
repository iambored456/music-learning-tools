/**
 * Highway Renderer
 *
 * Main orchestrator for the note highway visualization.
 * Coordinates all sub-renderers in the correct order.
 *
 * Render order:
 * 1. Background
 * 2. Grid lines
 * 3. Tonic indicators
 * 4. Target notes
 * 5. Input trail
 * 6. Input cursor
 * 7. Judgment line (on top)
 */
import type { HighwayConfig, HighwayRenderState } from '../types.js';
import { type ICoordinateMapper } from '../coordinate/CoordinateMapper.js';
import { type IGridRenderer } from './GridRenderer.js';
import { type INoteRenderer } from './NoteRenderer.js';
import { type IJudgmentLineRenderer } from './JudgmentLineRenderer.js';
import { type IInputCursorRenderer } from './InputCursorRenderer.js';
import { type IInputTrailRenderer } from './InputTrailRenderer.js';
export interface IHighwayRenderer {
    updateConfig(config: Partial<HighwayConfig>): void;
    getConfig(): HighwayConfig;
    render(ctx: CanvasRenderingContext2D, state: HighwayRenderState): void;
    readonly coordinateMapper: ICoordinateMapper;
    readonly gridRenderer: IGridRenderer;
    readonly noteRenderer: INoteRenderer;
    readonly judgmentLineRenderer: IJudgmentLineRenderer;
    readonly inputCursorRenderer: IInputCursorRenderer;
    readonly inputTrailRenderer: IInputTrailRenderer;
}
/**
 * Create a highway renderer instance.
 */
export declare function createHighwayRenderer(config?: Partial<HighwayConfig>): IHighwayRenderer;
//# sourceMappingURL=HighwayRenderer.d.ts.map