/**
 * Input Cursor Renderer
 *
 * Renders the current pitch input at the judgment line.
 * Shows:
 * - Current pitch position (circle)
 * - Deviation indicator (optional)
 * - Color based on accuracy state
 */
import type { InputCursorConfig, InputCursorState } from '../types.js';
import type { ICoordinateMapper } from '../coordinate/CoordinateMapper.js';
export interface IInputCursorRenderer {
    render(ctx: CanvasRenderingContext2D, state: InputCursorState, judgmentLineX: number, coordinateMapper: ICoordinateMapper, config?: Partial<InputCursorConfig>): void;
}
/**
 * Create an input cursor renderer.
 */
export declare function createInputCursorRenderer(): IInputCursorRenderer;
//# sourceMappingURL=InputCursorRenderer.d.ts.map