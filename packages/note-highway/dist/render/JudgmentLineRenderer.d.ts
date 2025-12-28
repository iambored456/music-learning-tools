/**
 * Judgment Line Renderer
 *
 * Renders the static vertical judgment line.
 * Optionally shows a glow effect indicating pitch accuracy.
 */
import type { JudgmentLineConfig, HighwayViewport } from '../types.js';
export interface IJudgmentLineRenderer {
    render(ctx: CanvasRenderingContext2D, x: number, viewport: HighwayViewport, isInTolerance: boolean, isVoiced: boolean, config?: Partial<JudgmentLineConfig>): void;
}
/**
 * Create a judgment line renderer.
 */
export declare function createJudgmentLineRenderer(): IJudgmentLineRenderer;
//# sourceMappingURL=JudgmentLineRenderer.d.ts.map